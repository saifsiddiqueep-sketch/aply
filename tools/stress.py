"""Hits a running server with many requests at once and reports errors and slow answers. Use a throwaway server, never your real one.
  python tools/stress.py 18795            (needs: python serve.py 18795 dev --api with its own UAPLY_DATA_DIR)
Checks: 300 simultaneous page and API reads, 24 simultaneous sign-ups from one address (each hashes a password; the anti-spam limit may refuse some
with 429, which is correct), and 24 simultaneous wrong-password logins for one real account (the lock-out must hold under pressure).
No request may come back as a server error or hang."""
import http.client
import json
import sys
import threading
import time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 18795
HOST = "127.0.0.1:%d" % PORT
R = []


def t(name, ok, extra=""):
    R.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + ("  " + extra if extra else ""))


def call(method, path, body=None):
    c = http.client.HTTPConnection("127.0.0.1", PORT, timeout=60)
    h = {"Origin": "http://" + HOST}
    data = None
    if body is not None:
        h["Content-Type"] = "application/json"
        data = json.dumps(body)
    t0 = time.time()
    try:
        c.request(method, path, body=data, headers=h)
        r = c.getresponse()
        r.read()
        return r.status, time.time() - t0
    except Exception as e:                                   # a hang or a dropped connection counts as a failure
        return "ERR %s" % type(e).__name__, time.time() - t0
    finally:
        c.close()


def burst(n, fn):
    out = [None] * n

    def run(i):
        out[i] = fn(i)
    th = [threading.Thread(target=run, args=(i,)) for i in range(n)]
    t0 = time.time()
    for x in th:
        x.start()
    for x in th:
        x.join()
    return out, time.time() - t0


paths = ["/", "/api/jobs", "/api/auth/me", "/api/auth/providers", "/api/apply/config", "/healthz", "/legal/privacy.html", "/uaply-nav.js"]
for round_no in (1, 2, 3):                                    # three bursts in a row: one lucky run must not hide refused connections
    res, took = burst(300, lambda i: call("GET", paths[i % len(paths)]))
    bad = [r for r in res if r[0] != 200]
    t("300 simultaneous reads all answer 200 (burst %d of 3)" % round_no, not bad, "(%d bad: %s) in %.1fs, slowest %.1fs" % (len(bad), sorted({str(b[0]) for b in bad}), took, max(r[1] for r in res)))

s, _ = call("POST", "/api/auth/signup", {"email": "victim@example.com", "password": "correct horse 99", "agree": True})
t("a real account to attack is created first", s == 200, "(got %s)" % s)
res, took = burst(24, lambda i: call("POST", "/api/auth/signup", {"email": "stress%d@example.com" % i, "password": "correct horse 99", "agree": True}))
codes = sorted({str(r[0]) for r in res})
ok200 = sum(1 for r in res if r[0] == 200)
t("24 simultaneous sign-ups from one address: only 200 or 429 (the spam limit), never an error or a locked database", set(codes) <= {"200", "429"}, "(%s) in %.1fs" % (", ".join(codes), took))
t("and the ones within the limit really were created", ok200 >= 5, "(%d created)" % ok200)

res, took = burst(24, lambda i: call("POST", "/api/auth/login", {"email": "victim@example.com", "password": "wrong password %d" % i}))
codes = sorted({str(r[0]) for r in res})
t("24 simultaneous wrong passwords: only 401 or 429, never a server error", set(codes) <= {"401", "429"}, "(%s)" % ", ".join(codes))
t("the lock-out held under pressure (at least some tries were refused with 429)", "429" in codes)
s, _ = call("POST", "/api/auth/login", {"email": "victim@example.com", "password": "correct horse 99"})
t("the right password is also held back during the lock-out (no way around it)", s == 429, "(got %s)" % s)
s, _ = call("GET", "/healthz")
t("the server still answers afterwards", s == 200)
print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
