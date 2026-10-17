"""Unit tests for the job feed rules (no network): which postings count as US jobs, and how they are classified.
  python tools/test-jobs.py"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import jobs_api as j  # noqa: E402

R = []


def t(name, got, want):
    ok = got == want
    R.append(ok)
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  -> got %r, wanted %r" % (got, want)))


# (location, remote flag, should it be offered to a person in the US?)
for loc, remote, want in [
    ("Toronto, ON, CA", False, False),                      # ', CA' here is Canada, not California
    ("San Francisco, CA", False, True),
    ("Remote", True, True),
    ("Remote", False, False),
    ("Remote - USA", True, True),
    ("Remote, Canada", True, False),
    ("London, UK", False, False),
    ("Berlin, Germany", True, False),
    ("Austin, TX", False, True),
    ("New York, NY", False, True),
    ("Canada; United States", False, True),                 # one posting, several cities: a US one is enough
    ("Bellevue, Washington; Mountain View, California; Vancouver, Canada", False, True),
    ("Sydney, Australia", True, False),
]:
    t("location %r (remote=%s)" % (loc, remote), j._us_ok(loc, remote), want)


def raw(title, loc, remote=None):
    return dict(id=1, title=title, company="Acme", loc=loc, remote=remote, text="Python and SQL required. 2 years of experience.",
                url="https://example.com/job/1", salary_text="", posted=0)


t("a plain US job is kept", j._normalize(raw("Software Engineer", "Austin, TX"), "greenhouse", "Acme") is not None, True)
t("a Toronto internship listed as ', CA' is dropped", j._normalize(raw("Software Engineering Intern 2027 (Toronto)", "Toronto, ON, CA"), "greenhouse", "Acme"), None)
t("an 'ANZ' role listed as just Remote is dropped", j._normalize(raw("Support Representative - ANZ (Australia / New Zealand)", "Remote", True), "greenhouse", "Acme"), None)
t("a 'LATAM' role listed as just Remote is dropped", j._normalize(raw("Developer Representative - LATAM", "Remote", True), "greenhouse", "Acme"), None)
t("a US remote role is kept", j._normalize(raw("Backend Engineer", "Remote - USA", True), "greenhouse", "Acme") is not None, True)
t("an http:// careers link is opened securely (https://), never as http", (j._normalize(dict(raw("Engineer", "Austin, TX"), url="http://example.com/x"), "greenhouse", "Acme") or {}).get("url"), "https://example.com/x")
t("a link that is not a web address is dropped", [j._normalize(dict(raw("Engineer", "Austin, TX"), url=u), "greenhouse", "Acme") for u in ("javascript:alert(1)", "mailto:jobs@example.com", "ftp://example.com/x")], [None, None, None])
n = j._normalize(raw("Software Engineer Intern", "Austin, TX"), "greenhouse", "Acme")
t("an intern title is classified as an internship", n and n["type"], "internship")
n = j._normalize(raw("Hardware Engineer (Winter Co-op)", "Austin, TX"), "greenhouse", "Acme")
t("a co-op title is classified as a co-op", n and n["type"], "coop")
n = j._normalize(raw("Engineer", "Austin, TX"), "greenhouse", "Acme")
t("a feed job is link-out only and never has a recruiter address", (n["apply"], n["contact"]), ("link", ""))
# "recruiting" in a company's boilerplate must not become a skill on an engineering job (it did: a firmware co-op listed "Hiring")
boiler = dict(raw("Firmware Engineer Co-Op", "Austin, TX"), text="Python and SQL. Samsara is an equal opportunity employer. Our recruiting process and recruiting privacy notice apply to all applicants. " * 3)
n = j._normalize(boiler, "greenhouse", "Acme")
t("boilerplate 'recruiting' does not add a Hiring skill to an engineering job", n and "Hiring" in n["skills"], False)
n = j._normalize(dict(boiler, title="Technical Recruiter"), "greenhouse", "Acme")
t("a recruiter role does get the Hiring skill", n and "Hiring" in n["skills"], True)

# a remote job's place must not repeat the word "Remote" the work-style tag already shows ("Remote - USA  Remote" on the card)
for loc, want in [("Remote - USA", "USA"), ("Remote (US)", "US"), ("Remote, US", "US"), ("Remote", "United States"), ("remote", "United States"),
                  ("Remote - United States", "United States"), ("Remote / Austin, TX", "Austin, TX"), ("Remotely hosted office, Austin, TX", "Remotely hosted office, Austin, TX"),
                  # real places from the live feeds: anything that does not start with the word is left exactly as listed, brackets included
                  ("San Francisco Bay Area (or Remote U.S.)", "San Francisco Bay Area (or Remote U.S.)"), ("CA Remote (BC & ON only); U.S. Remote", "CA Remote (BC & ON only); U.S. Remote"),
                  ("US: Select locations", "US: Select locations"), ("U.S.", "U.S."), ("Remote (US) - Austin, TX", "US - Austin, TX")]:
    t("remote place %r is shown as %r" % (loc, want), j._place(loc, "remote"), want)
t("an on-site place is left exactly as listed", j._place("Remote Control Way, Austin, TX", "onsite"), "Remote Control Way, Austin, TX")
t("an empty place reads Not listed", j._place("", "onsite"), "Not listed")
n = j._normalize(raw("Backend Engineer", "Remote - USA", True), "greenhouse", "Acme")
t("a remote feed job no longer repeats Remote in its place", (n["loc"], n["mode"]), ("USA", "remote"))

# the public job list must not show a visitor a raw network error from a feed (it names hosts and addresses); the owner's own computer still sees it
real_load, real_feeds, real_sources = j._load_source, j.feeds_allowed, j.SOURCES
j.SOURCES = [("greenhouse", "acme", "Acme")]
j.feeds_allowed = lambda: {"greenhouse"}
j._load_source = lambda src: ([], "error: <urlopen error [Errno 11001] getaddrinfo failed for boards.internal.example>")
try:
    j.hide_errors = False
    owner_view = j.get_jobs()["sources"]["Acme"]
    j.hide_errors = True
    public_view = j.get_jobs()["sources"]["Acme"]
finally:
    j.hide_errors = False
    j._load_source, j.feeds_allowed, j.SOURCES = real_load, real_feeds, real_sources
t("on the owner's computer a failing feed shows its reason", "getaddrinfo" in owner_view, True)
t("on a hosted server the public list says only 'unavailable right now'", public_view, "unavailable right now")
t("the documentation example employer is never served as jobs", [e for e in j.partner_jobs() if e["co"] == "Example Partner Co"], [])

# the job description shown in emails: the role, not the company's introduction, and always ending on a whole sentence
intro = "About Acme: We are a company that builds things people love and we are growing. " * 4
body = "About the Role: We need an intern to help build the checkout flow. You will write code, add tests and learn from senior engineers. " + "More detail about the team and tools. " * 40
d = j._role_summary(intro + body)
t("the description starts at the role section", d.startswith("About the Role:"), True)
t("the description is short enough to read in an email", len(d) <= 660, True)
t("the description ends on a whole sentence", d.rstrip().endswith("."), True)
t("a posting with no role heading still gets a clean summary", j._role_summary("We build robots. " * 100).endswith("robots."), True)
t("a short posting is kept whole", j._role_summary("A short posting."), "A short posting.")

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
