"""Feed health check: opens every employer job board UAply reads and reports any that are down, empty or slow.
  python tools/feed-health.py [report folder]
Read-only: it only reads the boards' public pages, the same requests the app makes. It writes one Markdown report,
feed-health-YYYY-MM-DD.md, into the folder (default: Documents/uaply-bot-reports) and prints it. Exit 1 if any board failed."""
import datetime
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
os.environ.setdefault("UAPLY_CONFIG_FILE", "none")          # never the owner's email or keys
os.environ.setdefault("UAPLY_DATA_DIR", os.path.join(os.environ.get("TEMP", "/tmp"), "uaply-feed-health"))
sys.path.insert(0, ROOT)
import jobs_api  # noqa: E402

out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "Documents", "uaply-bot-reports")
os.makedirs(out_dir, exist_ok=True)
today = datetime.date.today().isoformat()

rows, bad, empty, skipped = [], [], [], []
for src in jobs_api.SOURCES:
    kind, token, name = src
    t0 = time.time()
    try:
        jobs, status = jobs_api._fetch_source(src)
    except Exception as e:                                   # a board that breaks the reader itself
        jobs, status = [], "error: %s" % type(e).__name__
    secs = time.time() - t0
    n = len(jobs)
    state = ("skipped" if status == "no key" else                  # a feed that needs a key the owner has not added yet (USAJOBS): not down, just off
             "down" if status.startswith("error") else ("empty" if n == 0 else ("slow" if secs > 10 else "ok")))
    if state == "down":
        bad.append(name + " (" + kind + "/" + token + ")")
    elif state == "empty":
        empty.append(name + " (" + kind + "/" + token + ")")
    elif state == "skipped":
        skipped.append(name + " (" + kind + "/" + token + ")")
    student = sum(1 for j in jobs if j.get("type") in ("internship", "coop", "parttime"))
    rows.append((state, name, kind, token, n, student, round(secs, 1), status))

order = {"down": 0, "empty": 1, "skipped": 2, "slow": 3, "ok": 4}
rows.sort(key=lambda r: (order[r[0]], r[1]))
ok = sum(1 for r in rows if r[0] == "ok")
lines = ["# UAply feed health, " + today, "",
         "%d of %d boards answered with jobs. %d down, %d empty, %d skipped (no key)." % (ok + sum(1 for r in rows if r[0] == "slow"), len(rows), len(bad), len(empty), len(skipped)), ""]
if bad:
    lines += ["**Down:** " + ", ".join(bad), ""]
if empty:
    lines += ["**Empty (answered, but no jobs UAply can show):** " + ", ".join(empty), ""]
if skipped:
    lines += ["**Skipped (no key yet; add it in the Job feed keys box at /setup):** " + ", ".join(skipped), ""]
lines += ["| State | Board | Source | Jobs | Internships, co-ops, part-time | Seconds | What the board said |", "|---|---|---|---|---|---|---|"]
for state, name, kind, token, n, student, secs, status in rows:
    lines.append("| %s | %s | %s/%s | %d | %d | %s | %s |" % (state, name, kind, token, n, student, secs, status.replace("|", "/")[:120]))
lines += ["", "Read-only check: it fetched each board's public listing, the same request the app makes, and changed nothing."]
report = "\n".join(lines) + "\n"
path = os.path.join(out_dir, "feed-health-%s.md" % today)
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(report)
print(report)
print("Saved:", path)
sys.exit(1 if bad else 0)
