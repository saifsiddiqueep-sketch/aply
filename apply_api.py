"""Application delivery back end for the sandbox and dev instances (prod does not use it).

Swipe right  -> POST /api/apply    builds an application and delivers it.
Swipe left   -> POST /api/decision just records that the job was passed on. Nothing is sent to anyone.

Delivery modes (aply-config.json, key "delivery"):
  "test"  (default) the application is written to a simulated recruiter inbox on this computer (/outbox).
                    Nothing leaves the machine, so the flow can be tested with any profile.
  "live"            if the posting lists a recruiting email AND SMTP is configured, the application is emailed to that
                    recruiter from your mail account, with Reply-To set to the candidate. The request must carry
                    confirm_real=true (the user pressed Send after reviewing it). If there is no recruiter email, the
                    result is "handoff": the employer accepts applications only on its own page, and the app opens it.
                    Direct ATS submission (Greenhouse, Lever) needs an API key issued by each employer, so it is not
                    attempted here.

Safeguards: explicit consent flag, candidate name and email required, https posting URLs only, one application per
candidate per job, a daily cap on live sends, size limits, and the server rejects cross-site requests.

Receipts: when the person swiping is signed in (auth_api.py), every new application also produces a receipt addressed
to their account email. In test mode it is stored in the simulated inbox (shown on /outbox); in live mode with SMTP
configured it is emailed to them for real.
"""
import json
import os
import re
import smtplib
import threading
import time
import uuid
import html
from email.message import EmailMessage

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
CONFIG_PATH = os.path.join(ROOT, "aply-config.json")
import jobs_api
import auth_api

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")   # strict: one plain address, no lists or names

_lock = threading.RLock()
APPS = []
DECISIONS = []


def config():
    cfg = {"delivery": "test", "daily_limit": 20, "smtp": {}}
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(json.load(f))
    except Exception:
        pass
    if cfg.get("delivery") not in ("test", "live"):
        cfg["delivery"] = "test"
    return cfg


def _smtp_ready(cfg):
    s = cfg.get("smtp") or {}
    return bool(s.get("host") and s.get("from_addr"))


def _redirect(cfg):
    """If set, every live application goes to this address instead of the recruiter (for safe end-to-end tests)."""
    r = cfg.get("test_recipient")
    return r.strip() if isinstance(r, str) and EMAIL_RE.match(r.strip()) else ""


def public_config():
    cfg = config()
    return {"mode": cfg["delivery"], "canEmail": _smtp_ready(cfg), "redirect": _redirect(cfg)}


def _append(name, obj):
    try:
        os.makedirs(DATA, exist_ok=True)
        with open(os.path.join(DATA, name), "a", encoding="utf-8") as f:
            f.write(json.dumps(obj) + "\n")
    except Exception:
        pass            # keep working from memory if the disk is not writable


def _load():
    for name, store in (("applications.jsonl", APPS), ("decisions.jsonl", DECISIONS)):
        try:
            with open(os.path.join(DATA, name), encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        store.append(json.loads(line))
        except Exception:
            pass


def init(instance):
    """Each instance (sandbox, dev) keeps its own records in data/<instance>/."""
    global DATA
    DATA = os.path.join(ROOT, "data", re.sub(r"[^A-Za-z0-9_-]", "", instance) or "default")
    APPS.clear()
    DECISIONS.clear()
    _load()


def _s(v, n):
    """A single-line, trimmed string (line breaks removed so nothing can inject extra mail headers)."""
    return re.sub(r"[\r\n\t]+", " ", v).strip()[:n] if isinstance(v, str) else ""


def _validate(p):
    if p.get("consent") is not True:
        return "Consent is required to send an application."
    job, prof = p.get("job"), p.get("profile")
    if not isinstance(job, dict) or not isinstance(prof, dict):
        return "Missing job or profile."
    try:
        int(job.get("id"))
    except (TypeError, ValueError):
        return "Invalid job."
    if not _s(job.get("url"), 600).startswith("https://"):
        return "The posting link must be https."
    if not _s(job.get("co"), 200) or not _s(job.get("role"), 200):
        return "Missing company or role."
    if not _s(prof.get("name"), 100):
        return "Add your name in Profile, Settings first."
    if not EMAIL_RE.match(_s(prof.get("email"), 200)):
        return "Add a valid email in Profile, Settings so the recruiter can reply."
    note = p.get("note")
    if not isinstance(note, str) or not note.strip() or len(note) > 4000:
        return "The note must be between 1 and 4000 characters."
    return None


def _simulated_recipient(co):
    return "recruiting@%s.example" % (re.sub(r"[^a-z0-9]", "", co.lower()) or "company")


def _send_email(cfg, to, cand, job, note, original=""):
    s = cfg["smtp"]
    msg = EmailMessage()
    msg["From"] = s["from_addr"]
    msg["To"] = to
    msg["Reply-To"] = "%s <%s>" % (cand["name"], cand["email"])
    test = _redirect(cfg) == to
    msg["Subject"] = "%sApplication: %s - %s" % ("[TEST] " if test else "", job["role"], cand["name"])
    extra = ("\nTest redirect: this would have gone to %s.\n" % (original or "the company's application page")) if test else ""
    msg.set_content("%s\n\n--\nSent through Aply on behalf of %s <%s>.\nPosting: %s\n%s" % (note, cand["name"], cand["email"], job["url"], extra))
    with smtplib.SMTP(s["host"], int(s.get("port", 587)), timeout=20) as srv:
        if s.get("starttls", True):
            srv.starttls()
        if s.get("user"):
            srv.login(s["user"], s.get("password", ""))
        srv.send_message(msg)


def _receipt_text(cand, job, note, rec, user):
    what = {
        "delivered_test": "Test mode: your application went to a simulated recruiter inbox. Nothing was sent to %s." % job["co"],
        "sent": "Your application was emailed to the recruiter at %s. Replies will come to %s." % (rec["to"], cand["email"]),
        "handoff": "%s takes applications only on its own page. Finish your application here: %s" % (job["co"], job["url"]),
    }.get(rec["status"], "Status: %s" % rec["status"])
    subject = "You applied: %s at %s" % (job["role"], job["co"])
    body = ("Hi %s,\n\nYou swiped right on %s at %s%s on Aply.\n\n%s\n\nPosting: %s\nMatch: %d%%\n\nYour note to the company:\n%s\n\n"
            "Track it in Aply under Dashboard, Applied.\n\n--\nAply\nYou get this email because you are signed in as %s."
            % (cand["name"] or "there", job["role"], job["co"], (" (%s)" % job["loc"]) if job.get("loc") else "", what,
               job["url"], rec["match"], note, user["email"]))
    return _s(subject, 200), body


def _send_receipt(cfg, to, subject, body):
    s = cfg["smtp"]
    msg = EmailMessage()
    msg["From"] = s["from_addr"]
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(s["host"], int(s.get("port", 587)), timeout=20) as srv:
        if s.get("starttls", True):
            srv.starttls()
        if s.get("user"):
            srv.login(s["user"], s.get("password", ""))
        srv.send_message(msg)


def _receipt(cfg, user, cand, job, note, rec):
    """Email the signed-in applicant a copy of what happened. Never raises: a receipt problem must not undo an application."""
    to = user["email"]
    subject, body = _receipt_text(cand, job, note, rec, user)
    status = "delivered_test"
    if cfg["delivery"] == "live":
        if _smtp_ready(cfg):
            try:
                _send_receipt(cfg, to, subject, body)
                status = "sent"
            except Exception:
                status = "failed"
        else:
            status = "not_configured"
    try:
        auth_api.add_mail(user["id"], to, subject, body, status)
    except Exception:
        pass
    return {"to": to, "status": status}


def submit(p, user=None):
    """Returns (http_status, dict). `user` is the signed-in account ({id, email}) or None."""
    err = _validate(p)
    if err:
        return 400, {"error": err}
    cfg = config()
    mode = cfg["delivery"]
    job = {k: _s(p["job"].get(k), 600) for k in ("co", "role", "url", "source", "loc", "contact")}
    job["id"] = int(p["job"]["id"])
    prof = p["profile"]
    cand = {"name": _s(prof.get("name"), 100), "email": _s(prof.get("email"), 200).lower(),
            "title": _s(prof.get("title"), 100), "loc": _s(prof.get("loc"), 100), "edu": _s(prof.get("edu"), 40)}
    try:
        cand["years"] = max(0, min(60, int(prof.get("years") or 0)))
    except (TypeError, ValueError):
        cand["years"] = 0
    cand["skills"] = [_s(x, 40) for x in (prof.get("skills") or [])[:30] if isinstance(x, str)]
    note = p["note"].strip()

    # Never email an address the browser sends: only the recruiter address this server found in the job feed itself.
    claimed = job["contact"] if EMAIL_RE.match(job["contact"] or "") else ""
    contact = claimed if claimed and claimed.lower() == jobs_api.known_contact(job["id"]).lower() else ""
    send_args = None
    with _lock:
        for a in APPS:
            if a["job"]["id"] == job["id"] and a["candidate"]["email"] == cand["email"] and a["status"] != "failed":
                return 200, {"status": "duplicate", "id": a["id"], "to": a.get("to", ""), "mode": a["mode"]}
        rec = {"id": uuid.uuid4().hex[:12], "at": int(time.time()), "mode": mode, "job": job, "candidate": cand,
               "note": note, "match": int(p.get("match") or 0), "to": "", "simulated": False, "status": "",
               "user": user["id"] if user else None}
        if mode == "test":
            rec["to"] = contact or _simulated_recipient(job["co"])
            rec["simulated"] = True
            rec["status"] = "delivered_test"
            APPS.append(rec)
            _append("applications.jsonl", rec)
        else:
            if p.get("confirm_real") is not True:
                return 400, {"error": "Live sending needs the user to review and press Send."}
            target = _redirect(cfg) or contact
            if target and _smtp_ready(cfg):
                today = time.time() - 86400
                sent_today = sum(1 for a in APPS if a["mode"] == "live" and a["status"] in ("sent", "sending") and a["at"] > today)
                if sent_today >= int(cfg.get("daily_limit", 20)):
                    return 429, {"error": "Daily sending limit reached."}
                rec["to"], rec["status"] = target, "sending"      # reserved now, so a double tap cannot send twice
                APPS.append(rec)
                send_args = (cfg, target, cand, job, note, contact)
            else:
                rec["status"] = "handoff"
                APPS.append(rec)
                _append("applications.jsonl", rec)
    if send_args:                                                  # the slow network call happens outside the lock
        try:
            _send_email(*send_args)
            status, err = "sent", None
        except Exception as e:
            status, err = "failed", str(e)[:200]
        with _lock:
            rec["status"] = status
            if err:
                rec["error"] = err
            _append("applications.jsonl", rec)
    out = {"status": rec["status"], "id": rec["id"], "to": rec["to"], "mode": mode, "simulated": rec["simulated"]}
    if rec.get("error"):
        out["error"] = "The email could not be sent: " + rec["error"]
    if user and rec["status"] in ("delivered_test", "sent", "handoff"):
        out["receipt"] = _receipt(cfg, user, cand, job, note, rec)
    return 200, out


def record_decision(p):
    d = p.get("dir")
    if d not in ("apply", "pass"):
        return 400, {"error": "Bad decision."}
    try:
        rec = {"at": int(time.time()), "dir": d, "jobId": int(p.get("jobId")), "session": _s(p.get("session"), 64),
               "co": _s(p.get("co"), 200), "role": _s(p.get("role"), 200), "pct": max(0, min(100, int(p.get("pct") or 0)))}
    except (TypeError, ValueError):
        return 400, {"error": "Bad decision."}
    with _lock:
        DECISIONS.append(rec)
        _append("decisions.jsonl", rec)
    return 200, {"ok": True}


def stats():
    with _lock:
        right = sum(1 for d in DECISIONS if d["dir"] == "apply")
        left = sum(1 for d in DECISIONS if d["dir"] == "pass")
        sessions = len({d["session"] for d in DECISIONS if d["session"]})
        return {"right": right, "left": left, "sessions": sessions, "applications": len(APPS)}


def outbox_json():
    st = stats()                       # takes the lock itself, so call it before taking the lock again
    with _lock:
        return {"stats": st, "applications": list(reversed(APPS))[:100]}


def outbox_html():
    e = html.escape
    st = stats()
    with _lock:
        apps = list(reversed(APPS))[:50]
    rows = []
    for a in apps:
        j, c = a["job"], a["candidate"]
        badge = {"delivered_test": "TEST", "sent": "SENT", "handoff": "HANDOFF", "failed": "FAILED"}.get(a["status"], a["status"].upper())
        rows.append(
            '<article><header><span class="b">%s</span><b>%s</b> to %s%s<time>%s</time></header>'
            '<p class="m">From %s &lt;%s&gt; · %s, %s yrs · match %d%% · <a href="%s" target="_blank" rel="noopener noreferrer">posting</a></p>'
            '<pre>%s</pre></article>' % (
                e(badge), e(j["role"]), e(j["co"]), (" &lt;%s&gt;" % e(a["to"])) if a["to"] else "",
                time.strftime("%b %d, %H:%M", time.localtime(a["at"])),
                e(c["name"]), e(c["email"]), e(c["title"] or "candidate"), c["years"], a["match"], e(j["url"]), e(a["note"])))
    body = "".join(rows) or "<p class='m'>No applications yet. Swipe right on a job in the sandbox or dev app.</p>"
    try:
        mails = auth_api.mail_list(30)
    except Exception:
        mails = []
    mail_badge = {"delivered_test": "TEST", "sent": "SENT", "failed": "FAILED", "not_configured": "NOT SENT"}
    receipts = "<h2 style='margin:12px 0 0;font-size:18px'>Receipts to applicants</h2><p class='m'>What signed-in applicants receive at their own email after each swipe right.</p>" + (
        "".join('<article><header><span class="b">%s</span><b>%s</b> to %s<time>%s</time></header><pre>%s</pre></article>' % (
            e(mail_badge.get(m["status"], m["status"].upper())), e(m["subject"]), e(m["to_addr"]),
            time.strftime("%b %d, %H:%M", time.localtime(m["at"])), e(m["body"])) for m in mails)
        or "<p class='m'>No receipts yet. Sign in to Aply, then swipe right on a job.</p>")
    return ("""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aply test inbox</title><style>
:root{--bg:#FDF0F2;--surface:#FFFFFF;--ink:#2A1218;--muted:#7B5560;--line:#F3DADF;--accent:#C92A55}
@media (prefers-color-scheme: dark){:root{--bg:#190B10;--surface:#26131A;--ink:#FBE9EE;--muted:#C79BA6;--line:#40222B;--accent:#FF7A98}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:15px/1.45 'DM Sans','Segoe UI',system-ui,sans-serif}
main{max-width:760px;margin:auto;display:flex;flex-direction:column;gap:12px}h1{margin:0;font-size:22px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stats div{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}
.stats b{display:block;font-size:22px}.stats small,.m{color:var(--muted)}
article{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px}
header{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}header time{margin-left:auto;color:var(--muted);font-size:13px}
.b{font:700 11px ui-monospace,Menlo,monospace;padding:2px 7px;border-radius:6px;background:var(--accent);color:#fff}
pre{white-space:pre-wrap;margin:8px 0 0;font:inherit;background:var(--bg);border-radius:10px;padding:10px}a{color:var(--accent)}
</style></head><body><main><h1>Aply test inbox</h1><p class="m">Simulated recruiter inbox. In test mode nothing leaves this computer.</p>
<div class="stats"><div><b>%d</b><small>Swipes right</small></div><div><b>%d</b><small>Swipes left</small></div><div><b>%d</b><small>Applications</small></div><div><b>%d</b><small>Testers</small></div></div>
%s%s</main></body></html>""" % (st["right"], st["left"], st["applications"], st["sessions"], body, receipts)).encode("utf-8")
