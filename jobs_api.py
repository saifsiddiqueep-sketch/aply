"""Job ingestion back end for the sandbox and dev instances (not used by prod).

How real job apps get postings, and what this does:
  * Employers publish openings in an applicant tracking system (ATS). Greenhouse, Lever and Ashby expose public,
    read-only job-board APIs so third parties can list those openings. Aggregators keep a list of company board
    names, poll those endpoints, normalize the fields, de-duplicate, and link applicants back to the employer.
  * Indeed and ZipRecruiter do not offer an open API for reading their listings (partner programs only, and Indeed's
    terms forbid keeping copies), so they are NOT used here.
  * Remotive publishes a free remote-jobs feed on the condition that listings link back to Remotive and name it as
    the source, and that it is polled at most ~4 times a day. Both are respected below.

get_jobs() returns {"fetched_at", "sources", "jobs"} where each job already matches the shape the app expects.
"""
import datetime
import hashlib
import html
import json
import re
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = "AplyDev/0.1 (local prototype)"
DEFAULT_TTL = 30 * 60
TTL = {"remotive": 6 * 3600,          # Remotive allows roughly 4 requests a day
       "jobicy": 3600}                # Jobicy asks for at most one sync pass an hour
PER_SOURCE = 14

# (kind, board token, display name). Boards are the employer's own public careers feed.
SOURCES = [
    ("greenhouse", "discord", "Discord"),
    ("greenhouse", "dropbox", "Dropbox"),
    ("greenhouse", "duolingo", "Duolingo"),
    ("greenhouse", "squarespace", "Squarespace"),
    ("greenhouse", "webflow", "Webflow"),
    ("lever", "spotify", "Spotify"),
    ("ashby", "linear", "Linear"),
    ("remotive", "software-dev", "Remotive"),
    ("jobicy", "engineering", "Jobicy"),      # credit Jobicy and link to its canonical job URL
    ("jobicy", "marketing", "Jobicy"),
    ("jobicy", "data-science", "Jobicy"),
    ("muse", "Internship", "The Muse"),       # The Muse public jobs API; links go to the posting on The Muse
    ("muse", "Entry Level", "The Muse"),
]
MULTI = ("jobicy", "muse")                    # several feeds share one display name

SKILLS = [
    ("JavaScript", r"javascript|\bjs\b"), ("TypeScript", r"typescript"), ("React", r"\breact(?:\.js|js)?\b"),
    ("Node", r"\bnode(?:\.js|js)?\b"), ("Python", r"\bpython\b"), ("Java", r"\bjava\b"), ("SQL", r"\bsql\b"),
    ("PostgreSQL", r"postgres(?:ql)?"), ("AWS", r"\baws\b|amazon web services"), ("Docker", r"\bdocker\b"),
    ("Kubernetes", r"kubernetes|\bk8s\b"), ("Terraform", r"terraform"), ("Figma", r"\bfigma\b"),
    ("Excel", r"\bexcel\b"), ("Tableau", r"\btableau\b"), ("Django", r"\bdjango\b"), ("CSS", r"\bcss\b"),
    ("HTML", r"\bhtml\b"), ("Testing", r"\btesting\b|unit tests?|test automation"), ("SEO", r"\bseo\b"),
    ("Copywriting", r"copywrit"), ("Analytics", r"\banalytics\b"), ("Hiring", r"recruit(?:ing|er|ment)\b"),
    ("User research", r"user research"), ("Prototyping", r"prototyp"), ("Design systems", r"design systems?"),
    ("Roadmapping", r"roadmap"), ("Budgeting", r"\bbudget"), ("PyTorch", r"pytorch"),
]
SKILL_RES = [(n, re.compile(p, re.I)) for n, p in SKILLS]

STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split()
US_RE = re.compile(r"United States|\bUSA\b|\bU\.S\.|\bUS\b|, (?:%s)\b|\b(?:San Francisco|New York|Seattle|Austin|Boston|Chicago|Denver|Los Angeles|Atlanta|Portland)\b" % "|".join(STATES))
FOREIGN_RE = re.compile(r"Germany|United Kingdom|\bUK\b|India|Canada|Ireland|France|Spain|Brazil|Mexico|Poland|Netherlands|Japan|Australia|Singapore|EMEA|APAC|Europe|LATAM|Berlin|London|Dublin|Toronto|Sydney|Amsterdam|Lisbon|Paris", re.I)
SAL_RE = re.compile(r"\$\s?(\d{2,3}(?:,\d{3})+|\d{2,3}\s?[kK])\s*(?:-|–|—|to)\s*\$?\s*(\d{2,3}(?:,\d{3})+|\d{2,3}\s?[kK])")
YRS_RE = re.compile(r"(\d{1,2})\+?\s*(?:or more\s*)?(?:years|yrs)", re.I)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
RECRUITING_RE = re.compile(r"career|jobs|recruit|talent|hiring|apply|people@|hr@", re.I)
NOT_CONTACT_RE = re.compile(r"scam|fraud|phish|abuse|security|privacy|legal|compliance|no-?reply|donotreply|\.(png|jpg|gif)$", re.I)

_cache = {}
_lock = threading.Lock()


def _contact(text):
    """A recruiting address printed in the posting, if there is one. Only recruiting-looking mailboxes qualify."""
    for m in EMAIL_RE.findall(text or ""):
        if RECRUITING_RE.search(m.split("@")[0]) and not NOT_CONTACT_RE.search(m):
            return m
    return ""


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def _text(s):
    s = html.unescape(s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()[:20000]


def _ts(v):
    """Posting date as epoch milliseconds (0 if the feed gives none or an unreadable one)."""
    try:
        if isinstance(v, (int, float)):
            return int(v if v > 1e11 else v * 1000)
        if isinstance(v, str) and v.strip():
            d = datetime.datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
            if d.tzinfo is None:
                d = d.replace(tzinfo=datetime.timezone.utc)
            return int(d.timestamp() * 1000)
    except Exception:
        pass
    return 0


# Benefits a posting mentions in its own text. A mention is not a guarantee, and silence is not "none": many
# postings simply do not list benefits, so the app treats these as "mentions", never as proof of absence.
PERK_RES = [
    ("health", re.compile(r"health(?:care)? (?:insurance|coverage|benefits|plans?)|medical (?:insurance|coverage|benefits|plans?)|medical,? dental", re.I)),
    ("dental", re.compile(r"\bdental\b", re.I)),
    ("vision", re.compile(r"\bvision (?:insurance|coverage|benefits|care|plans?)\b|dental,? (?:and |& )?vision|medical,? dental,? (?:and |&)?vision", re.I)),
    ("k401", re.compile(r"401\s?\(?k\)?", re.I)),
    ("match", re.compile(r"401\s?\(?k\)?[^.]{0,80}match|(?:employer|company) match|matching contributions?", re.I)),
    ("loan", re.compile(r"student loan", re.I)),
    ("stock", re.compile(r"stock options?|equity (?:grants?|compensation|package)|\bRSUs?\b|\bESPP\b|stock purchase", re.I)),
    ("pto", re.compile(r"\bPTO\b|paid time off|paid vacation|unlimited (?:vacation|time off)|vacation days", re.I)),
    ("maternity", re.compile(r"paid (?:maternity|parental)|maternity leave|parental leave", re.I)),
    ("paternity", re.compile(r"paid (?:paternity|parental)|paternity leave|parental leave", re.I)),
    ("tuition", re.compile(r"tuition (?:assistance|reimbursement|support)|education(?:al)? (?:assistance|reimbursement)", re.I)),
]


# Postings that say pay is commission only. A heuristic on the posting's own words, not a verified fact.
COMM_RE = re.compile(r"commission[- ]only|100% commission|straight commission|commission[- ]based (?:pay|compensation|position|role|only)|no base (?:salary|pay)|1099 commission", re.I)


def _perks(text):
    return [k for k, rx in PERK_RES if rx.search(text or "")]


def _money(tok):
    tok = tok.replace(",", "").replace(" ", "")
    return int(tok[:-1]) * 1000 if tok[-1] in "kK" else int(tok)


def _salary(*texts):
    for t in texts:
        m = SAL_RE.search(t or "")
        if m:
            lo, hi = _money(m.group(1)), _money(m.group(2))
            if 20000 <= lo < hi <= 600000:
                return [lo, hi]
    return [0, 0]


def _fetch_raw(kind, token, name):
    """Return a list of raw postings: dicts with id, title, company, loc, remote, text, url, salary_text."""
    out = []
    if kind == "greenhouse":
        for j in _get("https://boards-api.greenhouse.io/v1/boards/%s/jobs?content=true" % token).get("jobs", []):
            out.append(dict(id=j["id"], title=j["title"], company=j.get("company_name") or name,
                            loc=(j.get("location") or {}).get("name", ""), remote=None,
                            text=_text(j.get("content")), url=j["absolute_url"], salary_text="",
                            posted=_ts(j.get("first_published") or j.get("updated_at"))))
    elif kind == "lever":
        for j in _get("https://api.lever.co/v0/postings/%s?mode=json" % token):
            cat = j.get("categories") or {}
            out.append(dict(id=j["id"], title=j["text"], company=name, loc=cat.get("location", "") or "",
                            remote=(j.get("workplaceType") == "remote") or None,
                            text=_text((j.get("descriptionPlain") or "") + " " + (j.get("additionalPlain") or "")),
                            url=j["hostedUrl"], salary_text="", posted=_ts(j.get("createdAt"))))
    elif kind == "ashby":
        for j in _get("https://api.ashbyhq.com/posting-api/job-board/%s" % token).get("jobs", []):
            if j.get("isListed") is False:
                continue
            out.append(dict(id=j["id"], title=j["title"], company=name, loc=j.get("location", "") or "",
                            remote=bool(j.get("isRemote")) or j.get("workplaceType") == "Remote" or None,
                            text=_text(j.get("descriptionPlain") or j.get("descriptionHtml")),
                            url=j["jobUrl"], salary_text="", posted=_ts(j.get("publishedAt"))))
    elif kind == "remotive":
        for j in _get("https://remotive.com/api/remote-jobs?category=%s&limit=60" % token).get("jobs", []):
            loc = j.get("candidate_required_location") or ""
            if not re.search(r"usa|united states|worldwide|americas|north america|anywhere", loc, re.I):
                continue
            out.append(dict(id=j["id"], title=j["title"], company=j["company_name"], loc="Remote (%s)" % loc, remote=True,
                            text=_text(j.get("description")) + " " + " ".join(j.get("tags") or []),
                            url=j["url"], salary_text=j.get("salary") or "", posted=_ts(j.get("publication_date"))))
    elif kind == "jobicy":
        data = _get("https://jobicy.com/api/v2/remote-jobs?count=30&geo=usa&industry=%s" % token)
        for j in data.get("jobs", []):
            sal = None
            lo, hi = j.get("salaryMin"), j.get("salaryMax")
            if j.get("salaryPeriod") == "yearly" and j.get("salaryCurrency") == "USD" and isinstance(lo, (int, float)) \
                    and isinstance(hi, (int, float)) and 20000 <= lo < hi <= 600000:
                sal = [int(lo), int(hi)]
            out.append(dict(id=j["id"], title=j["jobTitle"], company=j["companyName"],
                            loc="Remote (%s)" % re.sub(r"\s+", " ", j.get("jobGeo") or "USA").strip(), remote=True,
                            text=_text(j.get("jobDescription")), url=j["url"], salary_text="", sal=sal,
                            posted=_ts(j.get("pubDate")),
                            fallback=(j.get("jobIndustry") or [None])[0]))
    elif kind == "muse":
        for page in (1, 2):
            data = _get("https://www.themuse.com/api/public/jobs?page=%d&level=%s" % (page, urllib.parse.quote(token)))
            for j in data.get("results", []):
                locs = [l.get("name", "") for l in j.get("locations", [])]
                loc = ", ".join(locs[:2]) + (" +%d more" % (len(locs) - 2) if len(locs) > 2 else "")
                cats = [c.get("name") for c in j.get("categories", []) if c.get("name")]
                out.append(dict(id=j["id"], title=j["name"], company=j["company"]["name"], loc=loc or "Not listed",
                                remote=any(re.search("remote|flexible", l, re.I) for l in locs) or None,
                                text=_text(j.get("contents")), url=j["refs"]["landing_page"], salary_text="",
                                fallback=cats[0] if cats else None, posted=_ts(j.get("publication_date")),
                                force_type="internship" if token == "Internship" else None))
    return out


def _normalize(raw, kind, name):
    title, loc, text = raw["title"], raw["loc"], raw["text"]
    remote = raw["remote"] if raw["remote"] is not None else bool(re.search(r"\bremote\b", loc, re.I))
    if not (US_RE.search(loc) or (remote and not FOREIGN_RE.search(loc))):
        return None
    if not raw["url"].startswith("https://"):
        return None
    hay = (title + " ") * 2 + text
    found = []
    for skill, rx in SKILL_RES:
        n = len(rx.findall(hay))
        if n:
            found.append((n, skill))
    if found:
        skills = [s for _, s in sorted(found, key=lambda x: -x[0])[:4]]
    elif raw.get("fallback"):
        skills = [raw["fallback"]]      # no known skill in the text: score on the posting's own category
    else:
        return None
    mode = "remote" if remote else ("hybrid" if re.search(r"hybrid", loc + " " + text[:600], re.I) else "onsite")
    t = title.lower()
    typ = raw.get("force_type") or ("internship" if re.search(r"\bintern(ship)?\b", t) else ("coop" if re.search(r"co-?op\b", t) else
                                    ("parttime" if re.search(r"part[- ]time", t + " " + text[:400], re.I) else "job")))
    m = YRS_RE.search(text)
    yrs = min(int(m.group(1)), 15) if m else 0
    edu = "Bachelor" if re.search(r"bachelor|\bB\.?S\.? degree", text, re.I) else "High school"
    blurb = text[:170].rsplit(" ", 1)[0] + "…" if len(text) > 170 else text
    jid = 100000 + int(hashlib.sha1(("%s:%s" % (kind, raw["id"])).encode()).hexdigest()[:6], 16)
    src = name if kind in ("remotive", "jobicy", "muse") else "%s's careers page" % raw["company"]
    return dict(id=jid, co=raw["company"], role=title, loc=loc or "Not listed", mode=mode,
                sal=raw.get("sal") or _salary(raw["salary_text"], text), yrs=yrs, edu=edu, skills=skills, blurb=blurb,
                type=typ, url=raw["url"], source=src, contact=_contact(text), live=True,
                posted=raw.get("posted", 0), perks=_perks(text), comm=bool(COMM_RE.search(text)))


_refreshing = set()


def known_contact(job_id):
    """The recruiter address this server itself found for a job ('' if none or unknown)."""
    with _lock:
        for c in _cache.values():
            for j in c["jobs"]:
                if j["id"] == job_id:
                    return j.get("contact", "") or ""
    return ""


def _refresh_in_background(src):
    try:
        _fetch_source(src)
    finally:
        with _lock:
            _refreshing.discard(src)


def _load_source(src):
    """Serve what is cached right away, even if stale, and refresh it in the background.
    Only the very first request for a source waits for the network."""
    ttl = TTL.get(src[0], DEFAULT_TTL)
    with _lock:
        c = _cache.get(src)
        if c and time.time() - c["at"] >= ttl and src not in _refreshing:
            _refreshing.add(src)
            threading.Thread(target=_refresh_in_background, args=(src,), daemon=True).start()
    if c:
        return c["jobs"], c["status"]
    return _fetch_source(src)


def _fetch_source(src):
    kind, token, name = src
    ttl = TTL.get(kind, DEFAULT_TTL)
    try:
        jobs = []
        for raw in _fetch_raw(kind, token, name):
            j = _normalize(raw, kind, name)
            if j:
                jobs.append(j)
            if len(jobs) >= PER_SOURCE:
                break
        status = "%d jobs" % len(jobs)
    except Exception as e:                      # keep serving the last good copy if the feed is down
        c = _cache.get(src)
        jobs = c["jobs"] if c else []
        status = "error: %s" % str(e)[:80]
        with _lock:
            if c:
                c["at"] = time.time() - ttl + 120   # retry in two minutes
        return jobs, status
    with _lock:
        _cache[src] = {"at": time.time(), "jobs": jobs, "status": status}
    return jobs, status


def get_jobs():
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(_load_source, SOURCES))
    jobs, seen, summary = [], set(), {}
    for src, (js, status) in zip(SOURCES, results):
        summary[src[2] + ("/" + src[1] if src[0] in MULTI else "")] = status
        for j in js:
            if j["id"] not in seen:
                seen.add(j["id"])
                jobs.append(j)
    return {"fetched_at": int(time.time()), "sources": summary, "jobs": jobs}


def get_json():
    return json.dumps(get_jobs()).encode("utf-8")
