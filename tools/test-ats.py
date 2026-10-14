"""Tests delivery straight into an employer's hiring system (Greenhouse and Lever) against a stand-in that follows their documentation: what is sent,
how the posting's questions are answered from the profile, what happens when it cannot be answered, bad keys, errors, and that a key never leaks.
  python tools/test-ats.py"""
import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
PORT = 8795
os.environ["UAPLY_ATS_BASE_GREENHOUSE"] = "http://127.0.0.1:%d" % PORT
os.environ["UAPLY_ATS_BASE_LEVER"] = "http://127.0.0.1:%d" % PORT
import ats_api  # noqa: E402

R = []
GH_KEY, LEVER_KEY = "gh-secret-key-123", "lever-key-456"


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


proc = subprocess.Popen([sys.executable, os.path.join(HERE, "mock-ats.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)


def received():
    return json.loads(urllib.request.urlopen("http://127.0.0.1:%d/__received" % PORT).read())


CAND = {"name": "Pat Doe", "email": "pat@example.com", "loc": "Austin, TX",
        "ext": {"phone": "+1 555 123 4567", "linkedin": "https://www.linkedin.com/in/patdoe", "portfolio": "https://pat.example", "employer": "Acme Co",
                "summary": "Computer science student who likes building things.", "auth": "citizen", "sponsor": "no"}}
RESUME = ({"name": "resume.pdf", "type": "application/pdf", "size": 40}, b"%PDF-1.4 a small test resume for the stand-in server")

try:
    # ---- Greenhouse -------------------------------------------------------------------------------------------------------------------------
    st, why = ats_api.submit("greenhouse", "acme", "1001", GH_KEY, CAND, "", *RESUME)
    t("Greenhouse: a posting with only the standard questions is sent", (st, why), ("sent", ""))
    got = received()[-1]
    t("...with the name split, the email, the phone and the resume file attached", (got["fields"]["first_name"], got["fields"]["last_name"], got["fields"]["email"], got["fields"]["phone"],
                                                                                   got["files"]["resume"]["filename"], got["files"]["resume"]["bytes"] > 20),
      ("Pat", "Doe", "pat@example.com", "+1 555 123 4567", "resume.pdf", True))
    t("...to the right board and job", (got["system"], got["board"], got["job"]), ("greenhouse", "acme", "1001"))

    st, why = ats_api.submit("greenhouse", "acme", "1002", GH_KEY, CAND, "", *RESUME)
    got = received()[-1]["fields"]
    t("Greenhouse: custom questions are answered from the profile", (st, got.get("question_101"), got.get("question_102"), got.get("question_103")), ("sent", "1", "0", "8"))
    t("...the optional LinkedIn and website questions are filled in too", (got.get("question_100"), got.get("question_104")), ("https://www.linkedin.com/in/patdoe", "https://pat.example"))

    cand_none = json.loads(json.dumps(CAND))
    cand_none["ext"]["auth"] = "none"
    ats_api.submit("greenhouse", "acme", "1002", GH_KEY, cand_none, "", *RESUME)
    t("someone not authorized to work answers 'No' (and not a guess)", received()[-1]["fields"].get("question_101"), "0")

    before = len(received())
    cand_blank = json.loads(json.dumps(CAND))
    cand_blank["ext"]["sponsor"] = ""
    st, why = ats_api.submit("greenhouse", "acme", "1002", GH_KEY, cand_blank, "", *RESUME)
    t("a required question the profile cannot answer sends NOTHING and says to finish on the employer's page", (st, "sponsorship" in why.lower(), len(received())), ("needs_manual", True, before))
    st, why = ats_api.submit("greenhouse", "acme", "1003", GH_KEY, CAND, "", *RESUME)
    t("a required free-text question nobody can answer is never guessed", (st, "favorite color" in why, len(received())), ("needs_manual", True, before))

    st, why = ats_api.submit("greenhouse", "acme", "1001", GH_KEY, CAND, "", None, None)
    t("with no resume file, the pasted-text option of the resume question is used", (st, bool(received()[-1]["fields"].get("resume_text"))), ("sent", True))
    st, why = ats_api.submit("greenhouse", "acme", "1001", GH_KEY, dict(CAND, name="Madonna"), "", *RESUME)
    t("a one-word name still fills both name boxes", (st, received()[-1]["fields"]["first_name"], received()[-1]["fields"]["last_name"]), ("sent", "Madonna", "Madonna"))

    st, why = ats_api.submit("greenhouse", "acme", "1004", GH_KEY, CAND, "", *RESUME)
    t("a posting that no longer exists is reported, not sent", (st, "HTTP 404" in why), ("failed", True))
    st, why = ats_api.submit("greenhouse", "acme", "1005", GH_KEY, CAND, "", *RESUME)
    t("an error from the employer's system is reported with its code", (st, "HTTP 500" in why), ("failed", True))
    before = len(received())
    st, why = ats_api.submit("greenhouse", "acme", "1001", "wrong-key-0000", CAND, "", *RESUME)
    t("a wrong key is refused and the reason says so without repeating the key", (st, "refused the key" in why, "wrong-key" in why, len(received())), ("failed", True, False, before))

    # ---- Lever ------------------------------------------------------------------------------------------------------------------------------
    st, why = ats_api.submit("lever", "acme", "posting-uuid-1", LEVER_KEY, CAND, "I would love to join.", *RESUME)
    got = received()[-1]
    t("Lever: an application is sent", (st, got["system"], got["site"], got["posting"]), ("sent", "lever", "acme", "posting-uuid-1"))
    f = got["fields"]
    t("...with name, email, phone, company, links and source", (f["name"], f["email"], f["phone"], f["org"], f["urls[LinkedIn]"], f["urls[Portfolio]"], f["source"]),
      ("Pat Doe", "pat@example.com", "+1 555 123 4567", "Acme Co", "https://www.linkedin.com/in/patdoe", "https://pat.example", "UAply"))
    t("...the person's note and summary in the comments, and the resume file attached", ("I would love to join." in f["comments"], "Computer science student" in f["comments"], got["files"]["resume"]["filename"]),
      (True, True, "resume.pdf"))
    before = len(received())
    st, why = ats_api.submit("lever", "acme", "posting-uuid-1", "not-the-lever-key", CAND, "", *RESUME)
    t("Lever: a wrong key is refused and never repeated", (st, "refused the key" in why, "not-the-lever-key" in why, len(received())), ("failed", True, False, before))
    st, why = ats_api.submit("lever", "acme", "slow", LEVER_KEY, CAND, "", *RESUME)
    t("Lever: its rate limit is reported as a pause", (st, "429" in why), ("failed", True))
    st, why = ats_api.submit("lever", "acme", "posting-uuid-2", LEVER_KEY, dict(CAND, name=""), "", *RESUME)
    t("Lever: an application with no name is rejected by Lever and reported", (st, "HTTP 400" in why), ("failed", True))

    # ---- guards -----------------------------------------------------------------------------------------------------------------------------
    before = len(received())
    for label, args in (("an unknown system", ("workday", "acme", "1", GH_KEY)), ("a board name with a slash", ("greenhouse", "ac/me", "1", GH_KEY)),
                        ("a job id with odd characters", ("greenhouse", "acme", "1?x=2", GH_KEY)), ("a key that is too short", ("lever", "acme", "1", "abc"))):
        st, why = ats_api.submit(args[0], args[1], args[2], args[3], CAND, "", *RESUME)
        t("%s is refused before any request is made" % label, (st, "not set up correctly" in why, len(received())), ("failed", True, before))
    os.environ["UAPLY_ATS_BASE_LEVER"] = "https://evil.example"
    t("a base address from the environment is honored only for this computer", ats_api._base("lever"), "https://api.lever.co")
    os.environ["UAPLY_ATS_BASE_LEVER"] = "http://127.0.0.1:%d" % PORT
finally:
    proc.terminate()

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
