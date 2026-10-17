# Putting UAply online and in the app stores

**`dev` is the release build.** It has no developer bar, no test labels, no simulated sign-in, no example companies and no paid
plans, and it starts every new profile blank. `sandbox` is the test bench and keeps all of that. See `CHANGELOG.md`.

## Before real users: your checklist
1. **Host the server** (section 1 below). Until then nothing is online: the phone app's address returns 404.
2. **Google sign-in (free):** see section 3 below. On computers and Android phones UAply shows Google's own "Continue with Google"
   button (people pick the Google account already signed in on their browser); it needs only the public **client ID**. On iPhone and
   iPad Google requires its full-page sign-in instead, which also needs the **client secret** on the server. Google blocks sign-in
   inside an app's built-in web view, so the Android and iPhone apps hide the Google button until a native Google sign-in plugin (and
   Sign in with Apple, which Apple then requires) is added. Password sign-up works everywhere.
3. **Email** (password resets, receipts): create a Gmail App Password (needs 2-Step Verification) or use a transactional email
   service, then run `python tools/setup-config.py`. `/setup` has a "Send test email" button. Without it, reset links only reach
   the test inbox, so a real person cannot reset a password.
4. **Real jobs:** `render.yaml` sets `UAPLY_FEEDS=greenhouse,lever,ashby` for dev and sandbox (link-out only: UAply never emails those
   employers). Those boards are public, but their terms do not clearly cover aggregators; have your attorney confirm, or remove the
   line to switch them off. More sources (each switched on by adding its name to `UAPLY_FEEDS` or to `"feeds"` in
   `UAPLY_CONFIG_JSON`): `smartrecruiters` (City of Philadelphia, no key), `usajobs` (federal jobs; needs a free key from
   https://developer.usajobs.gov/APIRequest/, skipped with the status "no key" until then), `muse` (register a free key at
   https://www.themuse.com/developers/api/v2), `jobicy`, `remotive`. Keys go in `"feed_keys"`: on this computer paste them in the
   "Job feed keys" box at `/setup`; on Render put them in `UAPLY_CONFIG_JSON`, e.g.
   `{"feeds":["smartrecruiters","usajobs","muse","jobicy"],"feed_keys":{"usajobs":"","usajobs_email":"","muse":""}}`.
   To switch one source off by name without touching the rest: `"feeds_off":["remotive"]` (or `UAPLY_FEEDS_OFF=remotive`).
5. **Legal pages:** fill every yellow blank in `legal/` (company legal name, street address, contact and privacy email, launch date,
   DMCA agent, liability amount, governing state and county, how long records are kept, host, response time) and have a lawyer
   review them. They say "draft, not reviewed by a lawyer" until you do.
6. **Apple:** Developer Program ($99/year), a Mac or a cloud Mac build service for `mobile/ios`, App Privacy answers, a demo
   account for the reviewers, and a support URL. Apple may reject apps that only wrap a website, so show the phone features
   (reminders, vibration, share sheet).
7. **Name:** a pending trademark filing for APLY (recruitment app) overlaps "UAply". Get a clearance search before spending on
   branding. See `LEGAL-REVIEW.md`.


## 1. Website (Render)
1. Push this repository to GitHub (the `sandbox` and `dev` branches). Render reads `render.yaml` from the branch you pick for the Blueprint.
2. At render.com: sign up, then **New > Blueprint** and pick this repository. It reads `render.yaml` and creates
   `uaply-dev` and `uaply-sandbox` in Virginia (US East), each on the **Starter** plan (0.5 CPU, 512 MB; Render now also calls it `0.5c-512mb`)
   with a 1 GB disk at `/var/data` for accounts, sessions, applications, feedback and the saved job list. The free plan cannot be used: it has
   no disk (everything would vanish at each deploy), sleeps after 15 minutes and blocks email ports 465 and 587. The region cannot be changed
   later. Cost per service: Starter plus 1 GB of disk (Render shows the total before you confirm).
3. When Render asks for the secret values, enter (Render asks only this once; change them later under the service's **Environment**):
   - `ANTHROPIC_API_KEY`: your AI provider's API key (turns on AI answers in the assistant). Optional; if Render will not accept an empty
     value, type `none` (anything not starting `sk-ant-` counts as no key).
   - `OWNER_PASSWORD`: a long password of your choice for `/outbox`, `/feedback` and `/setup` (any user name). Without it those pages are off.
   - `SUPPORT_EMAIL`: the address for "Talk to a person", for example `uaplytechnologies@gmail.com`. Every help request and problem report from the
     assistant is emailed there with the person's own email as the reply address, so you answer by pressing Reply. It needs the email login in
     `UAPLY_CONFIG_JSON` (the `smtp` part, see below); without it requests are only saved on the owner's Feedback page and the chat says so.
   - `UAPLY_CONFIG_JSON`: the email login, the site address and (when you have it) the Google client ID, as one line of JSON. Example:
     `{"delivery":"test","public_url":"https://uaply.net","owner_copy":"you@example.com","smtp":{"host":"smtp-relay.brevo.com","port":587,"starttls":true,"user":"BREVO-LOGIN","password":"BREVO-SMTP-KEY","from_addr":"uaplytechnologies@uaply.net"},"google":{"client_id":"...apps.googleusercontent.com"}}`.
     `public_url` makes the links in emails point at the real site. Leave out `feeds`: `render.yaml` switches the job feeds on (`UAPLY_FEEDS`),
     and a `feeds` list here would keep them on even after that line is removed. On a hosted server `/setup` only shows what is on; its
     Connect boxes refuse to save, because the settings live here. Leave it empty to stay in test mode: nothing is emailed to employers,
     sign-up codes and receipts only appear in the test inbox.
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (sandbox only): test-mode keys, or `none` until you set up Stripe.
4. Your sites: `https://uaply-dev.onrender.com` and `https://uaply-sandbox.onrender.com` (Render shows the exact names).
5. Check each one: `/healthz` answers `{"ok": true}`, and the service's **Logs** show one line starting `[uaply] dev on 0.0.0.0:10000 (public)`.
   It must say `data: /var/data (persistent disk)`, `email: on` and `UAPLY_CONFIG_JSON: valid`. `NOT a persistent disk` means the disk is not
   attached (accounts would vanish at the next deploy); `NOT VALID JSON` means the settings line has a typo and was ignored. On the very first
   start the job list takes about a minute to fill (the server reads every employer's board once); after that it is saved on the disk and a
   redeploy shows jobs at once.
6. Your address (Cloudflare): in Render, uaply-dev, Settings, Custom Domains, add `uaply.net` (Render adds `www` and redirects it). In Cloudflare,
   DNS: delete any AAAA record for `uaply.net`, add CNAME `@` and CNAME `www`, both to `uaply-dev.onrender.com` with Proxy status **DNS only**,
   and set SSL/TLS to **Full**. Back in Render press Verify; https://uaply.net works once the certificate shows as issued. Leave the MX and TXT
   (email) records alone. Add `https://uaply.net` to the Google client ID's Authorized JavaScript origins.

How deploys behave: every push to `dev` (or `sandbox`) redeploys that service. Because it has a disk, Render stops the old copy before
starting the new one, so the site is unreachable for a few seconds; the server finishes the requests in progress before it stops
(`[uaply] stopped` in the log), and the new copy answers about a second after Render starts it (measured with a filled disk). Accounts, sessions, applications and feedback survive: people stay
signed in. Render keeps a snapshot of the disk every day for at least 7 days (Disks, in the service).

Changing the API key later (for example to a business key) is only an edit of `ANTHROPIC_API_KEY` in Render's
dashboard; no code changes. `python tools/test-render.py` starts the server the way Render does and checks all of the above.

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

## 3. Google sign-in
One OAuth client serves both ways in. In console.cloud.google.com, signed in with the Google account that should own UAply:
1. **Google Auth Platform > Overview > Get started** (create a project named UAply first if asked): App name `UAply`, User support
   email your Gmail, Audience **External**, contact email your Gmail, agree to the policy, Create.
2. **Branding:** App home page `https://uaply.net`, Privacy policy `https://uaply.net/legal/privacy.html`, Terms
   `https://uaply.net/legal/terms.html`, Authorized domain `uaply.net`. Save.
3. **Audience > Publish app** (status becomes In production). Sign-in only asks for openid, email and profile, which are not
   sensitive scopes, so no review is needed; until Google verifies the branding, its screen shows the domain instead of the name.
4. **Clients > Create client**, Application type **Web application**, name `UAply web`.
   - Authorized JavaScript origins: `https://uaply.net`, `https://www.uaply.net`, `https://uaply-dev.onrender.com`,
     `http://localhost:8767`, `http://localhost` (Google wants both localhost forms for local testing).
   - Authorized redirect URIs: `https://uaply.net/api/auth/google/callback`, `https://www.uaply.net/api/auth/google/callback`,
     `https://uaply-dev.onrender.com/api/auth/google/callback`, `http://localhost:8767/api/auth/google/callback`.
   - Create. Copy the **Client ID** and the **Client secret**: Google shows the secret only this once (afterwards only its last
     four characters; a new one can be added with Add secret).
5. Render, uaply-dev, Environment: set `UAPLY_CONFIG_JSON` to include
   `"google":{"client_id":"<the ID>","client_secret":"<the secret>"}` (merged with the email settings already there). On this
   computer, paste only the client ID into `/setup` (Connect Google sign-in).
6. Wait about 5 minutes (Google says changes can take up to a few hours), then test: on a computer, Profile > Account shows Google's
   button; on an iPhone, the white "Continue with Google" button goes to Google's page and back. "The given origin is not allowed"
   or `origin_mismatch` means the exact address in the browser (with or without www, http or https, the port) is missing from the
   JavaScript origins; `redirect_uri_mismatch` means it is missing from the redirect URIs.
