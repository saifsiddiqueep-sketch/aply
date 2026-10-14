"""Tiny static server: python serve.py PORT ROOT [--api] [urlpath=file ...]
Serves ROOT; each urlpath=file alias maps one URL to a file outside ROOT (e.g. /prod-index.html to prod/index.html).
--api also exposes the back end used by sandbox and dev (prod does not):
  GET  /api/jobs          real postings (jobs_api.py)
  GET  /api/apply/config  delivery mode
  POST /api/apply         swipe right: deliver an application (uaply_api.py)
  POST /api/decision      swipe left or right: record the swipe
  GET  /outbox            simulated recruiter inbox + swipe stats   (/api/outbox for JSON)
  GET  /api/auth/me       the signed-in account, or null (auth_api.py)
  POST /api/auth/signup   create an account (email + password) and sign in
  POST /api/auth/login    sign in
  POST /api/auth/logout   sign out
  POST /api/auth/delete   delete the signed-in account (password required, or typing DELETE for a Google-only account)
  POST /api/auth/forgot   email a password reset link (the answer never says whether the email has an account)
  POST /api/auth/reset    set a new password from a reset link
  POST /api/auth/change-password   signed in: change the password (needs the current one)
  GET  /setup             owner checklist: Google keys, email login, test email (setup_api.py)
  POST /api/setup/test-mail   send the owner one test email
  POST /api/setup/save-mail   the Connect Gmail form (this computer only): save the Gmail address and App Password, then send a test
  GET  /api/auth/providers      which sign-in methods are on (google_auth.py)
  GET  /api/auth/google/start   "Continue with Google": send the browser to Google
  GET  /api/auth/google/callback  Google returns here; signs the person in and goes back to the app
  GET  /api/chat/config   whether the assistant's AI answers are on (chat_api.py)
  POST /api/chat          UAply Assistant: answer a support question from the help articles
  POST /api/feedback      store feedback sent through the assistant
  GET  /feedback          the feedback summary page (this server only listens on this computer)
  GET  /help/articles.json  the help articles the assistant answers from
Accounts use an HttpOnly session cookie. When a signed-in user swipes right, a receipt goes to their email."""
import sys, os, json, http.server, http.cookies, base64, hmac

port = int(sys.argv[1])
# Locally the server only listens on this computer. A host sets HOST=0.0.0.0 so the public can reach it (always behind HTTPS).
BIND = os.environ.get("HOST", "127.0.0.1")
PUBLIC = BIND not in ("127.0.0.1", "localhost", "::1")
# Owner-only pages (/outbox, /feedback) need this password when the server is public. Without it they are switched off.
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "")
OWNER_PAGES = ("/outbox", "/api/outbox", "/feedback", "/setup")
root = os.path.abspath(sys.argv[2])
rest = sys.argv[3:]
api = "--api" in rest
alias = {}
for a in rest:
    if a == "--api":
        continue
    u, f = a.split("=", 1)
    alias[u] = os.path.abspath(f)

HERE = os.path.dirname(os.path.abspath(__file__))
if api:
    # the sandbox and dev pages load these shared files and a copy of the production page; no command-line aliases needed
    for url, rel in (("/uaply-envs.js", "shared/uaply-envs.js"), ("/uaply-nav.js", "shared/uaply-nav.js"),
                     ("/uaply-live.js", "shared/uaply-live.js"), ("/uaply-profile.js", "shared/uaply-profile.js"),
                     ("/uaply-chat.js", "shared/uaply-chat.js"), ("/help/articles.json", "help/articles.json"),
                     ("/prod-index.html", "prod/index.html")):
        alias.setdefault(url, os.path.join(HERE, rel))
    import jobs_api, uaply_api, auth_api, chat_api, google_auth, setup_api
    uaply_api.init(os.path.basename(root))
    auth_api.init(os.path.basename(root))
    chat_api.init(os.path.basename(root))
    import threading
    threading.Thread(target=jobs_api.get_jobs, daemon=True).start()   # warm the job cache so the first visitor does not wait

MAX_BODY = 40000
MAX_APPLY_BODY = 1500000

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=root, **k)

    def translate_path(self, path):
        p = path.split("?", 1)[0].split("#", 1)[0]
        if api and p.startswith("/legal/") and ".." not in p:           # Terms, Privacy, AI disclosure, Copyright
            return os.path.join(HERE, "legal", p[len("/legal/"):] or "index.html")
        return alias.get(p) or super().translate_path(path)

    def _send(self, code, body, ctype="application/json", headers=()):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _token(self):
        """The session token from this instance's cookie ('' if there is none)."""
        try:
            jar = http.cookies.SimpleCookie(self.headers.get("Cookie") or "")
            return jar[auth_api.cookie_name()].value if auth_api.cookie_name() in jar else ""
        except Exception:
            return ""

    def _cookie(self, token):
        secure = "; Secure" if (self.headers.get("X-Forwarded-Proto") == "https") else ""
        age = auth_api.SESSION_SECONDS if token else 0
        return [("Set-Cookie", "%s=%s; HttpOnly; SameSite=Lax; Path=/; Max-Age=%d%s" % (auth_api.cookie_name(), token, age, secure))]

    def _origin_parts(self):
        host = self.headers.get("Host") or "localhost"
        return host, ("https" if self.headers.get("X-Forwarded-Proto") == "https" else "http")

    def _site_base(self):
        """The public address of this site, for links in emails."""
        cfg = uaply_api.config()
        g = cfg.get("google") if isinstance(cfg.get("google"), dict) else {}
        for v in (cfg.get("public_url"), g.get("public_url")):
            if isinstance(v, str) and v.startswith(("http://", "https://")):
                return v.rstrip("/")
        host, proto = self._origin_parts()
        return "%s://%s" % (proto, host)

    def _redirect(self, where, headers=()):
        self.send_response(302)
        self.send_header("Location", where)
        self.send_header("Content-Length", "0")
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()

    def _oauth_cookie(self, value):
        secure = "; Secure" if (self.headers.get("X-Forwarded-Proto") == "https") else ""
        return ("Set-Cookie", "%s_oauth=%s; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=%d%s" % (
            auth_api.cookie_name(), value, 600 if value else 0, secure))

    def _google(self, p):
        """The two redirects of "Continue with Google"."""
        import urllib.parse
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        host, proto = self._origin_parts()
        if p == "/api/auth/google/start":
            url, state = google_auth.start(host, proto, (q.get("agree") or [""])[0] == "1")
            if not url:
                return self._redirect("/?auth_error=off")
            return self._redirect(url, [self._oauth_cookie(state)])
        jar = http.cookies.SimpleCookie(self.headers.get("Cookie") or "")
        cname = auth_api.cookie_name() + "_oauth"
        err, ident, agreed = google_auth.finish(q, jar[cname].value if cname in jar else "", host, proto)
        if err:
            return self._redirect("/?auth_error=" + err, [self._oauth_cookie("")])
        err, user, token = auth_api.oauth_login(ident["provider"], ident["subject"], ident["email"], agreed)
        if err:
            return self._redirect("/?auth_error=" + err, [self._oauth_cookie("")])
        return self._redirect("/?signed_in=google", self._cookie(token) + [self._oauth_cookie("")])

    def _owner_ok(self):
        """Owner pages: open on this computer; on a public server only with OWNER_PASSWORD (any username)."""
        if not PUBLIC:
            return True
        if not OWNER_PASSWORD:
            return False
        try:
            kind, val = (self.headers.get("Authorization") or "").split(" ", 1)
            pw = base64.b64decode(val).decode("utf-8").split(":", 1)[1] if kind == "Basic" else ""
        except Exception:
            pw = ""
        return hmac.compare_digest(pw.encode(), OWNER_PASSWORD.encode())

    def do_GET(self):
        p = self.path.split("?", 1)[0]
        if p == "/healthz":                                                 # for the host's health check
            return self._send(200, {"ok": True})
        if api and p in OWNER_PAGES and not self._owner_ok():
            if not OWNER_PASSWORD:
                return self._send(403, {"error": "Owner pages are off on this server. Set OWNER_PASSWORD to use them."})
            return self._send(401, {"error": "Owner password required."}, headers=[("WWW-Authenticate", 'Basic realm="UAply owner"')])
        if api:
            try:
                if p == "/api/jobs":
                    return self._send(200, jobs_api.get_json())
                if p == "/api/apply/config":
                    cfg_out = uaply_api.public_config()
                    if not PUBLIC:                          # only a copy running on the owner's computer has a test inbox page to point to
                        cfg_out["testInbox"] = "/outbox"
                    return self._send(200, cfg_out)
                if p == "/api/outbox":
                    return self._send(200, uaply_api.outbox_json())
                if p == "/outbox":
                    return self._send(200, uaply_api.outbox_html(), "text/html; charset=utf-8")
                if p == "/api/auth/me":
                    return self._send(200, {"user": auth_api.user_for(self._token())})
                if p == "/api/auth/providers":
                    return self._send(200, google_auth.public_config(*self._origin_parts()))
                if p in ("/api/auth/google/start", "/api/auth/google/callback"):
                    return self._google(p)
                if p == "/api/chat/config":
                    return self._send(200, chat_api.public_config())
                if p == "/feedback":
                    return self._send(200, chat_api.feedback_html(), "text/html; charset=utf-8")
                if p == "/setup":
                    return self._send(200, setup_api.page(*self._origin_parts()), "text/html; charset=utf-8")
            except Exception as e:
                return self._send(502, {"error": str(e)[:100]})
        super().do_GET()

    def do_POST(self):
        p = self.path.split("?", 1)[0]
        if not api or p not in ("/api/apply", "/api/decision", "/api/auth/signup", "/api/auth/login", "/api/auth/logout",
                                "/api/auth/delete", "/api/auth/forgot", "/api/auth/reset", "/api/auth/change-password",
                                "/api/setup/test-mail", "/api/setup/save-mail", "/api/chat", "/api/feedback"):
            return self._send(404, {"error": "not found"})
        # Only accept requests made by this site's own pages (blocks cross-site forms and scripts).
        origin = self.headers.get("Origin")
        host = self.headers.get("Host") or ""
        if origin not in ("http://" + host, "https://" + host) or (PUBLIC and origin != "https://" + host and
                                                                  self.headers.get("X-Forwarded-Proto") == "https"):
            return self._send(403, {"error": "cross-site request refused"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > (MAX_APPLY_BODY if p == "/api/apply" else MAX_BODY):         # an application may carry a resume file (up to 1 MB, sent as text)
                return self._send(413, {"error": "bad size"})
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("not an object")
        except Exception:
            return self._send(400, {"error": "bad request"})
        ip = self.client_address[0]
        if PUBLIC and self.headers.get("X-Forwarded-For"):          # behind the host's proxy: the visitor's own address
            ip = self.headers["X-Forwarded-For"].split(",")[0].strip()[:64] or ip
        try:
            if p == "/api/auth/signup":
                code, out, token = auth_api.signup(payload.get("email"), payload.get("password"), ip, payload.get("agree"))
                return self._send(code, out, headers=self._cookie(token) if token else ())
            if p == "/api/auth/login":
                code, out, token = auth_api.login(payload.get("email"), payload.get("password"), ip)
                return self._send(code, out, headers=self._cookie(token) if token else ())
            if p == "/api/setup/save-mail":
                if not self._owner_ok():
                    return self._send(403, {"error": "Owner pages are off or need the owner password."})
                if PUBLIC:                                      # a hosted server keeps its secrets in its dashboard, not in a file the page can write
                    return self._send(403, {"ok": False, "message": "On a hosted server, add the email settings in the host's dashboard (UAPLY_CONFIG_JSON), not here."})
                code, out = setup_api.save_mail(payload)
                return self._send(code, out)
            if p == "/api/setup/test-mail":
                if not self._owner_ok():
                    return self._send(403, {"error": "Owner pages are off or need the owner password."})
                code, out = setup_api.test_mail()
                return self._send(code, out)
            if p == "/api/auth/forgot":
                if PUBLIC and not uaply_api.mail_ready():       # a real server that cannot send email must not pretend to
                    return self._send(200, {"ok": False, "delivery": "unavailable",
                                            "message": "Password reset by email is not available right now. Use Help, then Talk to a person, and we will help you get back in."})
                code, out, mail = auth_api.request_reset(payload.get("email"), ip)
                if mail:
                    uid, addr, tok = mail
                    link = self._site_base() + "/?reset=" + tok
                    body = ("Hi,\n\nSomeone asked to reset the password for this UAply account. Use this link within one hour:\n\n%s\n\n"
                            "If you did not ask for this, ignore this email; your password has not changed.\n\n--\nUAply") % link
                    status = uaply_api.send_system_mail(uid, addr, "Reset your UAply password", body, secret=True)
                    out = dict(out, delivery=status)
                else:
                    out = dict(out, delivery=("sent" if uaply_api.mail_ready() else "delivered_test"))
                return self._send(code, out)
            if p == "/api/auth/reset":
                code, out = auth_api.reset_password(payload.get("token"), payload.get("password"), ip)
                return self._send(code, out, headers=self._cookie("") if code == 200 else ())
            if p == "/api/auth/change-password":
                code, out = auth_api.change_password(self._token(), payload.get("current"), payload.get("password"), ip)
                return self._send(code, out)
            if p == "/api/auth/logout":
                auth_api.logout(self._token())
                return self._send(200, {"ok": True}, headers=self._cookie(""))
            if p == "/api/auth/delete":
                code, out, uid = auth_api.delete_account(self._token(), payload.get("password"), ip, payload.get("confirm") or "")
                if uid:
                    out["applicationsRemoved"] = uaply_api.forget_user(uid)
                    chat_api.forget_user(uid)
                    return self._send(code, out, headers=self._cookie(""))
                return self._send(code, out)
            if p == "/api/chat":
                code, out = chat_api.chat(payload, ip)
            elif p == "/api/feedback":
                code, out = chat_api.feedback(payload, ip, auth_api.user_for(self._token()))
            elif p == "/api/apply":
                code, out = uaply_api.submit(payload, auth_api.user_for(self._token()))
            else:
                code, out = uaply_api.record_decision(payload)
        except Exception as e:
            code, out = 500, {"error": "server error: " + str(e)[:100]}
        self._send(code, out)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")               # the app frames itself; other sites may not
        if self.headers.get("X-Forwarded-Proto") == "https":
            self.send_header("Strict-Transport-Security", "max-age=31536000")
        super().end_headers()

    def log_message(self, fmt, *args):
        if not PUBLIC:                                                   # keep request logs out of a host's logs (they hold IPs)
            super().log_message(fmt, *args)

http.server.ThreadingHTTPServer((BIND, port), H).serve_forever()
