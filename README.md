# Reach For The Stars - Blockchain Ready Platform

This is a secure, affiliate-ready wellness platform with crypto payments,
moderation workflows, and admin tooling.

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in values.
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`

## Admin Credentials

- You can either set `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (legacy), or create
  the first admin account at `/admin/setup`.
- To generate a bcrypt hash, run:
  - `node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword', 10));"`
 - Optional: set `ADMIN_SETUP_TOKEN` to require a token on `/admin/setup`.

## Crypto Payments

The homepage includes a wallet connect panel that triggers an `eth_sendTransaction`
to the configured `NEXT_PUBLIC_TREASURY_ADDRESS`.

## Fiat Payments (Stripe)

- Set `STRIPE_SECRET_KEY` and plan price IDs.
- Set `STRIPE_MODE=demo` for test keys (guardrail against live keys).
- Set `NEXT_PUBLIC_STRIPE_MODE=demo` to show a demo banner in the UI.
- Plans support trials via `NEXT_PUBLIC_STRIPE_TRIAL_*`.
- The "Start Trial" button uses Stripe Checkout in subscription mode.
- Set `NEXT_PUBLIC_SITE_URL` for correct redirect URLs.

## Email (password reset & automated emails)

- **RESEND_API_KEY** – Required for sending email (forgot-password links, welcome emails, etc.). Get an API key from [Resend](https://resend.com). If unset, password reset will fail with a “Email not configured” error.
- **EMAIL_FROM** – Optional. Sender address for outgoing email, e.g. `Reach For The Stars <noreply@yourdomain.com>`. Defaults to `Reach For The Stars <onboarding@resend.dev>` when using Resend’s test domain.
- **NEXT_PUBLIC_APP_URL** – Optional. Base URL used in email links (e.g. password reset). If unset, the app uses the request origin or `https://reachforthestars.today`.

The same `sendEmail()` helper in `src/lib/email.ts` is used for member password reset and can be used for other automated emails (welcome, notifications, etc.).

### Step 2: Set email env vars

1. Open `.env.local` in the project root (create it from `.env.example` if needed).
2. Get a Resend API key: sign up at [resend.com](https://resend.com) → **API Keys** → **Create API Key**.
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```
4. Optional: set `EMAIL_FROM` (e.g. `Reach For The Stars <noreply@yourdomain.com>`) and `NEXT_PUBLIC_APP_URL` (e.g. `https://your-app.vercel.app`) for production.
5. Optional: `WELCOME_EMAIL_CC` — comma-separated addresses **CC’d on the new-member welcome, Life Guidance Discovery follow-up, and therapist/healer/coach (Build Practice) follow-up** (onboarding or when the member first enables those interests in profile). If unset, defaults to `terry_bg@msn.com` and `Richard@richardleeweatherman.com`. Those sends skip `EMAIL_STAFF_BCC` so Terry and Richard are not duplicated.
6. Optional: `EMAIL_STAFF_BCC` — comma-separated emails to BCC on other automated member emails (password reset, Life Guidance / Build Practice flows, report confirmations, subscription-active after Stripe checkout). Internal “report an issue” messages still go to `REPORT_ISSUE_EMAIL`.
7. Restart the dev server so the new vars are picked up.

### Email on Vercel (deployments)

For email to work in production (report an issue, welcome emails, password reset, etc.), set **RESEND_API_KEY** in Vercel:

1. Vercel Dashboard → your project → **Settings** → **Environment Variables**.
2. Add `RESEND_API_KEY` with your Resend API key (e.g. `re_xxxxxxxxxxxx`).
3. Optional: add `EMAIL_FROM`, `REPORT_ISSUE_EMAIL`, `NEXT_PUBLIC_APP_URL`, `EMAIL_STAFF_BCC`, `WELCOME_EMAIL_CC` for production.
4. Redeploy (or push to git so Vercel auto-deploys). Emails will work on the next deploy.

## Security Notes

- Sessions are signed with `SESSION_SECRET` and stored in HTTP-only cookies.
- Admin endpoints require a valid session.
- Add rate limits to public/admin endpoints before production.

## Admin Data Persistence

- Admin content (library, interests, affiliates, moderation, moderators, plans, playback settings) now uses Postgres tables.
- Run `scripts/schema.sql` against your Vercel Postgres instance before first use.
- For goal A/B/C audio slots, run `scripts/migrate-interests-audio-slots.sql` on existing databases.

### How to run the schema

You need to execute `scripts/schema.sql` once against your Postgres database (e.g. Vercel Postgres).

**Option A – Vercel Dashboard**

1. In the [Vercel Dashboard](https://vercel.com), open your project.
2. Go to **Storage** → your Postgres database.
3. Open the **Query** or **.env** tab to get your connection string.
4. Use a SQL client (e.g. [Vercel’s SQL tab](https://vercel.com/docs/storage/vercel-postgres/using-vercel-postgres#query-with-sql-tab), or connect with a GUI like TablePlus / DBeaver using the `POSTGRES_URL` from your project’s **Settings → Environment Variables**).
5. Paste the contents of `scripts/schema.sql` and run it.

**Option B – Node script (no psql required)**

1. Get your Postgres URL into `.env.local`: in Vercel go to **Project → Settings → Environment Variables** and copy `POSTGRES_URL`, or run `vercel env pull` in the project root.
2. Install the script dependency once: `npm install --save-dev pg`
3. From the project root (`rfts-platform`), run:
   ```bash
   npm run db:schema
   ```
   This runs `scripts/run-schema.js`, which reads `scripts/schema.sql` and executes it using the URL from `.env.local`.

**Option C – Command line with `psql`** (if you have PostgreSQL installed)

1. Get your Postgres URL from Vercel (or `vercel env pull`).
2. Run: `psql "$POSTGRES_URL" -f scripts/schema.sql` (on Windows PowerShell you may need to set `$env:POSTGRES_URL` first or pass the URL in quotes.)

After this, all tables (including `password_reset_tokens` for forgot-password) will exist. Re-running the schema is safe: it uses `CREATE TABLE IF NOT EXISTS`.