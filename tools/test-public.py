"""Tests the server the way a real host runs it: public (HOST=0.0.0.0), behind an HTTPS proxy, with an owner password.
  HOST=0.0.0.0 OWNER_PASSWORD=ownerpw UAPLY_DATA_DIR=<empty folder> python serve.py 8772 dev --api
  python tools/test-public.py [port]"""
import base64
import http.client
import json
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8772
HOST = "uaply.example"
R = []


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


def req(method, path, body=None, headers=None, proto="https", host=HOST, origin=True):
    h = {"Host": host, "X-Forwarded-Proto": proto, "X-Forwarded-For": "203.0.113.7"}
    if origin:
        h["Origin"] = "%s://%s" % (proto, host)
    h.update(headers or {})
    if body is not None:
        h["Content-Type"] = "application/json"
    c = http.client.HTTPConnection("127.0.0.1", PORT, timeout=30)
    c.request(method, path, body=json.dumps(body) if body is not None else None, headers=h)
    r = c.getresponse()
    data = r.read()
    out = (r.status, {k.lower(): v for k, v in r.getheaders()}, data)
    c.close()
    return out


def auth(pw):
    return {"Authorization": "Basic " + base64.b64encode(b"owner:" + pw.encode()).decode()}


t("health check answers (the host uses it)", req("GET", "/healthz")[0], 200)
s, h, _ = req("POST", "/api/auth/signup", {"email": "pub1@example.com", "password": "correct horse 99", "agree": True})
t("sign-up works behind the HTTPS proxy", s, 200)
cookie = h.get("set-cookie", "")
t("session cookie is HttpOnly, Secure and SameSite=Lax", all(x in cookie for x in ("HttpOnly", "Secure", "SameSite=Lax")), True)
t("HSTS header is sent over HTTPS", "strict-transport-security" in h, True)
t("no-sniff and frame protection headers are sent", "x-content-type-options" in h and h.get("x-frame-options") == "SAMEORIGIN", True)
t("a cross-site sign-up is refused", req("POST", "/api/auth/signup", {"email": "pub2@example.com", "password": "correct horse 99", "agree": True},
                                         headers={"Origin": "https://evil.example"})[0], 403)
t("a request with no Origin is refused", req("POST", "/api/auth/login", {"email": "a@b.co", "password": "x"}, origin=False)[0], 403)

for path in ("/outbox", "/api/outbox", "/feedback", "/setup"):
    t("%s needs the owner password" % path, req("GET", path)[0], 401)
    t("%s refuses a wrong password" % path, req("GET", path, headers=auth("nope"))[0], 401)
    t("%s opens with the owner password" % path, req("GET", path, headers=auth("ownerpw"))[0], 200)
t("the test-mail button needs the owner password", req("POST", "/api/setup/test-mail", {})[0], 403)
t("the test-mail button works for the owner", req("POST", "/api/setup/test-mail", {}, headers=auth("ownerpw"))[0], 200)
t("the Connect Gmail form is refused on a hosted server (secrets live in the host dashboard)", req("POST", "/api/setup/save-mail", {"email": "a@gmail.com", "password": "abcdefghijklmnop"}, headers=auth("ownerpw"))[0], 403)
t("the Connect Gmail form needs the owner password", req("POST", "/api/setup/save-mail", {})[0], 403)

# nothing outside the site folder can be read
for p in ("/../serve.py", "/..%2fserve.py", "/%2e%2e/serve.py", "/legal/../serve.py", "/legal/..%2f..%2fserve.py", "/../uaply-config.json", "/data/uaply.db"):
    s, _, body = req("GET", p)
    t("path %s leaks nothing" % p, s != 200 or b"import " not in body and b"smtp" not in body.lower(), True)
t("a made-up path is a plain 404", req("GET", "/nope.html")[0], 404)
t("POST to an unknown path is refused", req("POST", "/api/secret", {})[0], 404)
t("oversized body is refused", req("POST", "/api/auth/login", {"email": "a@b.co", "password": "x" * 50000})[0], 413)

# a public server with no email login must say so, not promise a link it cannot send (tools/test-smtp.py covers real sending)
s, h, body = req("POST", "/api/auth/forgot", {"email": "pub1@example.com"})
out = json.loads(body)
t("forgot says email is unavailable instead of promising a link", (s, out.get("delivery"), out.get("ok")), (200, "unavailable", False))
page = req("GET", "/outbox", headers=auth("ownerpw"))[2].decode("utf-8")
t("no reset link was created or stored", "?reset=" not in page.replace("&amp;", "&"), True)

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
