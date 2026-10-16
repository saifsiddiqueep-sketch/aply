"""Syntax and rendering checks that ordinary linters miss.
  python tools/test-pages.py

1. Every Python file compiles with this Python (py_compile), so a syntax error can never reach a server start.
2. Every page and email the server builds is rendered once with realistic data, including hostile text. This catches template
   mistakes that only fail at run time, such as a bare % inside a %-formatted page (that broke the test inbox once).
3. Every script in those pages, in the app's HTML files, in shared/*.js, tools/*.js and the Apps Script files is parsed by Node
   (node --check), and checked for the line break that JavaScript silently joins: a line starting with ( [ or ` right after a
   line that ends a value. The browser then calls the previous value instead of starting a new statement (ESLint calls this
   no-unexpected-multiline). That exact mistake broke the setup page's buttons once.
4. Every shell script parses (bash -n).
"""
import glob
import json
import os
import py_compile
import re
import shutil
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
os.environ["UAPLY_DATA_DIR"] = tempfile.mkdtemp()
os.environ["UAPLY_CONFIG_JSON"] = json.dumps({"delivery": "test", "smtp": {}, "owner_copy": "owner@example.com", "feeds": [],
                                              "google": {"client_id": "123456789012-abcdefg1234567.apps.googleusercontent.com"}})
sys.path.insert(0, ROOT)
ok = bad = 0
TMP = tempfile.mkdtemp()
SKIP_DIRS = ("node_modules", os.sep + "mobile" + os.sep, "__pycache__", os.sep + ".git" + os.sep, os.sep + "share" + os.sep)


def t(name, good, detail=""):
    global ok, bad
    if good:
        ok += 1
        print("PASS", name)
    else:
        bad += 1
        print("FAIL", name, ("\n   " + detail) if detail else "")


def files(pattern):
    return [p for p in glob.glob(os.path.join(ROOT, pattern), recursive=True) if not any(s in p for s in SKIP_DIRS)]


# ---- 1. Python compiles -------------------------------------------------------------------------------------------------------------------
broken = []
for p in files("**/*.py"):
    try:
        py_compile.compile(p, cfile=os.path.join(TMP, "x.pyc"), doraise=True)
    except py_compile.PyCompileError as e:
        broken.append("%s: %s" % (os.path.relpath(p, ROOT), str(e).splitlines()[-1][:160]))
t("every Python file compiles (%d files)" % len(files("**/*.py")), not broken, "; ".join(broken))

# ---- 2. every server page and email renders ---------------------------------------------------------------------------------------------
import auth_api      # noqa: E402
import chat_api      # noqa: E402
import emails        # noqa: E402
import setup_api     # noqa: E402
import uaply_api     # noqa: E402

for mod in (uaply_api, auth_api, chat_api):
    mod.init("sandbox")
EVIL = '<img src=x onerror=alert(1)> 100% "quoted" & {braces} %s %d'
cand = {"name": "Sam " + EVIL, "email": "sam@example.com", "title": "Intern", "loc": "Philadelphia, PA", "edu": "Bachelor", "years": 1, "skills": ["Python"],
        "ext": {"phone": "+1 215 555 0100", "school": "Drexel", "auth": "citizen", "sponsor": "no"}, "resume_file": "r.pdf"}
job = {"id": 1, "co": "Acme " + EVIL, "role": "Engineer " + EVIL, "url": "https://acme.example/j", "loc": "Remote", "type": "internship", "mode": "remote",
       "sal": [50000, 70000], "desc": "Build things. " + EVIL}
rendered = {}
for status in ("delivered_test", "sent", "handoff", "failed"):
    rec = {"id": "r" + status, "at": int(time.time()), "mode": "test" if status == "delivered_test" else "live", "job": job, "candidate": cand, "note": EVIL,
           "match": 80, "to": "recruiting@acme.example", "simulated": status == "delivered_test", "status": status, "user": None, "resume": None,
           "channels": ["email"], "autofill": {"filled": 2, "total": 3, "items": [{"q": "Why " + EVIL, "a": EVIL}]}}
    uaply_api.APPS.append(rec)
    ctx = uaply_api._mail_ctx(uaply_api.config(), rec, EVIL, "sam@example.com")
    try:
        rendered["receipt " + status] = emails.applicant_receipt(ctx)[2] or ""
        rendered["owner copy " + status] = emails.owner_copy(ctx)[2] or ""
        t("the applicant's receipt and the owner's copy render (%s)" % status, True)
    except Exception as e:
        t("the applicant's receipt and the owner's copy render (%s)" % status, False, "%s: %s" % (type(e).__name__, e))
pages = [("the test inbox", lambda: uaply_api.outbox_html()), ("the setup page", lambda: setup_api.page("127.0.0.1:8766", "http")),
         ("the feedback page", lambda: chat_api.feedback_html()), ("the verification email", lambda: emails.verification_email("123456")[2]),
         ("the help request email", lambda: emails.support_ticket({"topic": "bug", "message": EVIL, "email": "sam@example.com", "at": time.time(), "id": "x"})[1]),
         ("the help request reply", lambda: emails.support_ack({"topic": "bug", "message": EVIL, "email": "sam@example.com", "at": time.time(), "id": "x"})[1])]
for name, fn in pages:
    try:
        out = fn()
        rendered[name] = out.decode("utf-8") if isinstance(out, bytes) else (out or "")
        t(name + " renders", True)
    except Exception as e:
        t(name + " renders", False, "%s: %s" % (type(e).__name__, e))
t("hostile text in the test inbox is shown as text, never as a tag", "<img src=x" not in rendered.get("the test inbox", "<img src=x"))

# ---- 3. every script parses, and has no line break JavaScript would join ----------------------------------------------------------------
SCRIPT = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S | re.I)
ENDS_VALUE = re.compile(r"[\w$)\]}'\"]$")
STARTS_CALL = re.compile(r"^[(\[`]")


def _scan(code):
    """One pass over the code: which characters are code (not inside a string, template, comment or regex), and for each } the
    position of the { it closes. Good enough for this codebase's scripts; Node has already checked they parse."""
    is_code = bytearray(len(code))
    match, stack, i, n, last = {}, [], 0, len(code), ""
    while i < n:
        c = code[i]
        if c in "'\"`":
            q, i = c, i + 1
            while i < n and code[i] != q:
                if code[i] == "\\":
                    i += 1
                elif q == "`" and code[i] == "$" and i + 1 < n and code[i + 1] == "{":   # ${...} inside a template: skip to its end
                    depth, i = 1, i + 2
                    while i < n and depth:
                        depth += {"{": 1, "}": -1}.get(code[i], 0)
                        i += 1
                    continue
                i += 1
            i += 1
            last = "v"
            continue
        if code.startswith("//", i):
            i = code.find("\n", i)
            i = n if i < 0 else i
            continue
        if code.startswith("/*", i):
            j = code.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c == "/" and (last in "(,=:[!&|?{};+-*%<>~^" or last == "" or re.search(r"\b(return|typeof|case)\s*$", code[max(0, i - 8):i])):
            i += 1                                              # a regular expression literal: skip it (and its [classes])
            cls = False
            while i < n and (code[i] != "/" or cls):
                if code[i] == "\\":
                    i += 1
                elif code[i] == "[":
                    cls = True
                elif code[i] == "]":
                    cls = False
                elif code[i] == "\n":
                    break
                i += 1
            i += 1
            last = "v"
            continue
        is_code[i] = 1
        if c == "{":
            stack.append(i)
        elif c == "}" and stack:
            match[i] = stack.pop()
        if not c.isspace():
            last = c if c in "(,=:[!&|?{};+-*%<>~^)]}" else "v"
        i += 1
    return is_code, match


def _ends_value(code, end, match):
    """Whether the code just before position `end` finishes a value (so a following ( [ or ` would continue it)."""
    j = end - 1
    while j >= 0 and code[j].isspace():
        j -= 1
    if j < 0:
        return False
    c = code[j]
    if c != "}":
        return bool(re.match(r"[\w$)\]'\"`]", c)) and not re.search(r"\b(return|else|do|typeof|case)$", code[max(0, j - 8):j + 1])
    o = match.get(j)
    if o is None:
        return False
    before = code[max(0, o - 200):o].rstrip()
    if re.search(r"(=>|\bfunction\b\s*[\w$]*\s*\([^()]*\))$", before):       # a function body: a value only if the function is an expression
        head = before[:re.search(r"(=>|\bfunction\b\s*[\w$]*\s*\([^()]*\))$", before).start()].rstrip()
        if before.endswith("=>"):
            return True
        return bool(re.search(r"([=(:,?&|!]|\breturn)$", head))
    return bool(re.search(r"([=(:,?&|!]|\breturn)$", before))                # an object literal is a value; a block is not


def joined_lines(code):
    """Line pairs that JavaScript reads as one expression although they look like two statements (ESLint no-unexpected-multiline)."""
    is_code, match = _scan(code)
    found, pos = [], 0
    for n, line in enumerate(code.split("\n"), 1):
        k = pos + len(line) - len(line.lstrip())
        if k < len(code) and is_code[k] and code[k] in "([`" and _ends_value(code, pos, match):
            prev = code[:pos].rstrip().rsplit("\n", 1)[-1]
            found.append("line %d: %s  <-  %s" % (n, line.strip()[:50], prev.strip()[-50:]))
        pos += len(line) + 1
    return found


sources = []                                                       # (label, code)
for name, page in rendered.items():
    for i, s in enumerate(SCRIPT.findall(page)):
        sources.append(("%s, script %d" % (name, i + 1), s))
for p in files("**/*.html"):
    with open(p, encoding="utf-8") as f:
        for i, s in enumerate(SCRIPT.findall(f.read())):
            sources.append(("%s, script %d" % (os.path.relpath(p, ROOT), i + 1), s))
for p in files("shared/*.js") + files("tools/*.js") + files("marketing/*.gs") + files("*.js"):
    with open(p, encoding="utf-8") as f:
        sources.append((os.path.relpath(p, ROOT), f.read()))

node = shutil.which("node")
parse_errors, joins = [], []
for i, (label, code) in enumerate(sources):
    if node and code.strip():
        tmp = os.path.join(TMP, "s%d.js" % i)
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(code)
        r = subprocess.run([node, "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            msg = [x for x in r.stderr.splitlines() if "Error" in x]
            parse_errors.append("%s: %s" % (label, (msg[0] if msg else r.stderr.strip())[:160]))
    for j in joined_lines(code):
        joins.append("%s %s" % (label, j))
t("every script parses (%d scripts: pages the server builds, the app's HTML, shared, tools, Apps Script)" % len(sources), bool(node) and not parse_errors,
  "; ".join(parse_errors) or ("" if node else "node is not installed"))
t("no line break that JavaScript would silently join (a line starting with ( [ or ` after a value)", not joins, "\n   ".join(joins[:10]))

# the check itself works: it catches the mistake that once broke the setup page, and does not cry wolf on safe code
SHOULD_FLAG = ["document.getElementById('sv').onclick=function(){go()}\n(function(){sync()})();", "x={a:1}\n[1].forEach(f)", "foo()\n(bar)",
               "var f=()=>{go()}\n(1)"]
FINE = ["a=function(){go()};\n;(function(){sync()})();", "if(a){b()}\n[1].forEach(f)", "var s=`a\n(x)\n`;", "function g(){go()}\n(function(){})()",
        "var r=/" + chr(92) + "d{6}/;\nif(a){}\n(function(){})()", "return\n(x)"]
t("...and that check catches the mistake that once broke the setup page (and %d like it), with no false alarms on %d safe patterns" % (len(SHOULD_FLAG) - 1, len(FINE)),
  all(joined_lines(c) for c in SHOULD_FLAG) and not any(joined_lines(c) for c in FINE),
  "missed: %s; false alarms: %s" % ([c for c in SHOULD_FLAG if not joined_lines(c)], [c for c in FINE if joined_lines(c)]))

# ---- 4. shell scripts parse --------------------------------------------------------------------------------------------------------------
bash = shutil.which("bash")
sh_bad = []
for p in files("**/*.sh"):
    r = subprocess.run([bash, "-n", p], capture_output=True, text=True) if bash else None
    if r is not None and r.returncode != 0:
        sh_bad.append("%s: %s" % (os.path.relpath(p, ROOT), r.stderr.strip()[:160]))
t("every shell script parses (bash -n, %d files)" % len(files("**/*.sh")), bool(bash) and not sh_bad, "; ".join(sh_bad) or ("" if bash else "bash is not installed"))

shutil.rmtree(TMP, ignore_errors=True)
print("\n%d / %d" % (ok, ok + bad))
sys.exit(1 if bad else 0)
