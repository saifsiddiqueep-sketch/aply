"""Tests the "Connect Gmail" form on the setup page: validation, what it saves, that the password is never echoed, and the messages for a
wrong password. It uses a temporary config file and a fake mail connection, so it never touches your real settings or Gmail.
  python tools/test-setup.py"""
import json
import os
import smtplib
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
TMP = tempfile.mkdtemp(prefix="uaply-setup-")
os.environ["UAPLY_DATA_DIR"] = TMP
os.environ["UAPLY_CONFIG_JSON"] = "{}"

import setup_api  # noqa: E402
import uaply_api  # noqa: E402

R = []


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


uaply_api.CONFIG_PATH = os.path.join(TMP, "uaply-config.json")
PW = "abcd efgh ijkl mnop"            # how Google shows an App Password: four groups of four


class FakeSMTP:
    mode = "ok"
    sent = []

    def __init__(self, host, port, timeout=0):
        self.host = host

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self):
        pass

    def login(self, user, pw):
        if FakeSMTP.mode == "auth":
            raise smtplib.SMTPAuthenticationError(535, b"bad credentials")
        if FakeSMTP.mode == "drop":
            raise smtplib.SMTPServerDisconnected("closed")
        FakeSMTP.login_used = (user, pw)

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)


setup_api.smtplib.SMTP = FakeSMTP

# validation: nothing is written
for label, body in [("no address", {"email": "", "password": PW}), ("a bad address", {"email": "nope", "password": PW}),
                    ("a short password", {"email": "a@gmail.com", "password": "abc"}),
                    ("a password with symbols", {"email": "a@gmail.com", "password": "abcd-efgh-ijkl-mn!!"}),
                    ("a bad copy address", {"email": "a@gmail.com", "password": PW, "copy_to": "not an email"})]:
    s, out = setup_api.save_mail(body)
    t("%s is refused and nothing is saved" % label, (s, out["ok"], os.path.exists(uaply_api.CONFIG_PATH)), (400, False, False))

# existing settings survive
with open(uaply_api.CONFIG_PATH, "w", encoding="utf-8") as f:
    json.dump({"feeds": ["greenhouse"], "google": {"client_id": "x"}, "owner_copy": "old@example.com"}, f)

s, out = setup_api.save_mail({"email": " uaply.sender@gmail.com ", "password": PW, "copy_to": "uaplytechnologies@gmail.com"})
cfg = json.load(open(uaply_api.CONFIG_PATH, encoding="utf-8"))
t("a good form saves and sends a test", (s, out["ok"], out["saved"]), (200, True, True))
t("the password is saved without spaces", cfg["smtp"]["password"], "abcdefghijklmnop")
t("Gmail's server, port and TLS are set", (cfg["smtp"]["host"], cfg["smtp"]["port"], cfg["smtp"]["starttls"]), ("smtp.gmail.com", 587, True))
t("the sender and login are the address given, trimmed", (cfg["smtp"]["user"], cfg["smtp"]["from_addr"]), ("uaply.sender@gmail.com",) * 2)
t("the copy address was updated", cfg["owner_copy"], "uaplytechnologies@gmail.com")
t("other settings were kept", (cfg["feeds"], cfg["google"]), (["greenhouse"], {"client_id": "x"}))
t("the password is never sent back", "abcdefghijklmnop" not in json.dumps(out) and PW not in json.dumps(out), True)
t("a test email went to the copy address", [m["To"] for m in FakeSMTP.sent], ["uaplytechnologies@gmail.com"])
t("the login used the saved password", FakeSMTP.login_used, ("uaply.sender@gmail.com", "abcdefghijklmnop"))

# a wrong password gives a clear message
FakeSMTP.mode = "auth"
s, out = setup_api.save_mail({"email": "uaply.sender@gmail.com", "password": PW})
t("a refused login says to use an App Password", (out["ok"], "App Password" in out["message"]), (False, True))
FakeSMTP.mode = "drop"
s, out = setup_api.save_mail({"email": "uaply.sender@gmail.com", "password": PW})
t("a dropped connection is explained, not shown as an error code", (out["ok"], "closed the connection" in out["message"]), (False, True))

# the Connect Google box: only the public client ID, only a real-looking one
uaply_api.CONFIG_PATH = os.path.join(TMP, "uaply-config2.json")
s, out = setup_api.save_google({"client_id": "not a client id"})
t("a made-up client ID is refused and nothing is saved", (s, out["ok"], os.path.exists(uaply_api.CONFIG_PATH)), (400, False, False))
with open(uaply_api.CONFIG_PATH, "w", encoding="utf-8") as f:
    json.dump({"feeds": ["greenhouse"], "smtp": {"host": "smtp.gmail.com", "password": "keep-me"}}, f)
s, out = setup_api.save_google({"client_id": " 123456789012-abcdefg1234567.apps.googleusercontent.com "})
cfg2 = json.load(open(uaply_api.CONFIG_PATH, encoding="utf-8"))
t("a real-looking client ID is saved (trimmed) and other settings are kept", (s, out["saved"], cfg2["google"]["client_id"], cfg2["feeds"], cfg2["smtp"]["password"]),
  (200, True, "123456789012-abcdefg1234567.apps.googleusercontent.com", ["greenhouse"], "keep-me"))
uaply_api.CONFIG_PATH = os.path.join(TMP, "uaply-config.json")

# without a password the test button says why
os.remove(uaply_api.CONFIG_PATH)
uaply_api.config = lambda: {"smtp": {"host": "smtp.gmail.com", "from_addr": "a@gmail.com", "user": "a@gmail.com", "password": ""}, "delivery": "test"}
s, out = setup_api.test_mail()
t("the test button says the App Password is missing", (out["ok"], "no App Password" in out["message"]), (False, True))

# the setup page is the owner's guide to switching test mode off: clickable steps, the exact addresses to give Google, and anchors the sign-in screen links to
page = setup_api.page("localhost:8767", "http").decode("utf-8")
t("the page tells Google both local addresses (Google needs the bare localhost one too)", all(("<code>%s</code>" % o) in page for o in ("http://localhost:8767", "http://localhost")), True)
t("each address has a Copy button", page.count('class="cp"'), 2)
t("the Google and Gmail boxes have anchors for the sign-in screen's links", ('id="google"' in page, 'id="gmail"' in page), (True, True))
t("the steps are clickable links to Google's own pages", all(('href="%s"' % u) in page for u in (
    "https://console.cloud.google.com/apis/credentials/consent", "https://console.cloud.google.com/apis/credentials/oauthclient",
    "https://myaccount.google.com/apppasswords", "https://myaccount.google.com/signinoptions/two-step-verification")), True)
t("links open in a new tab without handing over the opener", 'target="_blank" rel="noopener noreferrer"' in page, True)
t("the page explains why a test inbox is still showing", "Why you still see the test inbox" in page, True)
evil = setup_api.page('"><script>alert(1)</script>', "http").decode("utf-8")
t("a hostile Host header is escaped, never printed as markup", ("<script>alert(1)</script>" in evil, "&lt;script&gt;" in evil), (False, True))
t("a hosted address is given as it is, without the extra localhost one", [o for o in setup_api.origins("uaply.example", "https")], ["https://uaply.example"])

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
