"""Hiring mode (sandbox only for now): a company profile and job postings an employer publishes on UAply.

A posting asks for the same things a job seeker's profile, application details and filters hold (title, type, work style, place,
pay, experience, education, skills, majors, GPA, graduation dates, work authorization, sponsorship, start date, relocation,
benefits), so every posting is scored and filtered on equal terms. Open postings appear in the same feed seekers swipe on.

  GET  /api/employer/me            the signed-in account's company, postings (with applicant counts) and applicants
  GET  /api/employer/logo/<uid>    a company's logo (PNG, JPEG or WebP only)
  POST /api/employer/company       save the company profile
  POST /api/employer/job           create or update a posting ({id} updates)
  POST /api/employer/job/status    {id, status: open|paused|closed|deleted}

Applications go to the employer account's own verified email, never to an address typed into a form, so nobody can post a job
that routes other people's applications somewhere they did not choose. The hiring manager's email and LinkedIn stay on this
server: manager_for(job_id) hands them to the code that sends the Plus/Pro "Message the hiring manager" note.
"""
import base64
import hashlib
import json
import os
import re
import threading
import time

import uaply_api

ENABLED = False
_lock = threading.RLock()
_db = {"companies": {}, "jobs": [], "pipeline": {}, "next": 300001}
_path = ""

LEVELS = ["High school", "Associate", "Bachelor", "Master", "Doctorate"]
TYPES = ("job", "parttime", "internship", "coop")
MODES = ("remote", "hybrid", "onsite")
COUNTRIES = {"US": "United States", "CA": "Canada"}
REGIONS = {
    "US": ("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD "
           "TN TX UT VT VA WA WV WI WY PR").split(),
    "CA": "AB BC MB NB NL NS NT NU ON PE QC SK YT".split(),
}
PERKS = ("health", "dental", "vision", "k401", "match", "loan", "stock", "pto", "maternity", "paternity", "tuition")
START = ("now", "2w", "1m", "grad", "flex")
AUTH = ("any", "citizen")             # any: anyone allowed to work there (incl. visa/OPT holders); citizen: citizens and permanent residents only
INDUSTRIES = ("Accounting", "Advertising and marketing", "Aerospace and defense", "Agriculture", "Architecture and planning",
              "Arts and design", "Biotech and pharmaceuticals", "Consulting", "Education", "Energy and utilities", "Engineering",
              "Finance and banking", "Government and public sector", "Healthcare", "Hospitality and food service", "Insurance",
              "Law and legal services", "Manufacturing", "Media and entertainment", "Nonprofit and social services",
              "Real estate and construction", "Retail and consumer goods", "Science and research", "Software and technology",
              "Sports and recreation", "Telecommunications", "Transportation and logistics", "Other")
SIZES = ("1-10", "11-50", "51-200", "201-500", "501-1,000", "1,001-5,000", "5,001-10,000", "10,001+")     # LinkedIn's company-size bands
STATUSES = ("open", "paused", "closed")
STAGES = ("new", "review", "interview", "offer", "hired", "no")      # an applicant's place in the employer's pipeline
MAX_JOBS = 25
LOGO_MAX = 120000
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
MONTH_RE = re.compile(r"^20\d\d-(0[1-9]|1[0-2])$")
LOGO_RE = re.compile(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$")


def init(instance):
    """Turned on for the sandbox instance only. Postings are kept in data/<instance>/employers.json next to the applications."""
    global ENABLED, _path
    ENABLED = instance == "sandbox"
    _path = os.path.join(uaply_api.DATA, "employers.json")
    with _lock:
        _db.update(companies={}, jobs=[], pipeline={}, next=300001)
        try:
            with open(_path, encoding="utf-8") as f:
                d = json.load(f)
            if isinstance(d, dict):
                _db["companies"] = d.get("companies") if isinstance(d.get("companies"), dict) else {}
                _db["jobs"] = d.get("jobs") if isinstance(d.get("jobs"), list) else []
                _db["pipeline"] = d.get("pipeline") if isinstance(d.get("pipeline"), dict) else {}
                _db["next"] = max(300001, int(d.get("next") or 300001))
        except (OSError, ValueError, TypeError):
            pass


def _save():
    try:
        os.makedirs(os.path.dirname(_path), exist_ok=True)
        tmp = _path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_db, f)
        os.replace(tmp, _path)                     # never leaves a half-written file behind
    except OSError:
        pass                                       # keep working from memory if the disk is not writable


def _s(v, n):
    return re.sub(r"\s+", " ", v).strip()[:n] if isinstance(v, str) else ""


def _para(v, n):
    """Free text that keeps its line breaks (an About section, a job description)."""
    if not isinstance(v, str):
        return ""
    v = re.sub(r"[ \t]+", " ", v.replace("\r\n", "\n")).strip()
    return re.sub(r"\n{3,}", "\n\n", v)[:n]


def _https(v, n=300):
    v = _s(v, n)
    return v if re.match(r"^https://[^\s/]+\.[^\s]+$", v) else ""


def _list(v, n_items, n_chars):
    items = v.split(",") if isinstance(v, str) else (v if isinstance(v, list) else [])
    out, seen = [], set()
    for x in items:
        x = _s(x, n_chars)
        if x and x.lower() not in seen:
            seen.add(x.lower())
            out.append(x)
    return out[:n_items]


def _int(v, lo, hi):
    try:
        return max(lo, min(hi, int(float(v))))
    except (TypeError, ValueError):
        return None


def _logo(v):
    """(error, (mime, base64)) for an uploaded logo. Only PNG, JPEG and WebP whose bytes really are that format; SVG is refused (it can carry script)."""
    m = LOGO_RE.match(v.strip()) if isinstance(v, str) else None
    if not m:
        return "Upload the logo as a PNG, JPEG or WebP image.", None
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except ValueError:
        return "That logo file could not be read. Try another image.", None
    if len(raw) > LOGO_MAX:
        return "That logo is too large. Use an image under 120 KB.", None
    kind = m.group(1)
    ok = {"png": raw[:8] == b"\x89PNG\r\n\x1a\n", "jpeg": raw[:3] == b"\xff\xd8\xff", "webp": raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"}[kind]
    if not ok:
        return "That file is not really a PNG, JPEG or WebP image.", None
    return "", ("image/" + kind, base64.b64encode(raw).decode("ascii"))


def _signed_in(user, need_verified=True):
    if not ENABLED:
        return 404, {"error": "not found"}
    if not user:
        return 401, {"error": "Sign in first so your company and postings are saved to your account."}
    if need_verified and not user.get("emailVerified"):
        return 403, {"error": "Verify your email first (Profile, Account). Applications are sent to it.", "code": "verify"}
    return None


# ---------- company ----------
def save_company(user, p):
    bad = _signed_in(user)
    if bad:
        return bad
    uid = str(user["id"])
    name = _s(p.get("name"), 100)
    if len(name) < 2:
        return 400, {"error": "Enter your company name.", "field": "name"}
    country = p.get("country") if p.get("country") in COUNTRIES else ""
    if not country:
        return 400, {"error": "Choose the United States or Canada.", "field": "country"}
    region = p.get("region") if p.get("region") in REGIONS[country] else ""
    website = _https(p.get("website"))
    if _s(p.get("website"), 300) and not website:
        return 400, {"error": "Use a full website address that starts with https://", "field": "website"}
    if p.get("industry") not in INDUSTRIES:
        return 400, {"error": "Choose your industry.", "field": "industry"}
    if p.get("size") not in SIZES:
        return 400, {"error": "Choose how many people work at your company.", "field": "size"}
    if p.get("consent") is not True:
        return 400, {"error": "Confirm that you may post jobs for this company and receive applications through UAply.", "field": "consent"}
    with _lock:
        old = _db["companies"].get(uid) or {}
        c = dict(old, name=name, website=website, country=country, region=region, city=_s(p.get("city"), 60),
                 industry=p["industry"], size=p["size"], about=_para(p.get("about"), 1500),
                 email=user["email"], updated=int(time.time()))
        if not old.get("consent"):
            c["consent"] = "Agreed in UAply Hiring on %s by %s" % (time.strftime("%Y-%m-%d"), user["email"])
        lg = p.get("logo")
        if lg == "remove":
            c.pop("logo", None)
        elif isinstance(lg, str) and lg.startswith("data:"):
            err, val = _logo(lg)
            if err:
                return 400, {"error": err, "field": "logo"}
            c["logo"] = {"type": val[0], "data": val[1], "v": hashlib.sha1(val[1].encode()).hexdigest()[:10]}
        _db["companies"][uid] = c
        _save()
    return 200, {"ok": True, "company": _company_out(uid, c)}


def _company_out(uid, c):
    if not c:
        return None
    out = {k: c.get(k, "") for k in ("name", "website", "country", "region", "city", "industry", "size", "about", "email")}
    out["logo"] = _logo_url(uid, c)
    return out


def _logo_url(uid, c):
    lg = c.get("logo") if c else None
    return "/api/employer/logo/%s?v=%s" % (uid, lg["v"]) if lg else ""


def logo(uid):
    """(mime, bytes) of a company's logo, or None."""
    if not ENABLED:
        return None
    with _lock:
        lg = (_db["companies"].get(str(uid)) or {}).get("logo")
    if not lg:
        return None
    return lg["type"], base64.b64decode(lg["data"])


# ---------- postings ----------
def _job_in(p, company):
    """(error, field, posting) from what the employer typed. Mirrors the job seeker's profile, application details and filters."""
    role = _s(p.get("role"), 120)
    if len(role) < 2:
        return "Enter the job title.", "role", None
    country = p.get("country") if p.get("country") in COUNTRIES else company.get("country") or "US"
    mode = p.get("mode") if p.get("mode") in MODES else ""
    if not mode:
        return "Choose remote, hybrid or on-site.", "mode", None
    city, region = _s(p.get("city"), 60), (p.get("region") if p.get("region") in REGIONS[country] else "")
    if mode != "remote" and not (city and region):
        return "Enter the city and %s where the job is." % ("state" if country == "US" else "province"), "city", None
    lo, hi = _int(p.get("sal_min"), 0, 10000000), _int(p.get("sal_max"), 0, 10000000)
    if not lo or not hi or hi < lo:
        return "Enter the yearly pay range (the most must be at least the least).", "sal_min", None
    skills = _list(p.get("skills"), 6, 40)
    if not skills:
        return "Add at least one skill the job needs.", "skills", None
    blurb = _s(p.get("blurb"), 220)
    if len(blurb) < 20:
        return "Write a one-line summary for the job card (20 characters or more).", "blurb", None
    gpa = p.get("gpa")
    gpa = round(float(gpa), 2) if isinstance(gpa, (int, float, str)) and re.match(r"^\d(\.\d{1,2})?$", str(gpa).strip()) and 0 < float(gpa) <= 4.0 else 0
    gf, gt = (p.get("grad_from") if isinstance(p.get("grad_from"), str) and MONTH_RE.match(p.get("grad_from")) else ""), \
             (p.get("grad_to") if isinstance(p.get("grad_to"), str) and MONTH_RE.match(p.get("grad_to")) else "")
    if gf and gt and gt < gf:
        return "The graduation window ends before it starts.", "grad_to", None
    url = _https(p.get("url"))
    if _s(p.get("url"), 300) and not url:
        return "Use a full link that starts with https://", "url", None
    m = p.get("manager") if isinstance(p.get("manager"), dict) else {}
    mgr = {"name": _s(m.get("name"), 80), "title": _s(m.get("title"), 80), "email": _s(m.get("email"), 120).lower(),
           "linkedin": _https(m.get("linkedin"), 200)}
    if mgr["email"] and not EMAIL_RE.match(mgr["email"]):
        return "Enter the hiring manager's email as name@company.com", "mgr_email", None
    if _s(m.get("linkedin"), 200) and not re.match(r"^https://([a-z]{2,3}\.)?linkedin\.com/in/[^\s]+$", mgr["linkedin"]):
        return "Use the hiring manager's LinkedIn link (https://www.linkedin.com/in/...)", "mgr_linkedin", None
    return "", "", {
        "role": role, "type": p.get("type") if p.get("type") in TYPES else "job", "mode": mode, "country": country,
        "city": city if mode != "remote" or city else "", "region": region,
        "sal": [lo, hi], "comm": p.get("comm") is True,
        "yrs": _int(p.get("yrs"), 0, 15) or 0, "edu": p.get("edu") if p.get("edu") in LEVELS else "High school",
        "skills": skills, "majors": _list(p.get("majors"), 6, 60), "gpa": gpa, "grad": [gf, gt],
        "auth": p.get("auth") if p.get("auth") in AUTH else "any", "sponsor": p.get("sponsor") if p.get("sponsor") in ("yes", "no") else "",
        "start": p.get("start") if p.get("start") in START else "", "reloc": p.get("reloc") is True,
        "perks": [k for k in PERKS if k in (p.get("perks") if isinstance(p.get("perks"), list) else [])],
        "blurb": blurb, "desc": _para(p.get("desc"), 5000), "url": url,
        "manager": mgr, "show_manager": p.get("show_manager") is True and bool(mgr["name"]),
    }


def save_job(user, p):
    bad = _signed_in(user)
    if bad:
        return bad
    uid = str(user["id"])
    with _lock:
        company = _db["companies"].get(uid)
        if not company:
            return 400, {"error": "Add your company first.", "code": "company"}
        err, field, job = _job_in(p, company)
        if err:
            return 400, {"error": err, "field": field}
        jid = _int(p.get("id"), 0, 10 ** 9)
        if jid:
            cur = next((j for j in _db["jobs"] if j["id"] == jid and j["owner"] == uid), None)
            if not cur:
                return 404, {"error": "That posting was not found."}
            cur.update(job, updated=int(time.time()))
        else:
            if sum(1 for j in _db["jobs"] if j["owner"] == uid) >= MAX_JOBS:
                return 400, {"error": "You have %d postings, the most for now. Close or delete one first." % MAX_JOBS}
            jid = _db["next"]
            _db["next"] += 1
            cur = dict(job, id=jid, owner=uid, status="open", posted=int(time.time()), updated=int(time.time()))
            _db["jobs"].append(cur)
        _save()
        return 200, {"ok": True, "job": _job_out(cur)}


def set_status(user, p):
    bad = _signed_in(user, need_verified=False)
    if bad:
        return bad
    uid, jid, st = str(user["id"]), _int(p.get("id"), 0, 10 ** 9), p.get("status")
    if st not in STATUSES + ("deleted",):
        return 400, {"error": "Unknown status."}
    with _lock:
        cur = next((j for j in _db["jobs"] if j["id"] == jid and j["owner"] == uid), None)
        if not cur:
            return 404, {"error": "That posting was not found."}
        if st == "deleted":
            _db["jobs"].remove(cur)
        else:
            if st == "open" and cur["status"] != "open":
                cur["posted"] = int(time.time())         # reopening puts it back at the top of "Posted in the past week"
            cur["status"] = st
        _save()
    return 200, {"ok": True}


def _job_out(j):
    """A posting as its owner sees it (everything they typed, including the hiring manager's contact)."""
    return {k: v for k, v in j.items() if k != "owner"}


def _applicants(job_ids):
    """Applications people sent to these postings, newest first: what the applicant agreed to share when they swiped right."""
    out = []
    with _lock:
        pipe = dict(_db["pipeline"])
    with uaply_api._lock:
        for a in uaply_api.APPS:
            j = a.get("job") or {}
            if j.get("id") not in job_ids or a.get("status") in ("failed", "duplicate"):
                continue
            c = a.get("candidate") or {}
            x = c.get("ext") or {}
            out.append({"id": a.get("id"), "job": j.get("id"), "at": a.get("at"), "match": a.get("match", 0), "note": a.get("note", ""),
                        "name": c.get("name", ""), "email": c.get("email", ""), "phone": x.get("phone", ""), "title": c.get("title", ""),
                        "loc": c.get("loc", ""), "years": c.get("years", 0), "edu": c.get("edu", ""), "skills": c.get("skills", []),
                        "school": x.get("school", ""), "major": x.get("major", ""), "grad": x.get("grad", ""), "gpa": x.get("gpa", ""),
                        "auth": x.get("auth", ""), "sponsor": x.get("sponsor", ""), "start": x.get("start", ""),
                        "headline": x.get("headline", ""), "summary": x.get("summary", ""), "resume": x.get("resume", ""),
                        "linkedin": x.get("linkedin", ""), "portfolio": x.get("portfolio", ""),
                        "stage": (pipe.get(a.get("id")) or {}).get("stage", "new"), "private": (pipe.get(a.get("id")) or {}).get("note", "")})
    return sorted(out, key=lambda r: -(r["at"] or 0))[:500]


def set_stage(user, p):
    """Move an applicant along the pipeline and keep a private note. Only for applications sent to this account's own postings."""
    bad = _signed_in(user, need_verified=False)
    if bad:
        return bad
    uid, aid = str(user["id"]), _s(p.get("id"), 40)
    stage = p.get("stage")
    if stage is not None and stage not in STAGES:
        return 400, {"error": "Unknown stage."}
    with _lock:
        mine = {j["id"] for j in _db["jobs"] if j["owner"] == uid}
    with uaply_api._lock:
        rec = next((a for a in uaply_api.APPS if a.get("id") == aid), None)
    if not rec or (rec.get("job") or {}).get("id") not in mine:
        return 404, {"error": "That applicant was not found."}
    with _lock:
        cur = dict(_db["pipeline"].get(aid) or {})
        if stage:
            cur["stage"] = stage
        if isinstance(p.get("note"), str):
            cur["note"] = _para(p["note"], 1000)
        cur["at"] = int(time.time())
        _db["pipeline"][aid] = cur
        _save()
    return 200, {"ok": True}


def me(user):
    bad = _signed_in(user, need_verified=False)
    if bad:
        return bad
    uid = str(user["id"])
    with _lock:
        company = _db["companies"].get(uid)
        jobs = [_job_out(j) for j in _db["jobs"] if j["owner"] == uid]
    apps = _applicants({j["id"] for j in jobs})
    for j in jobs:
        j["applicants"] = sum(1 for a in apps if a["job"] == j["id"])
    return 200, {"company": _company_out(uid, company), "jobs": sorted(jobs, key=lambda j: -j["posted"]), "applicants": apps,
                 "verified": bool(user.get("emailVerified")), "email": user["email"], "pricing": "TBD"}


# ---------- what job seekers see ----------
def _loc(j):
    if j["mode"] == "remote":
        return "Remote (%s)" % ("US" if j["country"] == "US" else "Canada")
    return "%s, %s%s" % (j["city"], j["region"], ", Canada" if j["country"] == "CA" else "")


def feed_jobs():
    """Every posting in the job feed's own shape (the partner-job fields the app already scores and filters on) plus the extra
    fields only an employer posting has. Paused and closed postings stay in the list marked closed, so a person's Applied list
    still shows them, but they never appear as new cards. "contact" is for this server only; jobs_api strips it before a browser sees it."""
    if not ENABLED:
        return []
    out = []
    with _lock:
        for j in _db["jobs"]:
            c = _db["companies"].get(j["owner"])
            if not c or not c.get("consent") or not c.get("email"):
                continue
            mgr = j.get("manager") or {}
            out.append(dict(
                id=j["id"], co=c["name"], role=j["role"], loc=_loc(j), mode=j["mode"], sal=list(j["sal"]), yrs=j["yrs"], edu=j["edu"],
                skills=list(j["skills"]), blurb=j["blurb"], type=j["type"], url=j.get("url") or c.get("website") or "",
                source="Posted on UAply by %s" % c["name"], contact=c["email"], apply="direct", webhook=False, partner=True, live=True,
                instant=True, posted=j["posted"] * 1000, perks=list(j["perks"]), comm=j["comm"], closed=j["status"] != "open",
                emp=True, country=j["country"], region=j["region"], city=j["city"], desc=j["desc"], majors=list(j["majors"]),
                gpa=j["gpa"], grad=list(j["grad"]), auth=j["auth"], sponsor=j["sponsor"], start=j["start"], reloc=j["reloc"],
                about=c.get("about", ""), industry=c.get("industry", ""), size=c.get("size", ""), website=c.get("website", ""),
                logo=_logo_url(j["owner"], c),
                manager={"name": mgr.get("name", ""), "title": mgr.get("title", "")} if j.get("show_manager") else None))
    return out


# ---------- reading an existing job post from a link (the "Start from your existing job post" box) ----------
# sites whose terms forbid other sites reading their pages, or that need a login: the employer pastes the job text instead
NO_READ = {"linkedin.com": "LinkedIn", "indeed.com": "Indeed", "ziprecruiter.com": "ZipRecruiter", "glassdoor.com": "Glassdoor",
           "joinhandshake.com": "Handshake", "handshake.com": "Handshake", "monster.com": "Monster", "hiring.cafe": "Hiring Cafe"}
IMPORT_MAX = 3 * 1024 * 1024
_imports = {}          # account id -> times of recent imports (a light limit so this is not a general web proxy)


def _public_host(host):
    """True when every address the name resolves to is on the public internet (no localhost, private or cloud-metadata ranges)."""
    import ipaddress
    import socket
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0].split("%")[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False
    return bool(infos)


def _fetch(url):
    """(error, final url, html) for one public web page."""
    import urllib.error
    import urllib.parse
    import urllib.request

    class Safe(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            p = urllib.parse.urlparse(newurl)
            if p.scheme not in ("http", "https") or not p.hostname or not _public_host(p.hostname) or _no_read(p.hostname):
                return None
            return super().redirect_request(req, fp, code, msg, headers, newurl)

    opener = urllib.request.build_opener(Safe)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; UAplyImport/1.0; reads one job post an employer asked to import)",
                                               "Accept": "text/html,application/xhtml+xml"})
    try:
        with opener.open(req, timeout=12) as r:
            if "html" not in (r.headers.get("Content-Type") or "html"):
                return "That link is not a web page.", url, ""
            raw = r.read(IMPORT_MAX + 1)
            if len(raw) > IMPORT_MAX:
                return "That page is too large to read.", url, ""
            charset = r.headers.get_content_charset() or "utf-8"
            return "", r.geturl(), raw.decode(charset, "replace")
    except urllib.error.HTTPError as e:
        return ("That page needs a login, or the site does not let other sites read it." if e.code in (401, 403, 429, 999)
                else "That page could not be opened (error %d)." % e.code), url, ""
    except Exception:
        return "That page could not be opened. Check the link, or paste the job text instead.", url, ""


def _no_read(host):
    """The site's name when its pages may not be read by UAply ('' otherwise)."""
    host = (host or "").lower()
    return next((name for h, name in NO_READ.items() if host == h or host.endswith("." + h)), "")


def _job_postings(node, out):
    if isinstance(node, list):
        for x in node:
            _job_postings(x, out)
    elif isinstance(node, dict):
        t = node.get("@type")
        if t == "JobPosting" or (isinstance(t, list) and "JobPosting" in t):
            out.append(node)
        for k in ("@graph", "itemListElement", "mainEntity", "item"):
            if k in node:
                _job_postings(node[k], out)


def extract_page(raw):
    """{jsonld, title, text} from a job page: its schema.org JobPosting block (the one Google Jobs reads), its title and visible text."""
    import html as htmlmod
    posts = []
    for block in re.findall(r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", raw, re.S | re.I):
        try:
            _job_postings(json.loads(block.strip()), posts)
        except ValueError:
            continue
    m = re.search(r"<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)", raw, re.I) or re.search(r"<title[^>]*>(.*?)</title>", raw, re.S | re.I)
    body = re.sub(r"<(script|style|noscript|svg|head|nav|footer)\b[\s\S]*?</\1>", " ", raw, flags=re.I)
    body = re.sub(r"<(br|/p|/li|/h\d|/div|/tr|/section)\b[^>]*>", "\n", body, flags=re.I)
    text = htmlmod.unescape(re.sub(r"<[^>]+>", " ", body))
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text).strip()[:30000]
    post = posts[0] if posts else None
    if post and isinstance(post.get("description"), str):
        post = dict(post, description=post["description"][:30000])
    return {"jsonld": post, "title": htmlmod.unescape(m.group(1)).strip()[:200] if m else "", "text": text}


def import_page(user, url):
    """POST /api/employer/import {url}: read one public job page the employer points to. Signed-in employers only, a few a minute."""
    bad = _signed_in(user, need_verified=False)
    if bad:
        return bad
    import urllib.parse
    url = _s(url, 600)
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        return 400, {"error": "Paste the full link to the job, starting with https://"}
    site = _no_read(p.hostname)
    if site:
        return 422, {"error": "%s doesn't let other sites read its pages. Open your post there, select all of it, copy, and paste it here." % site, "code": "no_read"}
    if not _public_host(p.hostname):
        return 400, {"error": "That link does not point to a public website."}
    now = time.time()
    with _lock:
        recent = [t for t in _imports.get(user["id"], []) if now - t < 60]
        if len(recent) >= 8:
            return 429, {"error": "Too many links at once. Wait a minute and try again."}
        _imports[user["id"]] = recent + [now]
    err, final, raw = _fetch(url)
    if err:
        return 422, {"error": err, "code": "fetch"}
    out = extract_page(raw)
    if not out["jsonld"] and len(out["text"]) < 200:
        return 422, {"error": "That page has almost no text we can read (it may load the job with a script). Paste the job text instead.", "code": "empty"}
    return 200, dict(out, url=final)


def manager_for(job_id):
    """{name, title, email, linkedin} of the hiring manager the employer named for this posting, or None. For the server code that
    sends the Plus/Pro "Message the hiring manager" note with an application; never sent to a browser."""
    if not ENABLED:
        return None
    with _lock:
        j = next((x for x in _db["jobs"] if x["id"] == job_id), None)
        m = dict(j.get("manager") or {}) if j else {}
    return m if (m.get("email") or m.get("linkedin")) else None
