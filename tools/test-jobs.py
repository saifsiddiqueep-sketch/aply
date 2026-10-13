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
t("a non-https link is dropped", j._normalize(dict(raw("Engineer", "Austin, TX"), url="http://example.com/x"), "greenhouse", "Acme"), None)
n = j._normalize(raw("Software Engineer Intern", "Austin, TX"), "greenhouse", "Acme")
t("an intern title is classified as an internship", n and n["type"], "internship")
n = j._normalize(raw("Hardware Engineer (Winter Co-op)", "Austin, TX"), "greenhouse", "Acme")
t("a co-op title is classified as a co-op", n and n["type"], "coop")
n = j._normalize(raw("Engineer", "Austin, TX"), "greenhouse", "Acme")
t("a feed job is link-out only and never has a recruiter address", (n["apply"], n["contact"]), ("link", ""))
t("the documentation example employer is never served as jobs", [e for e in j.partner_jobs() if e["co"] == "Example Partner Co"], [])

print(sum(R), "/", len(R))
sys.exit(0 if all(R) else 1)
