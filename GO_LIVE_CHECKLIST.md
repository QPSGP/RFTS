# Go-live checklist (ready before DNS at name.com)

Use this while waiting for registrar access. Everything below can be done on the **Vercel preview URL** or a temporary hostname.

## Blocked on name.com (when access returns)

1. Point **reachforthestars.today** (or production domain) to Vercel per Vercel → Project → Domains.
2. Set **`NEXT_PUBLIC_SITE_URL`** and **`NEXT_PUBLIC_APP_URL`** to the production `https://…` URL on Vercel.
3. Redeploy after env changes.

## Can do now (no custom DNS required)

### Vercel project

- [ ] Copy env from **`.env.example`** into Vercel → Settings → Environment Variables (Production).
- [ ] **`POSTGRES_URL`** — schema applied (`npm run db:schema` or `scripts/schema.sql`).
- [ ] **`SESSION_SECRET`**, admin setup or **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD_HASH`**.

### Email (Resend — not SMTP)

See **`RESEND.md`**.

- [ ] **`RESEND_API_KEY`** on Vercel.
- [ ] **`EMAIL_FROM`**, **`EMAIL_STAFF_BCC`**, **`WELCOME_EMAIL_CC`**, **`REPORT_ISSUE_EMAIL`** as needed.
- [ ] Verify sending domain in Resend when DNS is available (TXT/MX on the domain).

### Stripe

See **`STRIPE_SETUP.md`**.

- [ ] Live **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`NEXT_PUBLIC_STRIPE_MODE=live`**.
- [ ] Customer Billing Portal enabled in Stripe Dashboard.
- [ ] Webhook endpoint: `https://<your-host>/api/webhooks/stripe`.
- [ ] Plan **Price IDs** in Admin → Subscriptions.
- [ ] Migrate existing members: link **`stripe_customer_id`** / **`stripe_subscription_id`** in SQL (avoid second Checkout).
- [ ] Members use **My Profile → Manage billing** or **Play Options → Manage billing** (`POST /api/member/billing-portal`).

### Blob / audio

- [ ] **`BLOB_READ_WRITE_TOKEN`** for admin audio and cover uploads.

### Smoke test (preview URL)

- [ ] Admin login, upload audio, add to library, assign to goal.
- [ ] New member signup → Checkout (test or live).
- [ ] Migrated member login → Manage billing opens Stripe portal (no duplicate sub).
- [ ] Password reset email, welcome email, report-issue email.

## Quick reference

| Topic | Doc |
|--------|-----|
| Email | `RESEND.md` |
| Stripe + migration | `STRIPE_SETUP.md` |
| Env template | `.env.example` |
| Project handoff | `PROJECT_STATUS.md` |
