"""End-to-end test of real email sending, using tools/fake-smtp.py. Run with a public-style server whose config has the fake SMTP:
  python tools/fake-smtp.py 2525 <dir>/mail.jsonl
  HOST=0.0.0.0 OWNER_PASSWORD=ownerpw UAPLY_DATA_DIR=<dir> UAPLY_CONFIG_JSON='{"smtp":{"host":"127.0.0.1","port":2525,"starttls":false,"from_addr":"uaply@example.com"},"owner_copy":"owner@example.com"}' python serve.py 8773 dev --api
  python tools/test-smtp.py 8773 <dir>/mail.jsonl"""
import base64
import email
import http.client
import json
import re
import sys
import time

PORT = int(sys.argv[1])
MAIL = sys.argv[2]
HOST = "uaply.example"
R = []


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


def req(method, path, body=None, extra=None):
    h = {"Host": HOST, "X-Forwarded-Proto": "https", "X-Forwarded-For": "203.0.113.9", "Origin": "https://" + HOST}
    h.update(extra or {})
    if body is not None:
        h["Content-Type"] = "application/json"
    c = http.client.HTTPConnection("127.0.0.1", PORT, timeout=30)
    c.request(method, path, body=json.dumps(body) if body is not None else None, headers=h)
    r = c.getresponse()
    data = r.read()
    c.close()
    try:
        return r.status, json.loads(data)
    except Exception:
        return r.status, data


def mails():
    try:
        with open(MAIL, encoding="utf-8") as f:
            return [json.loads(x) for x in f if x.strip()]
    except OSError:
        return []


def body_of(m):
    msg = email.message_from_string(m["raw"])
    return msg["Subject"], msg.get_payload(decode=True).decode("utf-8", "replace")


owner = {"Authorization": "Basic " + base64.b64encode(b"o:ownerpw").decode()}
n0 = len(mails())
s, out = req("POST", "/api/auth/signup", {"email": "smtp1@example.com", "password": "correct horse 99", "agree": True})
t("sign-up works", s, 200)
s, out = req("POST", "/api/auth/forgot", {"email": "smtp1@example.com"})
t("forgot answers that the email was sent", (s, out.get("delivery")), (200, "sent"))
time.sleep(0.5)
new = mails()[n0:]
t("exactly one real email went out", len(new), 1)
subj, body = body_of(new[0]) if new else ("", "")
t("it went to the right person", new[0]["to"] if new else None, ["smtp1@example.com"])
t("subject is clear", subj, "Reset your UAply password")
link = re.search(r"https://uaply\.example/\?reset=([A-Za-z0-9_-]{20,100})", body)
t("body holds a one-hour reset link on the public address", bool(link), True)
t("the link works once", req("POST", "/api/auth/reset", {"token": link.group(1) if link else "x" * 30, "password": "brand new pass 22"})[0], 200)
t("then it is spent", req("POST", "/api/auth/reset", {"token": link.group(1) if link else "x" * 30, "password": "another pass 33"})[0], 400)
t("login with the new password", req("POST", "/api/auth/login", {"email": "smtp1@example.com", "password": "brand new pass 22"})[0], 200)
page = req("GET", "/outbox", extra=owner)[1].decode("utf-8")
t("the stored copy does not keep the reset link", "?reset=" not in page, True)
t("unknown email: same answer, nothing is sent", (req("POST", "/api/auth/forgot", {"email": "ghost@example.com"})[0], len(mails()) - n0 - 1), (200, 0))
s, out = req("POST", "/api/setup/test-mail", {}, extra=owner)
time.sleep(0.5)
t("setup page test email is delivered to the owner copy address", (out.get("ok"), (mails()[-1]["to"] if mails() else None)), (True, ["owner@example.com"]))
print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
