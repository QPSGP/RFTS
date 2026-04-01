# Resend email — setup reference

When the user asks for **“Resend” info** or **Resend email setup**, use this file (and `README.md` / `.env.example` for exact variable names). Summarize the points below for them.

## What lives in the repo vs the dashboard

- **Subjects and HTML** for transactional mail live in code: `src/lib/email-templates.ts` (and calls from API routes / webhooks). The app sends via the **Resend API** using `src/lib/email.ts`.
- **Resend dashboard “templates”** are optional. You cannot create those from the repo. If you want saved templates in Resend for preview only, paste the same HTML from `email-templates.ts` into the Resend UI manually. The app does **not** read Resend template IDs today.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Required for any outbound email. From [resend.com](https://resend.com) → API Keys. |
| `EMAIL_FROM` | Sender, e.g. `Reach For The Stars <noreply@yourdomain.com>`. Use a verified domain. |
| `NEXT_PUBLIC_APP_URL` | Base URL for links in emails (password reset, etc.). |
| `EMAIL_STAFF_BCC` | Comma- or semicolon-separated addresses (e.g. Terry, Richard). Merged into **BCC** on automated member emails. `sendEmail()` dedupes BCC against the primary `to` so staff are not duplicated. |
| `REPORT_ISSUE_EMAIL` | Inbox for **Report an issue** submissions (internal). If unset, defaults apply per code/README. |

Set the same variables on **Vercel** → Project → Settings → Environment Variables for production.

## Flows covered (all use `sendEmail` / templates in code)

- **Forgot password** — `POST /api/member/forgot-password`; content from `getForgotPasswordEmailContent`.
- **Tech support / report acknowledgment** — Member confirmation after `POST /api/member/report-issue`; technical/support categories get appropriate subject/copy via `getReportIssueConfirmationContent`.
- **Subscription active (auto-respond after checkout)** — Stripe `checkout.session.completed` for `platinum` / `platinum_managed`; `getSubscriptionActiveEmailContent`.
- **Welcome** — Onboarding route when member registers.
- **Life Guidance (LGD)** — Onboarding or profile when LGD checkbox is newly checked.
- **Build Practice (therapist/healer/coach)** — Onboarding or profile when that checkbox is newly checked.

**Staff copies:** Set `EMAIL_STAFF_BCC` to Terry and Richard’s real addresses. Internal report emails still go to `REPORT_ISSUE_EMAIL`; BCC adds Terry without duplicating the primary recipient when Richard is `to`.

## What you do when the domain moves to Vercel + Resend

1. **Verify the sending domain** in Resend and add the DNS records Resend (and Vercel, if applicable) require.
2. Put **`RESEND_API_KEY`**, **`EMAIL_FROM`**, **`NEXT_PUBLIC_APP_URL`**, **`EMAIL_STAFF_BCC`**, and **`REPORT_ISSUE_EMAIL`** (if needed) in Vercel env.
3. Redeploy. No separate “template publish” step is required for the flows above beyond API + domain verification.

## Key files

- `src/lib/email.ts` — `sendEmail()`, staff BCC parsing, Resend client.
- `src/lib/email-templates.ts` — HTML/text bodies and subjects.
- `src/app/api/member/forgot-password/route.ts`, `report-issue/route.ts`, onboarding, profile PATCH, `src/app/api/webhooks/stripe/route.ts`.
