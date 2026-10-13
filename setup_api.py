"""The owner's setup page (/setup): shows what is switched on and what still needs a key, and sends a test email.

Nothing here reveals a secret: it only says whether each one is set. Like /outbox it is open on this computer and, on a
public server, needs OWNER_PASSWORD.

  GET  /setup                 the checklist
  POST /api/setup/test-mail   send one test email to the owner (owner_copy, else the SMTP from address)
"""
import html
import re
import smtplib
from email.message import EmailMessage

import auth_api
import google_auth
import uaply_api

CLIENT_RE = re.compile(r"^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$")


def _real(v, placeholder_starts=()):
    return isinstance(v, str) and bool(v.strip()) and not any(v.strip().lower().startswith(p) for p in placeholder_starts)


def checks(host, proto):
    cfg = uaply_api.config()
    g = cfg.get("google") if isinstance(cfg.get("google"), dict) else {}
    s = cfg.get("smtp") if isinstance(cfg.get("smtp"), dict) else {}
    owner = uaply_api._owner_copy(cfg)
    redirect = google_auth.redirect_uri(host, proto)
    g_id = g.get("client_id") if isinstance(g.get("client_id"), str) else ""
    g_ok = google_auth.enabled()
    smtp_ok = bool(s.get("host") and s.get("from_addr") and _real(s.get("password"), ("a gmail app password", "the-sending")))
    return [
        {"name": "Sign in with Google", "ok": g_ok,
         "detail": ("On. Users see a Continue with Google button." if g_ok else
                    ("The client ID does not look right (it should end in .apps.googleusercontent.com)." if g_id and not CLIENT_RE.match(g_id) and not g.get("auth_url") else
                     "Off. Add your Google client ID and secret.")),
         "todo": ["Open https://console.cloud.google.com/apis/credentials and create a project if you have none.",
                  "Configure the OAuth consent screen: External, app name UAply, your Gmail as the support email, then Publish app so anyone can sign in (scopes openid and email need no review).",
                  "Create credentials, OAuth client ID, type Web application.",
                  "Add this Authorized redirect URI exactly: " + redirect,
                  "Run: python tools/setup-config.py (it asks for the client ID and secret and saves them in uaply-config.json), then restart the server."] if not g_ok else []},
        {"name": "Email sending (password resets, receipts, copies)", "ok": smtp_ok,
         "detail": ("An email login is set. Use the button below to send yourself a test." if smtp_ok else
                    "Off. Until this is set, emails go only to the simulated test inbox (/outbox) and password reset links cannot reach real people."),
         "todo": ["Sign in to the Gmail account that will send UAply's email and turn on 2-Step Verification.",
                  "Open https://myaccount.google.com/apppasswords and create an app password named UAply.",
                  "Run: python tools/setup-config.py (it asks for the app password without showing it), then restart the server."] if not smtp_ok else []},
        {"name": "Copy of every application to you", "ok": bool(owner),
         "detail": ("Every swipe right is also emailed to " + owner + (" once email sending is on." if not smtp_ok else ".")) if owner else "Off. Set owner_copy to your email.",
         "todo": [] if owner else ["Run: python tools/setup-config.py and enter your email when it asks."]},
        {"name": "AI answers in UAply Assistant (optional)", "ok": _real(cfg.get("anthropic_api_key"), ("optional", "sk-ant-...")) and str(cfg.get("anthropic_api_key")).startswith("sk-ant-"),
         "detail": "Without a key the assistant answers with the best matching help article.", "todo": []},
    ]


def test_mail():
    """Send one email to the owner. Returns (status, body)."""
    cfg = uaply_api.config()
    s = cfg.get("smtp") if isinstance(cfg.get("smtp"), dict) else {}
    to = uaply_api._owner_copy(cfg) or (s.get("from_addr") or "")
    if not (s.get("host") and s.get("from_addr")):
        return 200, {"ok": False, "message": "Email sending is not set up yet. Run python tools/setup-config.py first."}
    if not uaply_api.mail_ready():
        return 200, {"ok": False, "message": "The sending Gmail has no App Password yet. Create one at myaccount.google.com/apppasswords, then run python tools/setup-config.py."}
    if not to:
        return 200, {"ok": False, "message": "No address to send the test to."}
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = s["from_addr"], to, "UAply test email"
    msg.set_content("This is a test from UAply's setup page. If you can read it, UAply can send email: password resets, "
                    "receipts and your copy of every application will work.")
    try:
        with smtplib.SMTP(s["host"], int(s.get("port", 587)), timeout=20) as srv:
            if s.get("starttls", True):
                srv.starttls()
            if s.get("user"):
                srv.login(s["user"], s.get("password", ""))
            srv.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        return 200, {"ok": False, "message": "Gmail refused the login. Use an App Password (not your normal password), with 2-Step Verification on."}
    except smtplib.SMTPServerDisconnected:
        return 200, {"ok": False, "message": "The mail server closed the connection. Check the host and port, and that the App Password is right."}
    except (OSError, smtplib.SMTPException) as e:
        return 200, {"ok": False, "message": "Could not send: " + type(e).__name__}
    return 200, {"ok": True, "message": "Sent to " + to + ". Check that inbox."}


def page(host, proto):
    e = html.escape
    rows = []
    for c in checks(host, proto):
        todo = "".join("<li>%s</li>" % e(t) for t in c["todo"])
        rows.append('<article><header><span class="b %s">%s</span><b>%s</b></header><p class="m">%s</p>%s</article>' % (
            "ok" if c["ok"] else "no", "ON" if c["ok"] else "TO DO", e(c["name"]), e(c["detail"]), ("<ol>%s</ol>" % todo) if todo else ""))
    try:
        n = auth_api.counts()
    except Exception:
        n = {"users": 0, "mail": 0}
    return ("""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>UAply setup</title><style>
:root{--bg:#FDF0F2;--surface:#FFFFFF;--ink:#2A1218;--muted:#7B5560;--line:#F3DADF;--accent:#C92A55;--good:#1E7A4C}
@media (prefers-color-scheme: dark){:root{--bg:#190B10;--surface:#26131A;--ink:#FBE9EE;--muted:#C79BA6;--line:#40222B;--accent:#FF7A98;--good:#5FD39A}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:15px/1.5 'DM Sans','Segoe UI',system-ui,sans-serif}
main{max-width:760px;margin:auto;display:flex;flex-direction:column;gap:12px}h1{margin:0;font-size:22px}.m{color:var(--muted);margin:6px 0 0}
article{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
header{display:flex;gap:8px;align-items:center}.b{font:700 11px ui-monospace,Menlo,monospace;padding:2px 7px;border-radius:6px;color:#fff}
.b.ok{background:var(--good)}.b.no{background:var(--accent)}ol{margin:8px 0 0;padding-left:20px}li{margin:4px 0}
button{font:inherit;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
code{background:var(--bg);padding:1px 5px;border-radius:5px}
</style></head><body><main><h1>UAply setup</h1><p class="m">What is switched on, and what still needs a key. Secrets are never shown here.</p>
%s
<article><b>Send a test email</b><p class="m">Sends one message to your copy address so you can see that real email works.</p>
<p><button id="t" type="button">Send test email</button> <span id="r" class="m" role="status"></span></p></article>
<p class="m">%d accounts and %d emails recorded on this server. <a href="/outbox">Test inbox</a></p></main>
<script>document.getElementById('t').onclick=function(){var r=document.getElementById('r');r.textContent='Sending...';
fetch('/api/setup/test-mail',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(function(x){return x.json()}).then(function(j){r.textContent=j.message||j.error||'Done'}).catch(function(){r.textContent='Could not reach the server.'})}</script>
</body></html>""" % ("".join(rows), n["users"], n["mail"])).encode("utf-8")
