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

## Not built yet (needs an employer's key, so it is built per employer)
Direct submission into **Greenhouse**, **Lever** and **Ashby** with the employer's own API key, and a self-service page where an employer
can register. Until then, those employers can use the email or webhook channel today.

## Sources for this design
Indeed Apply documentation (`indeed-apply-postUrl`, success and retry rules); Greenhouse Job Board API (applications need an API key);
Lever Postings API (apply needs a key made by a Super Admin); Ashby API (key with candidate-write rights); LinkedIn Apply Connect (partner
applicant tracking systems). See the research notes in the pull request that added this file.
