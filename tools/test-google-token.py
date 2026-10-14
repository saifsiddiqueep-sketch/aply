"""Tests "Continue with Google" the way Google's own button works: the page gets a signed token and posts it to UAply. Every kind of forged or wrong
token must be refused. Start tools/mock-google.py and a server configured for it (see tools/run-all-tests.sh), then:
  python tools/test-google-token.py [server_port]"""
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

PORT = sys.argv[1] if len(sys.argv) > 1 else "18768"
B = "http://127.0.0.1:%s" % PORT
M = "http://127.0.0.1:8790"
R = []


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(op, path, data=None, origin=True):
    h = {"Content-Type": "application/json"}
    if origin:
        h["Origin"] = B
    req = urllib.request.Request(B + path, data=json.dumps(data).encode() if data is not None else None, headers=h, method="POST" if data is not None else "GET")
    try:
        r = op.open(req)
        return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, None


def token(**q):
    qs = "&".join("%s=%s" % (k, urllib.parse.quote(str(v))) for k, v in q.items())
    return json.loads(urllib.request.urlopen(M + "/mock/idtoken?" + qs).read())["credential"]


def me(op):
    return call(op, "/api/auth/me")[1]["user"]


a = client()
s, prov = call(a, "/api/auth/providers")
t("the page is told Google's button is available and which client ID to use", (prov["google"], prov["googleClientId"]), (True, "test.apps.googleusercontent.com"))

# a good token
s, out = call(a, "/api/auth/google/token", {"credential": token(email="new.google@example.com", sub="9001"), "agree": True})
t("a valid token signs a new person in", (s, out["user"]["email"]), (200, "new.google@example.com"))
t("that account has no password and its email counts as verified", (out["user"]["hasPassword"], out["user"]["emailVerified"]), (False, True))
t("the session cookie works afterwards", (me(a) or {}).get("email"), "new.google@example.com")
call(a, "/api/auth/logout", {})
t("the same Google account signs in again without agreeing twice", call(a, "/api/auth/google/token", {"credential": token(email="new.google@example.com", sub="9001")})[0], 200)
call(a, "/api/auth/logout", {})

# consent for new accounts
b = client()
s, out = call(b, "/api/auth/google/token", {"credential": token(email="noconsent@example.com", sub="9002")})
t("a new person who has not agreed is told to tick the box", (s, out["code"], me(b)), (400, "agree", None))

# every kind of bad token
for bad in ("aud", "iss", "expired", "tamper", "none", "hs256", "kid", "future"):
    c = client()
    s, out = call(c, "/api/auth/google/token", {"credential": token(email="evil@example.com", sub="6666", bad=bad), "agree": True})
    t("a token that is wrong (%s) is refused and nobody is signed in" % bad, (s, out.get("code"), me(c)), (400, "failed", None))
for label, cred in (("garbage", "not.a.token"), ("empty", ""), ("a huge string", "a" * 9000), ("a number", 12345), ("nothing at all", None)):
    s, out = call(client(), "/api/auth/google/token", {"credential": cred, "agree": True})
    t("%s is refused" % label, s, 400)
s, out = call(client(), "/api/auth/google/token", {"credential": token(email="unverified@example.com", sub="9003", verified=0), "agree": True})
t("a Google email that Google says is not verified is refused", (s, out["code"]), (400, "unverified"))

# linking to an existing password account proves ownership of that email
pw = client()
call(pw, "/api/auth/signup", {"email": "linked@example.com", "password": "correct horse 99", "agree": True})
t("a new password account starts unverified", me(pw)["emailVerified"], False)
call(pw, "/api/auth/logout", {})
g = client()
s, out = call(g, "/api/auth/google/token", {"credential": token(email="linked@example.com", sub="9004")})
t("Google with the same verified email signs into that same account", (s, out["user"]["email"], out["user"]["hasPassword"]), (200, "linked@example.com", True))
t("...and that proves the email is theirs", me(g)["emailVerified"], True)

# the Google account id, not the email, identifies the person
call(g, "/api/auth/logout", {})
s, out = call(g, "/api/auth/google/token", {"credential": token(email="changed.address@example.com", sub="9004")})
t("the same Google id with a changed email is still the same account", out["user"]["email"], "linked@example.com")

# Google's button sets its own cookie (g_state) with quotes and commas in it; that must never sign anyone out
sess = client()
call(sess, "/api/auth/google/token", {"credential": token(email="cookie.test@example.com", sub="9010"), "agree": True})
cookie_val = [c for h in sess.handlers if hasattr(h, "cookiejar") for c in h.cookiejar if c.name.endswith("_session")][0]
req = urllib.request.Request(B + "/api/auth/me", headers={"Cookie": '%s=%s; g_state={"i_l":0,"i_ll":1791990000000,"i_b":"a,b;c"}; other="x,y"' % (cookie_val.name, cookie_val.value)})
t("a session still works when Google's own cookie is sent alongside it", json.loads(urllib.request.urlopen(req).read())["user"]["email"], "cookie.test@example.com")

# only this site's own pages may post
t("a cross-site post is refused", call(client(), "/api/auth/google/token", {"credential": token(email="x@example.com", sub="9005"), "agree": True}, origin=False)[0], 403)

# trying many tokens quickly is limited
last = 0
for i in range(35):
    last = call(client(), "/api/auth/google/token", {"credential": "junk.junk.junk"})[0]
t("hammering the endpoint is limited", last, 429)

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
