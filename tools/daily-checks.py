"""Code checks: runs the repository's own quick checks and reports what failed, the branch, uncommitted files, and whether
GitHub has work this computer does not (or the other way round).
  python tools/daily-checks.py [report folder]
Read-only: it never edits, commits, pushes or switches branches (it only fetches, to compare with GitHub). It writes one
Markdown report, checks-YYYY-MM-DD.md, into the folder (default: Documents/uaply-bot-reports). Exit 1 if a check failed."""
import datetime
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "Documents", "uaply-bot-reports")
os.makedirs(out_dir, exist_ok=True)
today = datetime.date.today().isoformat()
env = dict(os.environ, UAPLY_CONFIG_FILE="none", PYTHONIOENCODING="utf-8")       # never the owner's email or keys


def run(cmd, timeout=600):
    t0 = time.time()
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout, env=env)
        return p.returncode, (p.stdout + p.stderr), time.time() - t0
    except FileNotFoundError:
        return None, "not installed", 0
    except subprocess.TimeoutExpired:
        return 1, "took longer than %d s" % timeout, time.time() - t0


def git(*args):
    code, out, _ = run(["git"] + list(args), 120)
    return out.rstrip() if code == 0 else ""          # rstrip: "git status --porcelain" lines start with a meaningful space


checks = [("Syntax of every script, sandbox and dev patches, legal pages, release flags, Python lint, hosted copies", ["node", "check.js"]),
          ("Audit of every file (JSON, Python, JS, HTML, links, images, secrets, git hygiene)", [sys.executable, "tools/audit-files.py"]),
          ("Every page and email renders; every script parses; no silently joined lines; shell scripts parse", [sys.executable, "tools/test-pages.py"]),
          ("Python syntax errors and undefined names (Ruff)", [sys.executable, "-m", "ruff", "check", "--select", "E9,F63,F7,F82", "."])]
results = []
for label, cmd in checks:
    code, out, secs = run(cmd)
    if code is None or (cmd[1:3] == ["-m", "ruff"] and "No module named ruff" in out):
        results.append(("skipped", label, "not installed on this computer", secs))
        continue
    tail = [ln for ln in out.splitlines() if ln.strip()]
    problems = [ln.strip() for ln in tail if ln.lstrip().startswith(("FAIL", "fail ", "ERROR", "error", "x ")) or " error" in ln.lower()[:40]]
    results.append(("pass" if code == 0 else "FAIL", label, ("; ".join(problems[:6]) or (tail[-1] if tail else ""))[:400], secs))

branch = git("rev-parse", "--abbrev-ref", "HEAD")
dirty = [ln for ln in git("status", "--porcelain").splitlines() if ln.strip()]
git("fetch", "--quiet", "origin")
ahead_behind = git("rev-list", "--left-right", "--count", "HEAD...origin/" + branch) if branch else ""
ahead, behind = (ahead_behind.split() + ["?", "?"])[:2]
incoming = git("log", "--format=%h %an: %s", "HEAD..origin/" + branch).splitlines()[:10] if branch else []

failed = [r for r in results if r[0] == "FAIL"]
lines = ["# UAply code checks, " + today, "",
         ("All %d checks passed." % sum(1 for r in results if r[0] == "pass")) if not failed else ("**%d check(s) failed.** Nothing was changed; this report only lists them." % len(failed)), "",
         "| Result | Check | Seconds | Detail |", "|---|---|---|---|"]
for state, label, detail, secs in results:
    lines.append("| %s | %s | %d | %s |" % (state, label, secs, detail.replace("|", "/")))
lines += ["", "## The repository", "",
          "- Branch: **%s**" % (branch or "unknown"),
          "- Uncommitted files: %d%s" % (len(dirty), (" (" + ", ".join(d[3:] for d in dirty[:8]) + ("..." if len(dirty) > 8 else "") + ")") if dirty else ""),
          "- Compared with GitHub: %s commit(s) here that GitHub does not have, %s on GitHub that this computer does not have." % (ahead, behind)]
if incoming:
    lines += ["", "Waiting on GitHub (someone else's work, not on this computer yet):", ""] + ["- " + c for c in incoming]
lines += ["", "Read-only: the checks were run as they are; nothing was edited, committed, pushed or switched."]
report = "\n".join(lines) + "\n"
path = os.path.join(out_dir, "checks-%s.md" % today)
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(report)
print(report)
print("Saved:", path)
sys.exit(1 if failed else 0)
