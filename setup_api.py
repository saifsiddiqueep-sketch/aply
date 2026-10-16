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

import json
import os

import ats_api
import auth_api
import billing_api
import google_auth
import jobs_api
import uaply_api

CLIENT_RE = re.compile(r"^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$")


URL_RE = re.compile(r"https://[A-Za-z0-9./_?=&#%-]+[A-Za-z0-9/_-]")


def _real(v, placeholder_starts=()):
    return isinstance(v, str) and bool(v.strip()) and not any(v.strip().lower().startswith(p) for p in placeholder_starts)


def _linkify(text):
    """Escape the text, then turn each https address in it into a link that opens in a new tab."""
    out, last = [], 0
    for m in URL_RE.finditer(text):
        out.append(html.escape(text[last:m.start()]))
        out.append('<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (html.escape(m.group(0)), html.escape(m.group(0))))
        last = m.end()
    out.append(html.escape(text[last:]))
    return "".join(out)


def origins(host, proto):
    """The addresses Google must be told about (Authorized JavaScript origins). On this computer Google wants the bare localhost one too."""
    base = "%s://%s" % (proto, host)
    found = [base]
    if host.split(":")[0] in ("localhost", "127.0.0.1"):
        found.append("%s://localhost" % proto)
    return list(dict.fromkeys(found))


def checks(host, proto):
    cfg = uaply_api.config()
    g = cfg.get("google") if isinstance(cfg.get("google"), dict) else {}
    s = cfg.get("smtp") if isinstance(cfg.get("smtp"), dict) else {}
    owner = uaply_api._owner_copy(cfg)
    g_id = g.get("client_id") if isinstance(g.get("client_id"), str) else ""
    g_ok = google_auth.button_enabled()
    smtp_ok = bool(s.get("host") and s.get("from_addr") and _real(s.get("password"), ("a gmail app password", "the-sending")))
    return [
        {"name": "Sign in with Google", "ok": g_ok,
         "detail": ("On. Google's own button shows on the sign-in screen, including accounts already signed in on that browser." if g_ok else
                    ("The client ID does not look right (it should end in .apps.googleusercontent.com)." if g_id and not CLIENT_RE.match(g_id) and not g.get("auth_url") else
                     "Off. Add your Google client ID (the public one; no secret is needed).")),
         "todo": ["Open https://console.cloud.google.com/apis/credentials/consent and set up the consent screen: type External, app name UAply, your Gmail as the support and developer email. Then press Publish app so anyone can sign in (the scopes openid, email and profile need no review).",
                  "Open https://console.cloud.google.com/apis/credentials/oauthclient and create an OAuth client ID of type Web application (Google asks you to create a project first if you have none).",
                  "Under Authorized JavaScript origins add each of these, exactly as written: " + "  and  ".join(origins(host, proto)) + ". Open this app at localhost, not 127.0.0.1, because Google treats them as different addresses. Add your real website address here too when you have one.",
                  "Copy the Client ID Google shows (it ends in .apps.googleusercontent.com) and paste it in the Connect Google box below. No secret is needed."] if not g_ok else []},
        {"name": "Email sending (password resets, receipts, copies)", "ok": smtp_ok,
         "detail": ("An email login is set. Use the button below to send yourself a test." if smtp_ok else
                    "Off. Until this is set, emails go only to the simulated test inbox (/outbox) and password reset links cannot reach real people."),
         "todo": ["Open https://myaccount.google.com/signinoptions/two-step-verification and turn on 2-Step Verification for the Gmail that will send UAply's email (Google requires it for app passwords).",
                  "Open https://myaccount.google.com/apppasswords, name it UAply and press Create. Google shows a 16-letter code once; copy it.",
                  "Paste that Gmail address and the code in the Connect Gmail box below. A test email goes out right away."] if not smtp_ok else []},
        {"name": "Apply instantly (employers' hiring systems)", "ok": bool(connections()),
         "detail": ("Connected: " + ", ".join("%s/%s" % c for c in connections()) + ". Their postings say Apply instantly.") if connections() else
                   "Off. No employer has connected yet, so swipe right on a real job opens the employer's own page. See EMPLOYERS.md for how an employer connects.",
         "todo": ["Ask the employer to create a Greenhouse Job Board API key or a Lever Postings API key (EMPLOYERS.md says where).",
                  "Paste it in the Connect an employer's hiring system box below, with the board name from their job-board address.",
                  "Set delivery to live in the settings (UAPLY_CONFIG_JSON on a host) so applications are really sent."] if not connections() else []},
        {"name": "Payments for Plus and Pro (Stripe)", "ok": billing_api.settings()["on"] and bool(billing_api.settings().get("webhook_secret")),
         "detail": ("On, in %s mode." % ("TEST" if billing_api.settings()["test"] else "LIVE")) if billing_api.settings()["on"] else "Off. Plans show, but Choose says payments are not switched on yet.",
         "todo": ["Create a Stripe account at https://dashboard.stripe.com/register (start in test mode).",
                  "Product catalog: add a product Plus with a monthly price of 9.99 USD and a product Pro at 19.99 USD. Copy both price ids (price_...).",
                  "Developers, API keys: copy the secret key (sk_test_...).",
                  "Developers, Webhooks: add an endpoint " + proto + "://" + host + "/api/billing/webhook with the events checkout.session.completed and customer.subscription.updated, created and deleted; copy its signing secret (whsec_...). On this computer use the Stripe CLI: stripe listen --forward-to localhost:8767/api/billing/webhook.",
                  "Settings, Billing, Customer portal: turn it on so people can switch plans and cancel.",
                  "Paste the four values in the Connect Stripe box below."] if not billing_api.settings()["on"] else []},
        {"name": "Copy of every application to you", "ok": bool(owner),
         "detail": ("Every swipe right is also emailed to " + owner + (" once email sending is on." if not smtp_ok else ".")) if owner else "Off. Set owner_copy to your email.",
         "todo": [] if owner else ["Run: python tools/setup-config.py and enter your email when it asks."]},
        {"name": "AI answers in UAply Assistant (optional)", "ok": _real(cfg.get("anthropic_api_key"), ("optional", "sk-ant-...")) and str(cfg.get("anthropic_api_key")).startswith("sk-ant-"),
         "detail": "Without a key the assistant answers with the best matching help article.", "todo": []},
    ]


def save_google(payload):
    """The "Connect Google" box: save the public Google client ID into the git-ignored uaply-config.json on this computer. Returns (status, body)."""
    cid = (payload.get("client_id") if isinstance(payload.get("client_id"), str) else "").strip()
    if not CLIENT_RE.match(cid):
        return 400, {"ok": False, "message": "That does not look like a Google client ID. It ends in .apps.googleusercontent.com and starts with numbers and a dash."}
    try:
        with open(uaply_api.CONFIG_PATH, encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        cfg = {}
    g = cfg.get("google") if isinstance(cfg.get("google"), dict) else {}
    g["client_id"] = cid
    cfg["google"] = g
    tmp = uaply_api.CONFIG_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline=chr(10)) as f:
        json.dump(cfg, f, indent=2)
    os.replace(tmp, uaply_api.CONFIG_PATH)
    return 200, {"ok": True, "saved": True, "message": "Saved. Reload the sign-in screen: Google's button should now appear."}


def _read_partners(path):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _write_partners(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline=chr(10)) as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def connections():
    """The connected hiring systems as (kind, board) pairs. Never the keys."""
    return sorted(jobs_api.ats_connections())


def save_ats(payload):
    """The "Connect an employer's hiring system" box: store the key the employer gave us in the git-ignored employer list on this computer. (status, body)."""
    kind = str(payload.get("kind") or "").strip().lower()
    board = str(payload.get("board") or "").strip()
    key = str(payload.get("api_key") or "").strip()
    if not ats_api.valid_connection(kind, board, key):
        return 400, {"ok": False, "message": "Choose Greenhouse or Lever, give the board name from the employer's job-board address (letters, numbers, - and _), and paste the key they created."}
    path = jobs_api.partners_file(for_writing=True)
    data = _read_partners(path)
    keep = [c for c in (data.get("ats_connections") or []) if isinstance(c, dict) and (c.get("kind"), c.get("board")) != (kind, board)]
    keep.append({"kind": kind, "board": board, "api_key": key})
    data["ats_connections"] = keep
    _write_partners(path, data)
    return 200, {"ok": True, "saved": True, "message": "Connected. Real %s postings from %s now say Apply instantly, and a swipe right sends the application into their system." % (kind.capitalize(), board)}


def remove_ats(payload):
    kind, board = str(payload.get("kind") or "").strip().lower(), str(payload.get("board") or "").strip()
    path = jobs_api.partners_file(for_writing=True)
    data = _read_partners(path)
    before = data.get("ats_connections") or []
    data["ats_connections"] = [c for c in before if isinstance(c, dict) and (c.get("kind"), c.get("board")) != (kind, board)]
    if len(data["ats_connections"]) != len(before):
        _write_partners(path, data)
    return 200, {"ok": True, "message": "Disconnected."}


def save_stripe(payload):
    """The "Connect Stripe" box: save the Stripe keys and the two price ids into the git-ignored uaply-config.json on this computer. (status, body)."""
    g = lambda k: (payload.get(k) if isinstance(payload.get(k), str) else "").strip()
    key, wh, plus, pro = g("secret_key"), g("webhook_secret"), g("price_plus"), g("price_pro")
    if not re.match(r"^sk_(test|live)_[A-Za-z0-9]{8,}$", key):
        return 400, {"ok": False, "message": "The secret key starts with sk_test_ (test mode) or sk_live_. Find it in Stripe, Developers, API keys."}
    if not (plus.startswith("price_") and pro.startswith("price_")):
        return 400, {"ok": False, "message": "Paste the two price ids (they start with price_) of the monthly Plus and Pro prices you made in Stripe, Product catalog."}
    if wh and not wh.startswith("whsec_"):
        return 400, {"ok": False, "message": "The webhook signing secret starts with whsec_."}
    try:
        with open(uaply_api.CONFIG_PATH, encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        cfg = {}
    old = cfg.get("stripe") if isinstance(cfg.get("stripe"), dict) else {}
    cfg["stripe"] = {"secret_key": key, "webhook_secret": wh or old.get("webhook_secret", ""), "price_plus": plus, "price_pro": pro}
    tmp = uaply_api.CONFIG_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline=chr(10)) as f:
        json.dump(cfg, f, indent=2)
    os.replace(tmp, uaply_api.CONFIG_PATH)
    return 200, {"ok": True, "saved": True, "message": "Saved. Plus and Pro can now be bought in Profile, Plan" + ("" if cfg["stripe"]["webhook_secret"] else "; add the webhook signing secret so plans switch on after payment") + "."}


BREVO_KEY_RE = re.compile(r"^xsmtpsib-[A-Za-z0-9-]{20,200}$")


def save_mail(payload):
    """The "Connect email" form: save how UAply sends email into the git-ignored uaply-config.json on this computer, then send a test.
    Gmail: the Gmail address and its App Password. Brevo: the address mail comes from (one whose domain Brevo has verified, such as
    an @uaply.net address), Brevo's SMTP login and an SMTP key. The password or key is never echoed back and never goes anywhere
    except that provider's own mail server. Returns (status, body)."""
    provider = "brevo" if payload.get("provider") == "brevo" else "gmail"
    addr = payload.get("email") if isinstance(payload.get("email"), str) else ""
    pw = "".join((payload.get("password") if isinstance(payload.get("password"), str) else "").split())      # Google shows it in groups of four
    login = (payload.get("login") if isinstance(payload.get("login"), str) else "").strip()
    copy_to = payload.get("copy_to") if isinstance(payload.get("copy_to"), str) else ""
    if not uaply_api.EMAIL_RE.match(addr.strip()):
        return 400, {"ok": False, "message": ("Enter the address UAply's email comes from, such as uaplytechnologies@uaply.net." if provider == "brevo"
                                              else "Enter the Gmail address that will send UAply's email.")}
    if provider == "brevo":
        if not uaply_api.EMAIL_RE.match(login):
            return 400, {"ok": False, "message": "Enter the SMTP login from Brevo (SMTP & API, SMTP tab). It looks like an email address ending in @smtp-brevo.com."}
        if not BREVO_KEY_RE.match(pw):
            return 400, {"ok": False, "message": "That does not look like a Brevo SMTP key. In Brevo, open SMTP & API, SMTP tab, and generate a new SMTP key (it starts with xsmtpsib-)."}
    elif not (12 <= len(pw) <= 64) or not pw.isalnum():
        return 400, {"ok": False, "message": "That does not look like a Gmail App Password (16 letters, shown in four groups). Create one at myaccount.google.com/apppasswords."}
    if copy_to.strip() and not uaply_api.EMAIL_RE.match(copy_to.strip()):
        return 400, {"ok": False, "message": "The address for copies is not a valid email."}
    try:
        with open(uaply_api.CONFIG_PATH, encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        cfg = {}
    smtp = cfg.get("smtp") if isinstance(cfg.get("smtp"), dict) else {}
    if provider == "brevo":
        smtp.update({"host": "smtp-relay.brevo.com", "port": 587, "starttls": True, "user": login, "from_addr": addr.strip(), "password": pw})
    else:
        smtp.update({"host": "smtp.gmail.com", "port": 587, "starttls": True, "user": addr.strip(), "from_addr": addr.strip(), "password": pw})
    cfg["smtp"] = smtp
    if copy_to.strip():
        cfg["owner_copy"] = copy_to.strip()
    tmp = uaply_api.CONFIG_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline=chr(10)) as f:
        json.dump(cfg, f, indent=2)
    os.replace(tmp, uaply_api.CONFIG_PATH)
    status, out = test_mail()
    out["saved"] = True
    return status, out


def test_mail():
    """Send one email to the owner. Returns (status, body)."""
    cfg = uaply_api.config()
    s = cfg.get("smtp") if isinstance(cfg.get("smtp"), dict) else {}
    to = uaply_api._owner_copy(cfg) or (s.get("from_addr") or "")
    if not (s.get("host") and s.get("from_addr")):
        return 200, {"ok": False, "message": "Email sending is not set up yet. Run python tools/setup-config.py first."}
    if not uaply_api.mail_ready():
        return 200, {"ok": False, "message": "Email sending has no password or key yet. Add one in the Connect email box on this page."}
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
    except smtplib.SMTPAuthenticationError as e:
        if "brevo" in (s.get("host") or ""):
            why = (" Brevo may be blocking this computer's internet address: in Brevo, open Security, Authorized IPs, and allow it (or turn off IP blocking for SMTP)."
                   if "525" in str(e) or "ip" in str(e).lower() else "")
            return 200, {"ok": False, "message": "Brevo refused the login. Check the SMTP login and key in Brevo (SMTP & API, SMTP tab)." + why}
        return 200, {"ok": False, "message": "Gmail refused the login. Use an App Password (not your normal password), with 2-Step Verification on."}
    except smtplib.SMTPServerDisconnected:
        return 200, {"ok": False, "message": "The mail server closed the connection. Check the host and port, and that the App Password is right."}
    except (OSError, smtplib.SMTPException) as e:
        return 200, {"ok": False, "message": "Could not send: " + type(e).__name__}
    return 200, {"ok": True, "message": "Sent to " + to + ". Check that inbox."}


def page(host, proto):
    e = html.escape
    rows = []
    found = checks(host, proto)
    for c in found:
        todo = "".join("<li>%s</li>" % _linkify(t) for t in c["todo"])
        rows.append('<article><header><span class="b %s">%s</span><b>%s</b></header><p class="m">%s</p>%s</article>' % (
            "ok" if c["ok"] else "no", "ON" if c["ok"] else "TO DO", e(c["name"]), e(c["detail"]), ("<ol>%s</ol>" % todo) if todo else ""))
    if not (found[0]["ok"] and found[1]["ok"]):          # Google sign-in and real email are the two things that turn test mode into the real thing
        rows.insert(0, '<article><b>Why you still see the test inbox and a test sign-in</b><p class="m">Until the first two items below are connected, this computer cannot show Google\'s real account chooser '
                       'and cannot send real email, so sign-up codes and receipts are saved in the <a href="/outbox">test inbox</a> instead. Connect both and the app behaves like the live site: '
                       'Google\'s own "Continue with Google" button, and real emails in real inboxes.</p></article>')
    conn_html = "".join('<p class="m">%s / %s <button type="button" class="rm" data-k="%s" data-b="%s">Disconnect</button></p>' % (e(k.capitalize()), e(b), e(k), e(b)) for k, b in connections()).replace("%", "%%")
    origin_html = "".join('<p><code>%s</code> <button type="button" class="cp" data-v="%s">Copy</button></p>' % (e(o), e(o)) for o in origins(host, proto)).replace("%", "%%")
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
<article id="google"><b>Connect Google sign-in</b><p class="m">Google needs to be told which addresses may show its button. Add each of these under Authorized JavaScript origins:</p>@@ORIGINS@@
<p class="m">Then paste the Client ID from Google Cloud Console (the long address ending in .apps.googleusercontent.com). It is public, so it is safe to paste here. It is saved only on this computer.</p>
<p><input id="gi" type="text" placeholder="123456789-abc.apps.googleusercontent.com" style="width:340px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><button id="gs" type="button">Save Google client ID</button> <span id="gr" class="m" role="status"></span></p></article>
<article id="gmail"><b>Connect email (Brevo or Gmail)</b><p class="m">How UAply sends sign-up codes, receipts and applications. <b>Brevo</b> sends from your own domain (for example uaplytechnologies@uaply.net): paste that address, Brevo's SMTP login and an SMTP key from Brevo, SMTP &amp; API, SMTP tab. <b>Gmail</b>: paste the Gmail address and its App Password (a 16-letter code from myaccount.google.com/apppasswords, not your normal password). It is saved only in uaply-config.json on this computer, which is never uploaded, and a test email is sent right away.</p>
<p><select id="gv" aria-label="Email provider" style="padding:8px;border:1px solid var(--line);border-radius:8px"><option value="brevo">Brevo (your own domain)</option><option value="gmail">Gmail</option></select></p>
<p><input id="ge" type="email" placeholder="Send from, e.g. uaplytechnologies@uaply.net" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p id="glw"><input id="gl" type="text" placeholder="Brevo SMTP login (ends in @smtp-brevo.com)" autocomplete="off" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><input id="gp" type="password" placeholder="Brevo SMTP key or Gmail App Password" autocomplete="off" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><input id="gc" type="email" placeholder="Send copies and tests to (optional)" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><button id="sv" type="button">Save and send a test email</button> <span id="sr" class="m" role="status"></span></p></article>
<article id="ats"><b>Connect an employer's hiring system</b><p class="m">For an employer that uses Greenhouse or Lever and gave you the key they created. Their real postings then say <b>Apply instantly</b>. The key is saved only in uaply-partners.json on this computer and is never shown again.</p>
<p><select id="ak" style="padding:8px;border:1px solid var(--line);border-radius:8px"><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option></select>
<input id="ab" type="text" placeholder="Board name, e.g. acme" style="width:200px;max-width:50vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><input id="aa" type="password" placeholder="The employer's API key" autocomplete="off" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><button id="as" type="button">Connect</button> <span id="ar" class="m" role="status"></span></p>
@@CONNS@@</article>
<article id="billing"><b>Connect Stripe (Plus and Pro)</b><p class="m">Saved only in uaply-config.json on this computer. Card numbers never reach UAply; people pay on Stripe's page.</p>
<p><input id="ss" type="password" placeholder="Secret key sk_test_..." autocomplete="off" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><input id="sw" type="password" placeholder="Webhook signing secret whsec_..." autocomplete="off" style="width:280px;max-width:90vw;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><input id="sp1" type="text" placeholder="Plus price id price_..." style="width:200px;padding:8px;border:1px solid var(--line);border-radius:8px"> <input id="sp2" type="text" placeholder="Pro price id price_..." style="width:200px;padding:8px;border:1px solid var(--line);border-radius:8px"></p>
<p><button id="sb" type="button">Save Stripe</button> <span id="sbr" class="m" role="status"></span></p></article>
<article><b>Send a test email</b><p class="m">Sends one message to your copy address so you can see that real email works.</p>
<p><button id="t" type="button">Send test email</button> <span id="r" class="m" role="status"></span></p></article>
<p class="m">%d accounts and %d emails recorded on this server. <a href="/outbox">Test inbox</a></p></main>
<script>document.getElementById('t').onclick=function(){var r=document.getElementById('r');r.textContent='Sending...';
fetch('/api/setup/test-mail',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(function(x){return x.json()}).then(function(j){r.textContent=j.message||j.error||'Done'}).catch(function(){r.textContent='Could not reach the server.'})}
document.getElementById('gs').onclick=function(){var r=document.getElementById('gr');r.textContent='Saving...';
fetch('/api/setup/save-google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:document.getElementById('gi').value})}).then(function(x){return x.json()}).then(function(j){r.textContent=j.message||j.error||'Done'}).catch(function(){r.textContent='Could not reach the server.'})}
document.getElementById('sv').onclick=function(){var r=document.getElementById('sr'),g=function(i){return document.getElementById(i).value};r.textContent='Saving...';
fetch('/api/setup/save-mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:g('gv'),email:g('ge'),login:g('gl'),password:g('gp'),copy_to:g('gc')})}).then(function(x){return x.json()}).then(function(j){if(j.saved)document.getElementById('gp').value='';r.textContent=j.message||j.error||'Done'}).catch(function(){r.textContent='Could not reach the server.'})}
;(function(){var v=document.getElementById('gv'),w=document.getElementById('glw');function sync(){w.hidden=v.value!=='brevo'}v.onchange=sync;sync()})();
document.getElementById('as').onclick=function(){var r=document.getElementById('ar'),g=function(i){return document.getElementById(i).value};r.textContent='Saving...';
fetch('/api/setup/save-ats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:g('ak'),board:g('ab'),api_key:g('aa')})}).then(function(x){return x.json()}).then(function(j){if(j.saved){document.getElementById('aa').value='';setTimeout(function(){location.reload()},900)}r.textContent=j.message||j.error||'Done'}).catch(function(){r.textContent='Could not reach the server.'})}
document.querySelectorAll('.rm').forEach(function(b){b.onclick=function(){fetch('/api/setup/remove-ats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:b.getAttribute('data-k'),board:b.getAttribute('data-b')})}).then(function(){location.reload()})}})
document.getElementById('sb').onclick=function(){var r=document.getElementById('sbr'),g=function(i){return document.getElementById(i).value};r.textContent='Saving...';
fetch('/api/setup/save-stripe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret_key:g('ss'),webhook_secret:g('sw'),price_plus:g('sp1'),price_pro:g('sp2')})}).then(function(x){return x.json()}).then(function(j){if(j.saved){document.getElementById('ss').value='';document.getElementById('sw').value=''}r.textContent=j.message||j.error||'Done'}).catch(function(){r.textContent='Could not reach the server.'})}
document.querySelectorAll('.cp').forEach(function(b){b.onclick=function(){var v=b.getAttribute('data-v');(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(function(){b.textContent='Copied'},function(){b.textContent='Select the address and copy it'})}})</script>
</body></html>""".replace("@@ORIGINS@@", origin_html).replace("@@CONNS@@", conn_html) % ("".join(rows), n["users"], n["mail"])).encode("utf-8")
