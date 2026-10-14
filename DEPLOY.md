# Putting UAply online and in the app stores

**`dev` is the release build.** It has no developer bar, no test labels, no simulated sign-in, no example companies and no paid
plans, and it starts every new profile blank. `sandbox` is the test bench and keeps all of that. See `CHANGELOG.md`.

## Before real users: your checklist
1. **Host the server** (section 1 below). Until then nothing is online: the phone app's address returns 404.
2. **Google sign-in (free):** UAply uses Google's own "Continue with Google" button (the same system LinkedIn, Indeed and others use), so people can pick
   the Google account already signed in on their browser. It needs only the public **client ID**: in console.cloud.google.com/apis/credentials create an
   OAuth client ID (Web application), set the consent screen to External and **Publish app**, add your website address under *Authorized JavaScript
   origins* (for testing `http://localhost:8767`), then paste the client ID into the "Connect Google sign-in" box at `/setup` (or `UAPLY_CONFIG_JSON` on a
   host). No secret is needed. Google blocks its sign-in inside an iPhone app's built-in browser, so the iPhone app hides the Google button until a native
   Google sign-in plugin (and Sign in with Apple, which Apple then requires) is added. Password sign-up works everywhere.
3. **Email** (password resets, receipts): create a Gmail App Password (needs 2-Step Verification) or use a transactional email
   service, then run `python tools/setup-config.py`. `/setup` has a "Send test email" button. Without it, reset links only reach
   the test inbox, so a real person cannot reset a password.
4. **Real jobs:** `render.yaml` sets `UAPLY_FEEDS=greenhouse,lever,ashby` for dev (link-out only: UAply never emails those
   employers). Those boards are public, but their terms do not clearly cover aggregators; have your attorney confirm, or remove the
   line to switch them off. USAJOBS (free key) is the cleanest official source if you want to add one.
5. **Legal pages:** fill every yellow blank in `legal/` (company legal name, street address, contact and privacy email, launch date,
   DMCA agent, liability amount, governing state and county, how long records are kept, host, response time) and have a lawyer
   review them. They say "draft, not reviewed by a lawyer" until you do.
6. **Apple:** Developer Program ($99/year), a Mac or a cloud Mac build service for `mobile/ios`, App Privacy answers, a demo
   account for the reviewers, and a support URL. Apple may reject apps that only wrap a website, so show the phone features
   (reminders, vibration, share sheet).
7. **Name:** a pending trademark filing for APLY (recruitment app) overlaps "UAply". Get a clearance search before spending on
   branding. See `LEGAL-REVIEW.md`.


## 1. Website (Render)
1. Push this repository to GitHub (the `sandbox` and `dev` branches).
2. At render.com: sign up, then **New > Blueprint** and pick this repository. It reads `render.yaml` and creates
   `uaply-dev` and `uaply-sandbox`, each with a 1 GB disk for accounts, applications and feedback.
3. When Render asks for the secret values, enter:
   - `ANTHROPIC_API_KEY`: your key from console.anthropic.com (turns on AI answers in the assistant).
   - `OWNER_PASSWORD`: a long password of your choice for `/outbox` and `/feedback`.
   - `SUPPORT_EMAIL`: the address for "Talk to a person", for example `uaplytechnologies@gmail.com`. Every help request and problem report from the
     assistant is emailed there with the person's own email as the reply address, so you answer by pressing Reply. It needs the email login in
     `UAPLY_CONFIG_JSON` (the `smtp` part, see below); without it requests are only saved on the owner's Feedback page and the chat says so.
   - `UAPLY_CONFIG_JSON`: the email login and Google client ID as one line of JSON (see the sections below). Leave it empty to stay in test mode:
     nothing is emailed to employers, sign-up codes and receipts only appear in the test inbox.
4. Your sites: `https://uaply-dev.onrender.com` and `https://uaply-sandbox.onrender.com` (Render shows the exact names).

Changing the API key later (for example to a business key) is only an edit of `ANTHROPIC_API_KEY` in Render's
dashboard; no code changes.

Before real users: fill the blanks in `legal/`, and keep `delivery` in test mode until partner employers have agreed.

## 2. App Store and Google Play (Capacitor, in `mobile/`)
The app opens the hosted dev site (`mobile/capacitor.config.json`, `server.url`). Update that URL if Render's name differs,
then run `npx cap sync` in `mobile/`.
- **Already done:** the Android project (`mobile/android`) and iPhone project (`mobile/ios`) exist, with the UAply icon,
  splash screens and three phone features: interview reminders (local notifications), a vibration on each swipe, and
  the share sheet. These only run inside the app; the website is unchanged.
- **Android (works on Windows):** install Android Studio (accepting Google's Android SDK license), open `mobile/android`,
  and build a signed app bundle. Google Play developer account: one-time fee. Keep the signing key safe: losing it
  means you can't update the app.
- **iPhone (needs a Mac):** on Windows use a cloud Mac build service (for example Codemagic) with `mobile/ios`.
  Apple Developer account: yearly fee.
- **Review risk:** Apple can reject apps that only wrap a website ("minimum functionality"). The reminders, vibration,
  share sheet and offline screen help; push notifications for new matches (needs Apple and Firebase accounts) would help more.
- **Store forms:** both stores need the privacy policy URL (`/legal/privacy.html`) and accurate privacy answers; account
  deletion already exists in the app (Profile, Account).
