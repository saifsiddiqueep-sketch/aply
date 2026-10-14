"""Reads the newest message from the stand-in mail server's file (tools/fake-smtp.py) and saves its HTML part, so the email can be shown as a mail app shows it.
  python tools/mail-extract.py <mail.jsonl> <folder> [recipient]
Prints: the recipient, the subject, the 6-digit code if there is one, and the path of the saved HTML file."""
import email
import email.policy
import json
import os
import re
import sys

path, out = sys.argv[1], sys.argv[2]
want = sys.argv[3].lower() if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)
rows = [json.loads(x) for x in open(path, encoding="utf-8") if x.strip()]
if want:
    rows = [r for r in rows if want in [a.lower() for a in r.get("to", [])]]
if not rows:
    print("NO MAIL")
    sys.exit(1)
msg = email.message_from_string(rows[-1]["raw"], policy=email.policy.default)
body = msg.get_body(preferencelist=("html",))
html_part = body.get_content() if body is not None and body.get_content_type() == "text/html" else ""
text_part = (msg.get_body(preferencelist=("plain",)).get_content() if msg.get_body(preferencelist=("plain",)) is not None else "")
dest = os.path.join(out, "email.html")
with open(dest, "w", encoding="utf-8") as f:
    f.write(html_part or "<pre>" + text_part + "</pre>")
m = re.search(r"\b(\d{6})\b", msg["Subject"] or "") or re.search(r"\b(\d{6})\b", text_part)
print("to=%s" % msg["To"])
print("subject=%s" % msg["Subject"])
print("code=%s" % (m.group(1) if m else ""))
print("html=%s" % dest)
print("has_html_part=%s" % bool(html_part))
