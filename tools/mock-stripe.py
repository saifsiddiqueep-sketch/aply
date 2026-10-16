"""A stand-in for the parts of the Stripe API UAply uses (Checkout sessions, subscriptions, billing portal), for tests.
  python tools/mock-stripe.py 8798      Secret key accepted: sk_test_mockkey123456. Created sessions are listed at /__sessions."""
import json
import sys
import urllib.parse
import http.server

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8798
KEY = "sk_test_mockkey123456"
SESSIONS, SUBS = [], {}


class H(http.server.BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _auth(self):
        return self.headers.get("Authorization") == "Bearer " + KEY

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/__sessions":
            return self._json(200, SESSIONS)
        if u.path.startswith(("/pay/", "/portal/")):          # what the person sees on Stripe's own page (a simple stand-in)
            last = SESSIONS[-1] if SESSIONS else {}
            body = ("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font:16px Arial;margin:0;background:#f6f9fc'>"
                    "<div style='background:#635bff;color:#fff;padding:14px 18px;font-weight:700'>Stripe Checkout (stand-in, test mode)</div><div style='padding:18px'>"
                    "<p style='color:#555'>Subscribe to UAply</p><h2 style='margin:4px 0'>%s</h2><p>%s</p>"
                    "<div style='border:1px solid #ddd;border-radius:8px;padding:12px;background:#fff;color:#888'>Card number 4242 4242 4242 4242 (Stripe test card)</div>"
                    "<p style='margin-top:14px'><span style='background:#635bff;color:#fff;padding:12px 20px;border-radius:8px;display:inline-block'>Subscribe</span></p></div>") % (
                "Plus, $9.99 per month" if last.get("metadata[plan]") == "plus" else "Pro, $19.99 per month", last.get("customer_email", ""))
            b = body.encode()
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
            return
        if not self._auth():
            return self._json(401, {"error": {"message": "Invalid API key"}})
        if u.path.startswith("/v1/subscriptions/"):
            sid = u.path.rsplit("/", 1)[1]
            return self._json(200, SUBS[sid]) if sid in SUBS else self._json(404, {"error": {"message": "No such subscription"}})
        return self._json(404, {})

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        n = int(self.headers.get("Content-Length") or 0)
        params = {k: v[0] for k, v in urllib.parse.parse_qs(self.rfile.read(n).decode()).items()}
        if u.path == "/__subscription":                       # the test creates the subscription Stripe would make after payment
            SUBS[params["id"]] = json.loads(params["json"])
            return self._json(200, {"ok": True})
        if not self._auth():
            return self._json(401, {"error": {"message": "Invalid API key"}})
        if u.path == "/v1/checkout/sessions":
            sid = "cs_test_%d" % (len(SESSIONS) + 1)
            SESSIONS.append(dict(params, id=sid))
            return self._json(200, {"id": sid, "url": "http://127.0.0.1:%d/pay/%s" % (PORT, sid)})
        if u.path == "/v1/billing_portal/sessions":
            return self._json(200, {"id": "bps_1", "url": "http://127.0.0.1:%d/portal/%s" % (PORT, params.get("customer", ""))})
        return self._json(404, {})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
