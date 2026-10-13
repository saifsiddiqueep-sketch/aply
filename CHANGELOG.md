# Changelog

How versions move: work happens in `sandbox`, is tested there, and goes to `dev` through a pull request. `dev` is the release
build: it is what the hosted site and the phone apps run. Each version is tagged on GitHub (Releases). `main` is the original
production page and only changes when the owner decides.

## Unreleased (sandbox and dev)

### Profile setup, and what really changes your matches
- **Profile setup** is now one guided flow, five short steps (About you, Jobs you want, Where and pay, Background and links,
  Eligibility and extras), saved as you go, the same on phone and desktop. The old Settings, Resume and links, and Preferences
  screens are folded into it, so the Profile menu has five items instead of seven. On desktop (960px and wider) a live "What
  employers see" card sits beside the questions.
- Deleting an account is tucked under "More account options", with a short skippable exit survey (anonymous).
- **Your answers now do more work.** Your headline, About you and major count as skills a job asks for. Work style: tick nothing
  and every style scores full points; the new "Hide work styles I did not pick" filter hides the rest. The opportunity types you
  pick open first in Services. State and ZIP code help find where you live for the distance filter. One completeness score is used
  everywhere. Optional EEO answers, work authorization and GPA are never used to score, rank or hide jobs.
- dev now includes the Application profile (phone, links, school, work authorization, opportunity types) so those details reach
  employers; before, dev sent none of them.
- Fixed: errors on the Account screen were off-screen; a new profile was pre-filled with a stranger's email; restoring a backup
  dropped the Application profile answers; the Account screen showed fake Google/Apple/phone sign-in previews next to the real
  form; the desktop form was capped at half width; password, file and month inputs were unstyled; tap targets under 44px.

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
