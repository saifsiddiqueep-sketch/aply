# How employers receive applications from UAply

## The short version
When someone swipes right, UAply can only **send** their application to an employer that has **agreed to receive it**. That is how every
job site works, and it is not a limitation we can code around:

| Site | How an application reaches the employer | Who has to set it up |
|---|---|---|
| Indeed | Sends each application as signed JSON to an HTTPS address the employer registers for each job; the employer's system must answer "success" or Indeed retries | The employer's applicant tracking system, under a developer agreement |
| LinkedIn | Delivers into the employer's applicant tracking system through "Apply Connect" | The employer, with a certified partner system |
| Greenhouse, Lever, Ashby | Accept an application over their API only with a key the employer creates | The employer (a Greenhouse key, a Lever key from a Super Admin, an Ashby key with candidate-write rights) |

So UAply has two kinds of jobs:

- **Partner jobs** (the employer connected): swipe right sends the application, and the person gets a confirmation email.
- **Public postings** (real jobs from employers' own career pages): UAply cannot send anything to an employer that never agreed, so a swipe
  right saves the job to the person's Applied list, emails them a confirmation that says plainly "finish your application", and opens the
  employer's own page. Their details are listed in the email, ready to copy.

More partners means more one-swipe applications. Recruiting employers is the growth lever for this feature.

## What an employer chooses (any combination)
Add the employer to `uaply-partners.json` on the server (see `partners.example.json`). Keep the file out of GitHub.

1. **Email.** Give UAply a recruiting address (`"contact"`). Each application arrives as an email with the applicant's details and the resume
   attached as a real file.
2. **Webhook (the Indeed way).** Give UAply an HTTPS address (`"webhook"`) and a secret (`"webhook_secret"`). Each application is POSTed there as
   signed JSON. Your system answers with any 2xx status. If it fails UAply tries again up to three times (after 1 and 3 seconds); a 4xx
   answer other than 408 or 429 is treated as final. Redirects are never followed. Do not reject an application inside the request; accept it
   first and review it afterwards.
3. **Both.** The application counts as sent when at least one channel accepts it.

An employer with no recorded consent (`"consent"`) is ignored, so nothing is ever sent to a company by accident.

## The webhook, in detail
`POST <your address>` with these headers:

| Header | Meaning |
|---|---|
| `Content-Type` | `application/json` |
| `X-UAply-Delivery` | A unique id for this application. Use it to ignore a repeat. |
| `X-UAply-Timestamp` | Seconds since 1970 when it was sent. Reject anything older than a few minutes. |
| `X-UAply-Signature` | `sha256=` and a hex HMAC-SHA256 of `timestamp + "." + raw body`, keyed with your secret (sent only when a secret is set) |

The body (resume is `null` when the person has not uploaded one):

    {
      "id": "…", "event": "application.created", "source": "UAply", "created_at": "2026-10-13T23:54:00Z",
      "job": {"id": 200123, "title": "…", "company": "…", "location": "…", "url": "https://…", "type": "internship", "work_style": "hybrid"},
      "applicant": {
        "name": "…", "email": "…", "phone": "…", "title": "…", "location": "…", "years_experience": 1, "skills": ["Python", "SQL"],
        "headline": "…", "summary": "…",
        "education": {"level": "Bachelor", "school": "…", "major": "…", "graduation": "2026-06", "gpa": 3.7},
        "links": {"resume": "https://…", "linkedin": "https://www.linkedin.com/in/…", "portfolio": "https://…"},
        "work_authorization": "…", "needs_sponsorship": "no", "earliest_start": "…", "most_recent_employer": "…"
      },
      "message": "", "match_percent": 87,
      "resume": {"name": "Resume.pdf", "type": "application/pdf", "size": 48211, "content_base64": "…"}
    }

To check the signature, compute HMAC-SHA256 over `timestamp + "." + body` with your secret and compare with `X-UAply-Signature` in constant time.

## What UAply never sends
Voluntary answers (race, gender, veteran or disability status) are never sent. The applicant agreed to what is sent before their first
application, and every application email to the applicant lists exactly what was shared.

## Straight into the employer's hiring system (Greenhouse and Lever)
For an employer that uses **Greenhouse** or **Lever**, an application can go straight into their own hiring system, so it appears in their
pipeline with the resume attached and nobody retypes anything. This is the nearest thing to "swipe right and it is applied", and it works
only for employers who connect, because both systems require a key that the employer's administrator creates:

| System | What the employer creates | Where |
|---|---|---|
| Greenhouse | A **Job Board API** key | Configure, Dev Center, API Credential Management |
| Lever | A **Postings API** key (a Super Admin makes it) | Settings, Integrations and API |

Give UAply the key and the board name that appears in the employer's job-board address (`boards.greenhouse.io/<board>` or `jobs.lever.co/<site>`).
On this computer use the **Connect an employer's hiring system** box on `/setup`. On a host, put the connections in the `UAPLY_ATS_JSON` setting as
one line of JSON:

    [{"kind": "greenhouse", "board": "acme", "api_key": "THE-KEY-THE-EMPLOYER-GAVE-YOU"},
     {"kind": "lever", "board": "acme", "api_key": "THE-KEY-THE-EMPLOYER-GAVE-YOU"}]

An employer who gives UAply its jobs (the partner list) can put the key in the same record instead: add `"ats": {"kind": "greenhouse", "board": "acme", "api_key": "..."}`
to the employer and `"ats_job_id": "1001"` (the posting's number in their system) to each job. Run `python tools/mock-ats.py` to try a connection against a stand-in.

What then happens, for that employer's real postings on UAply:

- The job card says **Apply instantly**, so a person knows before swiping what swipe right does. Cards for other employers say **Opens employer site**.
- Swipe right, with a short window to Undo, sends the application: name, email, phone, links, the resume file, and answers to the posting's own
  questions where the person's profile has them (LinkedIn, website, current employer, work authorization, sponsorship, how they heard of the job).
- **Greenhouse** postings often have required questions of their own. If one cannot be answered from the profile, UAply sends nothing and the person
  finishes on the employer's page (the card says "Saved. Finish applying"), rather than guessing. **Lever** takes the standard fields only; its
  API does not carry a posting's custom questions.
- Requirements stay the same as for any direct send: a verified account whose email matches the application, `delivery` set to `live`, and the person's
  consent. Keys are never shown, logged or put in an error message.
- Try it first with a test posting on the employer's side. Neither system lets UAply test a key without really submitting.

**Ashby** has an application endpoint too (a key with candidate-write rights), but its request format is not published in a form this project could
verify, so it is not built yet. Until it is, those employers can use the email or webhook channel.

## What no site can do
Fill in and submit an application on an employer's website for them. Employers' pages are built to be completed by the applicant, they protect
themselves with bot checks, and driving them by program breaks their terms. None of Greenhouse, Lever or Ashby documents a way to open an
application page already filled in from a link, either. The honest alternative for employers who have not connected is the one UAply uses:
save the job, show what will be asked, and open the employer's page with the person's answers ready to copy.

## Sources for this design
Indeed Apply documentation (`indeed-apply-postUrl`, success and retry rules); Greenhouse Job Board API (applications need an API key);
Lever Postings API (apply needs a key made by a Super Admin); Ashby API (key with candidate-write rights); LinkedIn Apply Connect (partner
applicant tracking systems). See the research notes in the pull request that added this file.
