"""Tiny static server: python serve.py PORT ROOT [--api] [urlpath=file ...]
Serves ROOT; each urlpath=file alias maps one URL to a file outside ROOT (e.g. /prod-index.html to prod/index.html).
--api also exposes the back end used by sandbox and dev (prod does not):
  GET  /api/jobs          real postings (jobs_api.py)
  GET  /api/apply/config  delivery mode
  POST /api/apply         swipe right: deliver an application (apply_api.py)
  POST /api/decision      swipe left or right: record the swipe
  GET  /outbox            simulated recruiter inbox + swipe stats   (/api/outbox for JSON)
  GET  /api/auth/me       the signed-in account, or null (auth_api.py)
  POST /api/auth/signup   create an account (email + password) and sign in
  POST /api/auth/login    sign in
  POST /api/auth/logout   sign out
Accounts use an HttpOnly session cookie. When a signed-in user swipes right, a receipt goes to their email."""
import sys, os, json, http.server, http.cookies

port = int(sys.argv[1])
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
    for url, rel in (("/aply-envs.js", "shared/aply-envs.js"), ("/aply-nav.js", "shared/aply-nav.js"),
                     ("/aply-live.js", "shared/aply-live.js"), ("/prod-index.html", "prod/index.html")):
        alias.setdefault(url, os.path.join(HERE, rel))
    import jobs_api, apply_api, auth_api
    apply_api.init(os.path.basename(root))
    auth_api.init(os.path.basename(root))
    import threading
    threading.Thread(target=jobs_api.get_jobs, daemon=True).start()   # warm the job cache so the first visitor does not wait

MAX_BODY = 40000

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=root, **k)

    def translate_path(self, path):
        p = path.split("?", 1)[0].split("#", 1)[0]
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

    def do_GET(self):
        p = self.path.split("?", 1)[0]
        if api:
            try:
                if p == "/api/jobs":
                    return self._send(200, jobs_api.get_json())
                if p == "/api/apply/config":
                    return self._send(200, apply_api.public_config())
                if p == "/api/outbox":
                    return self._send(200, apply_api.outbox_json())
                if p == "/outbox":
                    return self._send(200, apply_api.outbox_html(), "text/html; charset=utf-8")
                if p == "/api/auth/me":
                    return self._send(200, {"user": auth_api.user_for(self._token())})
            except Exception as e:
                return self._send(502, {"error": str(e)[:100]})
        super().do_GET()

    def do_POST(self):
        p = self.path.split("?", 1)[0]
        if not api or p not in ("/api/apply", "/api/decision", "/api/auth/signup", "/api/auth/login", "/api/auth/logout"):
            return self._send(404, {"error": "not found"})
        # Only accept requests made by this site's own pages (blocks cross-site forms and scripts).
        origin = self.headers.get("Origin")
        if origin != "http://" + (self.headers.get("Host") or ""):
            return self._send(403, {"error": "cross-site request refused"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > MAX_BODY:
                return self._send(413, {"error": "bad size"})
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("not an object")
        except Exception:
            return self._send(400, {"error": "bad request"})
        ip = self.client_address[0]
        try:
            if p == "/api/auth/signup" or p == "/api/auth/login":
                fn = auth_api.signup if p.endswith("signup") else auth_api.login
                code, out, token = fn(payload.get("email"), payload.get("password"), ip)
                return self._send(code, out, headers=self._cookie(token) if token else ())
            if p == "/api/auth/logout":
                auth_api.logout(self._token())
                return self._send(200, {"ok": True}, headers=self._cookie(""))
            if p == "/api/apply":
                code, out = apply_api.submit(payload, auth_api.user_for(self._token()))
            else:
                code, out = apply_api.record_decision(payload)
        except Exception as e:
            code, out = 500, {"error": "server error: " + str(e)[:100]}
        self._send(code, out)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
