#!/usr/bin/env bash
# Runs every check on this computer with throwaway data and its own servers, then prints one summary.
#   bash tools/run-all-tests.sh
# Needs Node, Python 3 and Google Chrome. It never touches your real data/ folder or uaply-config.json secrets
# (it ignores uaply-config.json by pointing UAPLY_CONFIG_JSON at its own settings).
cd "$(dirname "$0")/.." || exit 1
TMP="${TMPDIR:-/tmp}/uaply-tests-$$"
mkdir -p "$TMP"
FAILS=0
PIDS=""
trap 'for p in $PIDS; do kill "$p" 2>/dev/null; done; rm -rf "$TMP"' EXIT

step() { printf "\n== %s\n" "$1"; }
run() {   # run <label> <command...>: pass if exit 0
  local label="$1"; shift
  if out=$("$@" 2>&1); then
    n=$(echo "$out" | grep -Eo '^[0-9]+ / [0-9]+$' | tail -1)          # the test's own "passed / total" line, so the count here is never stale
    printf "  PASS  %s%s\n" "$label" "${n:+ ($n)}"
  else printf "  FAIL  %s\n" "$label"; echo "$out" | tail -15 | sed 's/^/        /'; FAILS=$((FAILS+1)); fi
}
start() { ( "$@" >/dev/null 2>&1 & echo $! ) ; }
wait_port() { for _ in $(seq 1 60); do curl -s -o /dev/null "http://127.0.0.1:$1/healthz" 2>/dev/null && return 0; curl -s -o /dev/null "http://127.0.0.1:$1/" 2>/dev/null && return 0; sleep 0.5; done; return 1; }
# a config that switches the real-jobs feed on and nothing else (so the run never uses your own keys)
FEEDS='{"feeds":["greenhouse","lever","ashby"],"delivery":"test","smtp":{},"google":{},"owner_copy":"","anthropic_api_key":""}'
unset ANTHROPIC_API_KEY

step "Static checks (syntax of every script, Python lint, JSON, legal pages, release flags, hosted builds)"
run "node check.js" node check.js
run "audit of every file (JSON, Python, JS, HTML, links, XML, images, secrets, git hygiene)" python tools/audit-files.py

step "Servers"
mkdir -p "$TMP/sb" "$TMP/dv" "$TMP/pub" "$TMP/smtp" "$TMP/g"
export UAPLY_CONFIG_JSON="$FEEDS"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/sb" start python serve.py 18766 sandbox --api)"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/dv" start python serve.py 18767 dev --api)"
wait_port 18766 && wait_port 18767 && echo "  sandbox on 18766, dev on 18767" || { echo "  FAIL  servers did not start"; exit 1; }
# wait for the real-jobs feed to be ready on dev
for _ in $(seq 1 120); do n=$(curl -s http://127.0.0.1:18767/api/jobs | python -c "import sys,json; print(len(json.load(sys.stdin)['jobs']))" 2>/dev/null); [ "${n:-0}" -gt 100 ] && break; sleep 1; done
echo "  real postings on dev: ${n:-0}"

step "Job feed rules (US-only, no foreign roles, classification)"
run "job rules and descriptions" python tools/test-jobs.py

step "Email codes that prove an email is real"
run "verification codes: expiry, tries, resends, gates" python tools/test-verify.py

step "Delivery to employers (email with resume, signed webhook, retries, opt-in only) and the Connect Gmail form"
run "delivery channels" python tools/test-delivery.py
run "Connect Gmail form" python tools/test-setup.py

step "Swipe-right emails (content, test label, safety, real send)"
run "receipt and owner copy emails" python tools/test-emails.py
run "help requests from the assistant reach the support inbox" python tools/test-support.py
run "applications go straight into employers' hiring systems (Greenhouse, Lever)" python tools/test-ats.py
run "swipe right to apply instantly, end to end" python tools/test-ats-flow.py
run "paid plans: Stripe checkout, signed webhook, limits" python tools/test-billing.py
run "Hiring mode: company, postings, feed, applicants (sandbox only)" python tools/test-employers.py

step "Accounts, applying, reset and setup (back end)"
run "sandbox reset/setup/accounts" python tools/test-reset.py 18766
run "dev reset/setup/accounts" python tools/test-reset.py 18767

step "Screens in a real browser (iPhone size)"
run "dev: release checks, no test or developer content anywhere" env W=390 H=844 PORT=18767 node tools/cdp.js tools/ui-release.js
run "dev: every screen and button" env REL=1 PORT=18767 node tools/cdp.js tools/ui-sweep.js
run "dev: forgot password, emailed link, new password, change password" env PORT=18767 node tools/cdp.js tools/ui-reset.js
run "nothing is cut off at 320 to 430 px" env PORT=18767 node tools/ui-widths.js
run "sandbox: every screen and button" env PORT=18766 node tools/cdp.js tools/ui-sweep.js
run "dev: every way of swiping, and what each sends (LinkedIn, resume, one email)" env W=390 H=844 PORT=18767 node tools/cdp.js tools/ui-swipes.js
run "dev: the app copes when the server fails, goes offline or sends garbage" env W=390 H=844 PORT=18767 node tools/cdp.js tools/ui-errors.js
run "dev: skill chips, the empty Add button and the file downloads" env W=390 H=844 PORT=18767 node tools/cdp.js tools/ui-effects.js
run "sandbox: every profile checklist item lands on its field" env W=390 H=844 PORT=18766 node tools/cdp.js tools/ui-checklist.js
run "sandbox: hostile text in every form never runs, and the owner's inbox escapes it" env W=390 H=844 PORT=18766 node tools/cdp.js tools/ui-inject.js
run "dev: hostile text in every form never runs, and the owner's inbox escapes it" env W=390 H=844 PORT=18767 node tools/cdp.js tools/ui-inject.js

step "Google sign-in (against a stand-in Google)"
PIDS="$PIDS $(start python tools/mock-google.py 8790)"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/g" UAPLY_CONFIG_JSON='{"google":{"client_id":"test.apps.googleusercontent.com","client_secret":"test-secret","auth_url":"http://127.0.0.1:8790/auth","token_url":"http://127.0.0.1:8790/token","certs_url":"http://127.0.0.1:8790/certs"}}' start python serve.py 18768 dev --api)"
wait_port 18768
run "Google sign-in, attacks and failures" python tools/test-google.py 18768
run "Continue with Google button: tokens, forged tokens, linking, cookies" python tools/test-google-token.py 18768
run "sign-up and email-code screens in a browser, Google button area" env W=390 H=844 PORT=18768 node tools/cdp.js tools/ui-verify.js

step "Public server behind HTTPS (how a real host runs it)"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/pub" HOST=0.0.0.0 OWNER_PASSWORD=ownerpw UAPLY_CONFIG_JSON='{}' start python serve.py 18772 dev --api)"
wait_port 18772
run "cookies, headers, owner pages, path traversal, limits" python tools/test-public.py 18772

step "Real email sending (against a stand-in mail server)"
PIDS="$PIDS $(start python tools/fake-smtp.py 12525 "$TMP/smtp/mail.jsonl")"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/smtp" HOST=0.0.0.0 OWNER_PASSWORD=ownerpw UAPLY_CONFIG_JSON='{"smtp":{"host":"127.0.0.1","port":12525,"starttls":false,"from_addr":"uaply@example.com"},"owner_copy":"owner@example.com"}' start python serve.py 18773 dev --api)"
wait_port 18773
run "password reset email, link, single use, no stored link" python tools/test-smtp.py 18773 "$TMP/smtp/mail.jsonl"

step "A burst of visitors (300 at once, sign-ups, a password-guessing attack)"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/stress" UAPLY_CONFIG_JSON='{"feeds":[],"smtp":{},"owner_copy":""}' start python serve.py 18774 dev --api)"
wait_port 18774
run "simultaneous reads, sign-ups and wrong passwords: no errors, lock-out holds" python tools/stress.py 18774

step "Hostile input (every endpoint, wrong types, injection strings, odd headers)"
PIDS="$PIDS $(UAPLY_DATA_DIR="$TMP/fuzz" HOST=0.0.0.0 OWNER_PASSWORD=ownerpw UAPLY_CONFIG_JSON='{"feeds":[],"smtp":{},"owner_copy":""}' start python serve.py 18775 dev --api)"
wait_port 18775
run "no crash, hang or leaked error text across every endpoint" python tools/fuzz-api.py 18775

printf "\n"
if [ "$FAILS" -eq 0 ]; then echo "ALL TESTS PASSED"; else echo "$FAILS test group(s) FAILED"; fi
exit "$FAILS"
