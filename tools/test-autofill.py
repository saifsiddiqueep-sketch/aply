"""Autofill: real employers' application forms answered from a UAply profile (autofill.py), and what a swipe right does with them.
  python tools/test-autofill.py
Uses public Greenhouse forms saved in tools/fixtures/greenhouse-forms.json (no internet needed) and the stand-in hiring system (mock-ats.py)."""
import json
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORT = 8797
os.environ["UAPLY_ATS_BASE_GREENHOUSE"] = "http://127.0.0.1:%d" % PORT
os.environ["UAPLY_ATS_BASE_LEVER"] = "http://127.0.0.1:%d" % PORT
os.environ["UAPLY_DATA_DIR"] = tempfile.mkdtemp()
os.environ["UAPLY_CONFIG_JSON"] = json.dumps({"delivery": "test", "smtp": {}, "owner_copy": "", "feeds": []})
sys.path.insert(0, ROOT)
import autofill        # noqa: E402
import ats_api         # noqa: E402
import jobs_api        # noqa: E402
import uaply_api       # noqa: E402

FORMS = json.load(open(os.path.join(HERE, "fixtures", "greenhouse-forms.json"), encoding="utf-8"))["forms"]
ok = bad = 0


def t(name, got, want):
    global ok, bad
    if got == want:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, "\n   got: ", repr(got)[:300], "\n   want:", repr(want)[:300])


CAND = {"name": "Sam Rivera", "email": "sam@example.com", "title": "Software Engineer Intern", "loc": "Philadelphia, PA", "edu": "Bachelor", "years": 1,
        "ext": {"phone": "+1 215 555 0100", "linkedin": "https://www.linkedin.com/in/sam-rivera", "portfolio": "https://github.com/samrivera",
                "school": "Drexel University", "major": "Computer Science", "grad": "2027-06", "gpa": 3.6, "auth": "citizen", "sponsor": "no",
                "start": "grad", "zip": "19104", "state": "PA", "relocate": "yes", "office": "yes", "former": "no", "govt": "no", "phd": "no", "ack": True,
                "summary": "Computer science student who builds web apps.", "why": "I want to work at {company} because the {role} role fits what I build."}}
RESUME = ({"name": "resume.pdf", "type": "application/pdf", "size": 40}, b"%PDF-1.4 a small test resume for the autofill tests")


def plan(board, cand=CAND, answers=None, resume=RESUME):
    f = FORMS[board]
    return autofill.plan_greenhouse(f, cand, {"co": f["company_name"], "role": f["title"]}, "", resume[0], resume[1], answers)


def item(p, pattern):
    for i in p["items"]:
        if re.search(pattern, i["q"], re.I):
            return i
    return None


def field_for(board, pattern):
    """The Greenhouse field name of the question whose label matches."""
    for q in FORMS[board]["questions"]:
        if re.search(pattern, q["label"], re.I):
            return q["fields"][0]["name"]
    return None


def cand_with(**ext):
    c = json.loads(json.dumps(CAND))
    c["ext"].update(ext)
    return c


# ---- the standard part of every form -----------------------------------------------------------------------------------------------------
p = plan("waymo")
got = dict(p["fields"])
t("first and last name, email and phone are filled in", (got.get("first_name"), got.get("last_name"), got.get("email"), got.get("phone")),
  ("Sam", "Rivera", "sam@example.com", "+1 215 555 0100"))
t("the resume file goes in as a file", [f[0] for f in p["files"]], ["resume"])
t("the location's hidden map position is worked out from the ZIP code (Philadelphia area)", (round(float(got["latitude"])), round(float(got["longitude"]))), (40, -75))
t("hidden fields are never shown to the person as questions", any(i["q"] in ("Latitude", "Longitude") and not i.get("skip") for i in p["items"]), False)

# ---- questions whose options are whole sentences --------------------------------------------------------------------------------------------
# a question exactly as one Waymo posting asks it (its options are sentences)
WA = {"company_name": "Waymo", "title": "Intern", "location_questions": [], "questions": [{"required": True, "label": "Work Authorization", "fields": [
    {"name": "question_1", "type": "multi_value_single_select", "values": [
        {"label": "I am authorized to work for any employer in the country in which this position is based.", "value": 1},
        {"label": "I require, or in the future will require, Waymo's sponsorship to obtain work authorization in the country in which this position is based (e.g. H-1B, TN, etc.)", "value": 2},
        {"label": "My status to work in the country in which this position is based is unknown.", "value": 3}]}]}]}
wa = autofill.plan_greenhouse(WA, CAND, {"co": "Waymo"})["items"][0]
t("Work authorization (options are sentences): picks 'authorized to work for any employer'", wa["a"].startswith("I am authorized to work for any employer"), True)
wa2 = autofill.plan_greenhouse(WA, cand_with(sponsor="yes"), {"co": "Waymo"})["items"][0]
t("...and someone who needs sponsorship gets the sponsorship sentence instead", wa2["a"].startswith("I require"), True)
reg = item(p, r"state/region in which you currently reside")
t("a state list without the person's state: 'Another State in the US' (never a wrong state)", reg and reg["a"], "Another State in the US")
st = item(plan("affirm"), r"state or canadian province")
t("a US state asked as a list of full names: PA becomes Pennsylvania", st and st["a"], "Pennsylvania")
fe = item(plan("affirm"), r"previously been employed at affirm")
t("'Have you worked here before' with sentence options: 'I have not previously been employed'", fe and fe["a"], "I have not previously been employed at Affirm")
gv = item(plan("coinbase"), r"current government official")
t("government official: answered No from the profile", gv and gv["a"].lower().startswith("no"), True)

# ---- careful cases ---------------------------------------------------------------------------------------------------------------------------
sp = item(plan("imc"), r"immigration sponsorship to begin")
t("a sponsorship question that mentions OPT is still answered as sponsorship", sp and sp["a"], "No")
opt = item(plan("duolingo"), r"optional practical training")
t("an OPT question for a US citizen is answered No (it only applies to student visas)", opt and opt["a"], "No")
opt2 = item(plan("duolingo", cand_with(auth="authorized")), r"optional practical training")
t("...but for someone on a visa it is left for the person", (opt2["a"], opt2["need"]), ("", True))
eeo = [i for i in plan("dropbox")["items"] if re.search(r"gender|race|veteran|disabilit|hispanic", i["q"], re.I)]
t("voluntary self-identification is never answered", all(not i["a"] for i in eeo), True)
ack_on = item(plan("waymo"), r"candidate privacy policy")
ack_off = item(plan("waymo", cand_with(ack=False)), r"candidate privacy policy")
t("a privacy-notice acknowledgment is ticked only when the person chose that", (bool(ack_on["a"]), ack_off["a"], ack_off["need"]), (True, "", True))
ai = item(plan("coinbase"), r"best describes how you use ai tools")
t("a real question that mentions AI is not mistaken for an acknowledgment", (ai["a"], ai["need"]), ("", True))
essay = item(plan("duolingo", cand_with(why="")), r"why are you interested in duolingo")
t("an essay question is never invented", (essay["a"], essay["need"]), ("", True))
essay2 = item(plan("duolingo"), r"why are you interested in duolingo")
t("...but the person's own 'why' template is used, with the company filled in", "Duolingo" in essay2["a"], True)
nozip = plan("waymo", cand_with(zip=""))
t("with no ZIP code, the ZIP code is asked once (not latitude and longitude)", [m["q"] for m in nozip["missing"] if "ZIP" in m["q"]],
  ["Your ZIP code (the employer's form uses it for your location)"])
t("...and the answer the person gives fills the map position", "latitude" in dict(plan("waymo", cand_with(zip=""), {"zip": "94103"})["fields"]), True)
no_resume = plan("waymo", cand_with(summary="", headline=""), resume=(None, None))
t("no resume file and none pasted: the resume question is asked", any(m["q"].startswith("Resume") for m in no_resume["missing"]), True)

# ---- saved answers ---------------------------------------------------------------------------------------------------------------------------
first = plan("coinbase")
asked = {m["key"]: (m.get("opts") or ["yes"])[0] for m in first["missing"]}
again = plan("coinbase", answers=asked)
t("after the person answers the missing questions once, the same form is complete", again["missing"], [])
k_dbx = autofill.norm("Have you previously worked for Dropbox?", "Dropbox")
k_other = autofill.norm("Have you previously worked for Discord?", "Discord")
t("saved answers ignore the company's name, so they carry over to other employers", k_dbx == k_other and "{co}" in k_dbx, True)
t("saved answers from the browser are capped and cleaned", (len(autofill.clean_answers({"q%d" % i: "a" for i in range(200)})), autofill.clean_answers({"x": 5, "": "y", "ok": "  v "})),
  (80, {"ok": "v"}))

# ---- how often a form is complete from the profile alone ------------------------------------------------------------------------------------
complete = sum(1 for b in FORMS if not plan(b)["missing"])
t("every saved form gets its name, email, phone and resume filled in", all({"first_name", "last_name", "email", "phone"} <= set(dict(plan(b)["fields"])) and plan(b)["files"] for b in FORMS), True)
print("   (%d of %d saved forms are complete from the profile alone)" % (complete, len(FORMS)))

# ---- a swipe right, end to end: the questions are asked, then it goes in -----------------------------------------------------------------------
proc = subprocess.Popen([sys.executable, os.path.join(HERE, "mock-ats.py"), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            import urllib.request
            urllib.request.urlopen("http://127.0.0.1:%d/__received" % PORT, timeout=1)
            break
        except Exception:
            time.sleep(0.1)
    st_, why = ats_api.submit("greenhouse", "acme", "1003", "gh-secret-key-123", dict(CAND), "", *RESUME)
    t("a connected employer's form with a question only the person can answer: nothing is sent", st_, "needs_manual")
    key = autofill.norm("What is your favorite color and why?", "")
    st_, why = ats_api.submit("greenhouse", "acme", "1003", "gh-secret-key-123", dict(CAND, answers={key: "Blue, it is calm."}), "", *RESUME)
    t("...and once the person answers it, the application goes in with that answer", st_, "sent")

    # the sandbox's preview: a real (public) posting whose employer has not connected, in test mode
    jid = 4242001
    with jobs_api._lock:
        jobs_api._cache["autofill-test"] = {"at": time.time(), "jobs": [{"id": jid, "co": "Acme", "role": "Intern", "url": "https://acme.example/j/1003", "loc": "Remote",
                                                                          "mode": "remote", "type": "internship", "sal": [0, 0], "apply": "link", "live": True, "contact": "",
                                                                          "ats": {"kind": "greenhouse", "board": "openboard", "id": "1003"}}]}
    body = {"consent": True, "job": {"id": jid, "co": "Acme", "role": "Intern", "url": "https://acme.example/j/1003"},
            "profile": {"name": "Sam Rivera", "email": "sam@example.com", "loc": "Philadelphia, PA", "ext": CAND["ext"]},
            "resume": {"name": "resume.pdf", "data": "data:application/pdf;base64,JVBERi0xLjQgYSBzbWFsbCB0ZXN0IHJlc3VtZSBmb3IgdGhlIGF1dG9maWxsIHRlc3Rz"}}
    uaply_api.init("sandbox")
    code, out = uaply_api.submit(dict(body))
    t("sandbox: swipe right asks the one question the profile cannot answer", (code, out.get("status"), [q["q"] for q in out.get("questions", [])]),
      (200, "needs_answers", ["What is your favorite color and why?"]))
    t("...and nothing was recorded or sent yet", len(uaply_api.APPS), 0)
    code, out = uaply_api.submit(dict(body, answers={key: "Blue"}))
    t("sandbox: with the answer, it is applied (to the test inbox, never the employer)", (code, out.get("status"), out.get("simulated")), (200, "delivered_test", True))
    t("...and the reply says how much was filled in for the person", (out.get("plan") or {}).get("filled", 0) >= 5, True)
    page = uaply_api.outbox_html().decode("utf-8")
    t("the test inbox page shows the employer's form as UAply filled it in", ("filled in by UAply" in page, "Blue" in page), (True, True))
    code, out = uaply_api.submit(dict(body, answers={key: "Blue"}))
    t("sandbox: a second swipe on the same job is a duplicate, not a second application", out.get("status"), "duplicate")
    uaply_api.init("dev")
    code, out = uaply_api.submit(dict(body))
    t("dev (no preview): the same posting is a hand-off, with the filled answers ready for the employer's page", (out.get("status"), bool(out.get("plan"))), ("handoff", True))
finally:
    proc.terminate()

print("\n%d / %d" % (ok, ok + bad))
sys.exit(1 if bad else 0)
