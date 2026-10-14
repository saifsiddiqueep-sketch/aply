"""Delivery straight into an employer's own hiring system (applicant tracking system, "ATS") through its official application endpoint.

This is the only way an application can reach an employer's system by itself. Greenhouse, Lever and the others document an application endpoint, and every
one of them needs a key that the EMPLOYER's own administrator creates and hands over. So this runs only for employers who connected with their key
(see EMPLOYERS.md); for every other job UAply sends the person to the employer's own page and sends nothing.

  greenhouse  POST {base}/v1/boards/{board}/jobs/{id}   Basic auth with the employer's Job Board API key; multipart first_name, last_name, email, phone,
              resume, answers to the posting's questions. The questions are read first (GET ...?questions=true); a required question UAply cannot answer
              from the person's profile means nothing is sent and the person finishes on the employer's page instead.
  lever       POST {base}/v0/postings/{site}/{id}?key=KEY   multipart name, email, phone, org, urls[...], comments, resume. Lever's API carries no
              custom questions.

Every call: HTTPS only, no redirects followed, 20 second limit, a capped reply, and the key is never written to a log or an error message.
"""
import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import uuid

KINDS = ("greenhouse", "lever")
_BASES = {"greenhouse": "https://boards-api.greenhouse.io", "lever": "https://api.lever.co"}
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
KEY_RE = re.compile(r"^[A-Za-z0-9_.:+/=-]{8,200}$")


def _base(kind):
    """The address of the ATS. Tests may point it at this computer (UAPLY_ATS_BASE_GREENHOUSE / _LEVER); anything else in that variable is ignored."""
    v = os.environ.get("UAPLY_ATS_BASE_" + kind.upper(), "")
    if re.match(r"^http://(127\.0\.0\.1|localhost)(:\d+)?$", v):
        return v
    return _BASES[kind]


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


_open = urllib.request.build_opener(_NoRedirect).open


def valid_connection(kind, board, key):
    return kind in KINDS and isinstance(board, str) and bool(TOKEN_RE.match(board)) and isinstance(key, str) and bool(KEY_RE.match(key))


def _multipart(fields, files):
    """fields: [(name, text)], files: [(name, filename, content_type, bytes)] -> (body bytes, content-type header)."""
    boundary = "----uaply" + uuid.uuid4().hex
    out = []
    for name, value in fields:
        out.append(('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n%s\r\n' % (boundary, name, value)).encode("utf-8"))
    for name, filename, ctype, data in files:
        safe = re.sub(r'[^A-Za-z0-9._ -]', "_", filename)
        out.append(('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: %s\r\n\r\n' % (boundary, name, safe, ctype)).encode("utf-8"))
        out.append(data)
        out.append(b"\r\n")
    out.append(("--%s--\r\n" % boundary).encode("utf-8"))
    return b"".join(out), "multipart/form-data; boundary=" + boundary


def _call(req):
    """Returns (status, parsed_json_or_None). Never raises: a network failure comes back as status 0."""
    try:
        with _open(req, timeout=20) as r:
            raw = r.read(200000)
            status = r.status
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read(20000)
    except Exception:
        return 0, None
    try:
        return status, json.loads(raw.decode("utf-8"))
    except Exception:
        return status, None


def _short(body):
    """A short, key-free reason from an ATS error reply."""
    if isinstance(body, dict):
        for k in ("error", "message", "errors"):
            v = body.get(k)
            if isinstance(v, str):
                return re.sub(r"\s+", " ", v)[:120]
            if isinstance(v, list) and v:
                return re.sub(r"\s+", " ", str(v[0]))[:120]
    return ""


# ---------------------------------------------------------------- Greenhouse ----------------------------------------------------------------
_LINKEDIN = re.compile(r"linked\s*in", re.I)
_SITE = re.compile(r"(website|portfolio|github|personal (site|page)|\burl\b|\blink\b)", re.I)
_AUTH = re.compile(r"(authori[sz]ed|legally|eligible|right)\b.*\bwork|work.*(authori[sz]ation|eligib)", re.I)
_SPONSOR = re.compile(r"sponsor", re.I)
_HEAR = re.compile(r"(how|where) did you (hear|find|learn)", re.I)
_EMPLOYER = re.compile(r"(current|most recent|present|previous) (employer|company)", re.I)
_LOCATION = re.compile(r"(location|\bcity\b|where .*(based|located|live))", re.I)
_PHONE = re.compile(r"phone", re.I)


def _pick_option(values, *wanted):
    """The value of the option whose label best matches one of the wanted words (case-insensitive, whole label first, then contained)."""
    opts = [(str(v.get("label", "")).strip().lower(), v.get("value")) for v in values if isinstance(v, dict)]
    for w in wanted:
        for label, value in opts:
            if label == w:
                return value
    for w in wanted:
        for label, value in opts:
            if re.search(r"\b%s\b" % re.escape(w), label):
                return value
    return None


def _answer(question_label, field, cand, ext, note):
    """What to put in one Greenhouse question field, or None when the profile cannot answer it."""
    label, ftype, values = question_label or "", field.get("type"), field.get("values") or []
    if _LINKEDIN.search(label):
        return ext.get("linkedin") or None
    if _AUTH.search(label):
        auth = ext.get("auth")
        want = "yes" if auth in ("citizen", "authorized") else "no" if auth == "none" else ""
        return (_pick_option(values, want) if ftype.startswith("multi_value") else want.capitalize()) if want else None
    if _SPONSOR.search(label):
        spon = ext.get("sponsor")
        return (_pick_option(values, spon) if ftype.startswith("multi_value") else spon.capitalize()) if spon in ("yes", "no") else None
    if _HEAR.search(label):
        if ftype.startswith("multi_value"):
            return _pick_option(values, "job board", "online", "linkedin", "other", "internet")
        return "UAply"
    if _EMPLOYER.search(label):
        return ext.get("employer") or None
    if _PHONE.search(label):
        return ext.get("phone") or None
    if _SITE.search(label):
        return ext.get("portfolio") or ext.get("resume") or None
    if _LOCATION.search(label):
        return cand.get("loc") or None
    return None


def _greenhouse(board, job_id, key, cand, note, resume_meta, resume_bytes):
    base = _base("greenhouse")
    ext = cand.get("ext") or {}
    status, form = _call(urllib.request.Request("%s/v1/boards/%s/jobs/%s?questions=true" % (base, board, job_id), headers={"Accept": "application/json"}))
    if status != 200 or not isinstance(form, dict):
        return "failed", "could not read the job's application form (HTTP %s)" % status
    name = (cand.get("name") or "").strip()
    first, _, last = name.partition(" ")
    last = last.strip() or first
    fields, files, missing = [], [], []
    answered = set()

    def put(fname, value):
        if value not in (None, "") and fname not in answered:
            fields.append((fname, str(value)))
            answered.add(fname)
            return True
        return False

    questions = list(form.get("questions") or []) + list(form.get("location_questions") or [])
    for q in questions:
        label = q.get("label") or ""
        q_ok = False                                          # a question with several fields (a resume file OR pasted text) is answered when any one is
        for f in q.get("fields") or []:
            fname, ftype = f.get("name") or "", f.get("type") or ""
            if not fname:
                continue
            if fname in answered:
                q_ok = True
                continue
            ok = False
            if fname == "first_name":
                ok = put(fname, first)
            elif fname == "last_name":
                ok = put(fname, last)
            elif fname == "email":
                ok = put(fname, cand.get("email"))
            elif fname == "phone":
                ok = put(fname, ext.get("phone"))
            elif fname in ("resume", "cover_letter") and ftype == "input_file":
                if fname == "resume" and resume_bytes and resume_meta:
                    files.append(("resume", resume_meta["name"], resume_meta["type"], resume_bytes))
                    answered.add(fname)
                    ok = True
                elif fname == "cover_letter" and not q.get("required"):
                    ok = True
            elif fname == "resume_text":
                ok = put(fname, ext.get("summary") or note or ext.get("headline")) if not resume_bytes else True
            elif fname == "cover_letter_text":
                ok = put(fname, note or ext.get("summary")) if (note or ext.get("summary")) else not q.get("required")
            else:
                value = _answer(label, f, cand, ext, note)
                ok = put(fname, value) if value is not None else False
            q_ok = q_ok or ok
        if q.get("required") and not q_ok:
            missing.append(label.strip()[:60] or "a required question")
    if missing:
        return "needs_manual", "required questions UAply cannot answer from the profile: " + "; ".join(missing[:5])
    body, ctype = _multipart(fields, files)
    token = base64.b64encode((key + ":").encode("utf-8")).decode("ascii")
    status, reply = _call(urllib.request.Request("%s/v1/boards/%s/jobs/%s" % (base, board, job_id), data=body, method="POST",
                                                 headers={"Content-Type": ctype, "Authorization": "Basic " + token, "Accept": "application/json"}))
    if status in (200, 201):
        return "sent", ""
    if status in (401, 403):
        return "failed", "Greenhouse refused the key for this board (HTTP %s)" % status
    return "failed", "Greenhouse did not accept the application (HTTP %s) %s" % (status, _short(reply))


# ---------------------------------------------------------------- Lever -----------------------------------------------------------------------
def _lever(site, posting_id, key, cand, note, resume_meta, resume_bytes):
    base = _base("lever")
    ext = cand.get("ext") or {}
    comments = "\n\n".join(x for x in ((note or "").strip(), (ext.get("summary") or "").strip(), "Applied through UAply.") if x)
    fields = [("name", cand.get("name") or ""), ("email", cand.get("email") or ""), ("source", "UAply")]
    if ext.get("phone"):
        fields.append(("phone", ext["phone"]))
    if ext.get("employer"):
        fields.append(("org", ext["employer"]))
    if ext.get("linkedin"):
        fields.append(("urls[LinkedIn]", ext["linkedin"]))
    if ext.get("portfolio"):
        fields.append(("urls[Portfolio]", ext["portfolio"]))
    if ext.get("resume"):
        fields.append(("urls[Resume link]", ext["resume"]))
    fields.append(("comments", comments))
    files = [("resume", resume_meta["name"], resume_meta["type"], resume_bytes)] if resume_bytes and resume_meta else []
    body, ctype = _multipart(fields, files)
    url = "%s/v0/postings/%s/%s?key=%s" % (base, site, posting_id, urllib.parse.quote(key, safe=""))
    status, reply = _call(urllib.request.Request(url, data=body, method="POST", headers={"Content-Type": ctype, "Accept": "application/json"}))
    if status == 200:
        return "sent", ""
    if status in (401, 403):
        return "failed", "Lever refused the key for this site (HTTP %s)" % status
    if status == 429:
        return "failed", "Lever is limiting applications for a moment (HTTP 429)"
    return "failed", "Lever did not accept the application (HTTP %s) %s" % (status, _short(reply))


def submit(kind, board, job_id, key, cand, note, resume_meta, resume_bytes):
    """Send one application into the employer's hiring system. Returns (status, reason): "sent", "needs_manual" (nothing was sent: the posting
    has required questions the profile cannot answer, so the person finishes on the employer's page) or "failed"."""
    if not valid_connection(kind, board, key) or not isinstance(job_id, str) or not ID_RE.match(job_id):
        return "failed", "this connection is not set up correctly"
    try:
        if kind == "greenhouse":
            return _greenhouse(board, job_id, key, cand, note, resume_meta, resume_bytes)
        return _lever(board, job_id, key, cand, note, resume_meta, resume_bytes)
    except Exception as e:                                   # never let one employer's system break the swipe
        return "failed", "unexpected problem (%s)" % type(e).__name__
