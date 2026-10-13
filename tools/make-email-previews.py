"""Writes example swipe-right emails to marketing/email-previews/ (an .html and a .txt each) so anyone can see what people receive.
  python tools/make-email-previews.py"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import emails  # noqa: E402

OUT = os.path.join(HERE, "..", "marketing", "email-previews")
os.makedirs(OUT, exist_ok=True)
base = {"at": 1791932764, "match": 87, "to": "careers@acmerobotics.example", "cand": {"name": "Sam Rivera", "email": "sam@example.com"},
        "job": {"co": "Acme Robotics", "role": "Software Engineering Intern", "loc": "Philadelphia, PA", "type": "internship", "mode": "hybrid",
                "sal": [30000, 38000], "url": "https://acmerobotics.example/careers/42",
                "desc": "Build and test the software that drives our warehouse robots. You will pair with senior engineers, ship small features "
                        "every week, and learn how production systems are monitored. Python and SQL experience helps; curiosity matters more."},
        "rows": [("Applicant", "Sam Rivera"), ("Email", "sam@example.com"), ("Current or target title", "Software Intern"), ("Experience", "1 year"),
                 ("Skills", "Python, SQL, Git"), ("Education", "Drexel University, Computing & Security Technology, 2026-06"),
                 ("Resume", "https://example.com/sam-rivera.pdf"), ("Work authorization", "US citizen; no sponsorship needed")],
        "note": "", "user_email": "sam@example.com", "base_url": "https://uaply.example", "support_email": "help@uaply.example"}
cases = {"1-handoff-test": dict(base, status="handoff", test=True),
         "2-applied-test": dict(base, status="delivered_test", test=True),
         "3-applied-live": dict(base, status="sent", test=False),
         "4-owner-copy": dict(base, status="handoff", test=True)}
for name, c in cases.items():
    sub, text, page = (emails.owner_copy if name.endswith("owner-copy") else emails.applicant_receipt)(c)
    open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8", newline="").write(page)
    open(os.path.join(OUT, name + ".txt"), "w", encoding="utf-8", newline="").write("Subject: %s\n\n%s" % (sub, text))
    print(name, "|", sub)
