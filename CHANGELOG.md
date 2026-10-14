# Changelog

How versions move: work happens in `sandbox`, is tested there, and goes to `dev` through a pull request. `dev` is the release
build: it is what the hosted site and the phone apps run. Each version is tagged on GitHub (Releases). `main` is the original
production page and only changes when the owner decides.

## 1.0.0-rc.5 (release candidate)

Sign-in the way the big job sites do it: Google's own button, and an email code that proves an email is real.

- **Continue with Google** now uses Google's own button (Google Identity Services, as on LinkedIn and Indeed). It shows the Google accounts already
  signed in on the person's browser; one tap signs them in. UAply never sees their Google password. It needs only the **public client ID**, no secret.
  The server checks Google's signed token itself (`jwt_rs256.py`, standard library only): the signature against Google's published keys, that it was
  issued for UAply's own client ID, the issuer, the expiry, that Google says the email is verified, and it only accepts the RS256 algorithm (forged,
  expired, wrong-app, tampered, "none" and shared-secret tokens are all refused). People are identified by Google's permanent id, not their email.
  The older redirect sign-in is kept as a fallback.
- **Email verification code for password accounts:** sign-up emails a 6-digit code (10 minutes, 5 tries, one use, stored only as a hash, at most 3
  new codes an hour). Until verified, a person can still swipe but gets no confirmation emails and cannot apply directly to an employer. Accounts made
  with Google, or confirmed through an emailed reset link, are verified automatically.
- **Direct applications to employers need a verified account** whose email is the one on the application, so replies go to an address proven theirs.
- **Bug fixed:** Google's button sets its own cookie (`g_state`), and the server's cookie parser threw away the whole header, signing people out. The
  server now reads cookies tolerantly. Found by running the real browser flow; covered by a test.
- **Setup page:** a "Connect Google sign-in" box (paste the public client ID) next to Connect Gmail. Both only work on the owner's own computer.
- **iPhone note:** Google blocks its sign-in inside an app's built-in browser, so the iPhone app keeps the Google button hidden until a native Google
  sign-in plugin (and Sign in with Apple) is added. Email and password sign-up works there.
- New tests: `tools/test-google-token.py` (27), `tools/test-verify.py` (24), `tools/ui-verify.js`, more in the delivery, setup and public suites.

## 1.0.0-rc.4 (release candidate)

- **The swipe message now says where the test confirmation is.** With no real email connected, a signed-in swipe saves the confirmation in the test
  inbox page of the owner's own server, and the message gives its address (for example `http://localhost:8767/outbox`). Before, it only said
  "in the test inbox". A hosted server has no such page, so real users are told nothing about it. `tools/ui-swipes.js` checks both.

## 1.0.0-rc.3 (release candidate)

Applications now reach employers who connect, with the person's resume, and swiping is covered by tests of every gesture.

- **Employers can connect two ways** (`EMPLOYERS.md`): an email address, and/or a signed webhook (the model Indeed Apply uses: an HTTPS
  address per employer that receives each application as JSON, retried up to three times, never followed through a redirect).
  Employers who did not connect are never sent anything, so those jobs stay a hand-off to the employer's own page.
- **The resume file is sent.** The file uploaded under Preferences travels with the application: attached to the employer's email and
  inside the webhook. It is checked by content (a real PDF, Word or text file under 1 MB) and never stored on the server.
- **LinkedIn, phone, portfolio and the short summary now reach the employer in the release build.** They were saved under Resume and links
  but never sent, because only the optional profile form's fields were. The LinkedIn box says it is sent, and only real linkedin.com
  links are accepted.
- **Swipe-right messages are short:** "Applied to X." or "Saved. Finish applying at X.", plus one short line about the confirmation email.
  No more "A copy was emailed to you" or sign-in instructions beyond one sentence.
- **One swipe, one email** when the signed-in account is the owner address (the owner copy is skipped).
- **Job descriptions in emails start at the role** ("What you'll do"), not the company's introduction, and end on a whole sentence.
- **Connect Gmail form on the setup page:** paste the Gmail address and App Password into a local page (never into chat); it saves them in the
  git-ignored config and sends a test email. Hosted servers refuse it (their secrets live in the host's dashboard).
- **Menu wording:** Services now says "Coop" (was "Co-ops").
- New tests: `tools/test-delivery.py` (32), `tools/test-setup.py` (17), `tools/ui-swipes.js` (every gesture: buttons, keyboard, finger drags in
  both directions, undo, double tap, reload), and more in the email and job suites.

## 1.0.0-rc.2 (release candidate)

Found by running dev the way a real host runs it (public, behind HTTPS, cold start, no test data), and fixed.

- **Cold start:** for ~20-40 seconds after a restart a visitor saw a made-up example job. The release build now shows
  "Finding jobs for you…", and "Could not load jobs" if the feed fails; it never shows example jobs.
- **Restarts are instant:** the last good postings are saved on disk (`jobs-cache.json` in the data folder), so a restart or a new
  deploy shows jobs at once and refreshes in the background. Feed fetches now run 16 at a time.
- **Honest scores:** a new visitor now sees "Matches below use an example profile. Enter your details" (it was hidden in dev, so
  the card claimed a 100% match for a person with no profile). The "N jobs left" counters stay off.
- **Forgot password on a server without email** now says reset by email is not available and points to Help, instead of
  promising a link that goes to a private test inbox.
- **Right swipe emails rewritten** (`emails.py`): every swipe right now sends the applicant a clear receipt and the owner a copy. Each
  one says what happened in a plain headline, shows the job (company, title, place, type, work style, pay, match, date and time),
  the job description, what was shared, what a swipe right means, what happens next and where to track it. A swipe that sends nothing
  (the employer takes applications on its own site) says so and gives a "Finish your application" button. In test mode the subject
  starts with [TEST] and a banner explains that nothing went to the employer. Plain text plus HTML; all text from people and job feeds
  is escaped. The design follows what Handshake and Indeed document about their confirmations; LinkedIn and ZipRecruiter do not
  publish theirs. With an email login set up, receipts are really sent in test mode too (to the applicant's own address only).
- **Foreign jobs removed from the US feed:** "Toronto, ON, CA" was read as California, and roles titled ANZ or LATAM passed because
  their location said "Remote". Locations are now checked part by part; the saved job cache is versioned so old results are dropped.
- **Test emails to the owner:** the owner copy address and the setup page's test email can be pointed at any address. The setup page
  now says "no App Password yet" instead of a mail-server error.
- **Old name leftovers fixed:** the backup file, the applications CSV and calendar reminders still used "aply"; old backups still import.
- **Deep file audit** (`tools/audit-files.py`, also run in CI): every file by type, links, secrets, line endings, git hygiene.
- **The test suite no longer touches your servers:** `tools/run-all-tests.sh` uses its own ports (18766 and up).
- A pull request template and `CONTRIBUTING.md` set the standard: every PR gets a plain-words title and a full description.
- New tests: `tools/test-emails.py` (41), `tools/test-jobs.py` (23), `tools/test-public.py` (cookies, headers, owner pages, path traversal, limits: 33), `tools/test-smtp.py` with
  `tools/fake-smtp.py` (real SMTP end to end: 12), `tools/ui-widths.js` (nothing cut off from 320 to 430 px) and
  `tools/run-all-tests.sh`, which runs everything with one command on throwaway data.

## 1.0.0-rc.1 (release candidate)

The first release build. Everything below is in `dev`.

### What a user gets
- Swipe through **real postings** from employers' own public career pages (Greenhouse, Lever, Ashby), with internships,
  part-time roles and co-ops under Services. Swiping right on a real job opens the employer's own application page; UAply never
  emails an employer that has not agreed to receive applications.
- **Accounts** with email and password: sign up (18+ and Terms), log in, **forgot password** by emailed one-hour link, change
  password, delete account. **Sign in with Google** is built and switches on when Google keys are added.
- Dashboard (Applied, Accepted, Rejected, Interviews), Profile (Settings, Resume and links, Preferences, Filters), Data and
  privacy (backup, restore, delete, and the legal pages).
- UAply Assistant: help answers from written articles (AI answers when an Anthropic key is set), plus feedback.

### What is different from sandbox (the release build)
- No developer bar, no "SANDBOX / TEST MODE" labels, no simulated Google/Apple/email-link/phone sign-in.
- No made-up example companies; only real postings.
- No paid plans or test payments (Apple requires its own in-app purchase for those; left out of version 1).
- A new profile starts **blank** (it used to be pre-filled with a sample person, which hid every real job).
- The assistant's answers use the release wording and do not mention plans.
- Inside the iPhone app, the Google button stays hidden until Sign in with Apple exists (App Store guideline 4.8).

### Fixed on the way
- Hosted pages broke on phones when `$` sequences in the navigation script were mangled by the page builder.
- A board with hundreds of senior roles used to push its internships out of the feed.
- The documentation example employer ("Example Partner Co") was served as a real job when no partner file existed.
- An email login with no password used to count as "email is set up".

### Checks that guard this release
`node check.js` (syntax of every script, Python lint, JSON, legal pages, release flags, hosted builds) runs on every push and pull
request. Browser tests in `tools/`: `ui-release.js` (no test or developer content on any screen), `ui-sweep.js`, `ui-audit.js`
(every button at iPhone size), `ui-reset.js`; Python tests `test-reset.py` and `test-google.py`.

### Not done yet (the owner's steps)
See `DEPLOY.md`: host the server, add the Google and Gmail keys, fill the blanks in the legal pages and have an attorney review
them, enroll in the Apple Developer Program, and build the iPhone app. Not built: email verification at sign-up, Sign in with Apple.
