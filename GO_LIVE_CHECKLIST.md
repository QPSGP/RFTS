# Go-live checklist (ready before DNS at name.com)

Use this while waiting for registrar access. Everything below can be done on the **Vercel preview URL** or a temporary hostname.

---

## Three phases (resume here after a freeze or new computer)

| Phase | Goal | When |
|-------|------|------|
| **1** | **Platform on Vercel** — Postgres, secrets, admin, Blob, schema, preview smoke tests | **No custom DNS** (use `*.vercel.app` URL) |
| **2** | **Stripe live + email + members** — webhook, billing portal, Resend, checkout, migration | Preview or production host; Resend domain verify needs DNS (Phase 3) for custom `EMAIL_FROM` |
| **3** | **Production domain (name.com)** — DNS → Vercel, production URLs, Resend domain, final smoke | When name.com access returns |

**You were finishing Phase 1 when Cursor froze.** Use the Phase 1 checklist below; when every item is checked, move to Phase 2.

---

## Phase 1 — Platform on Vercel (finish here)

### Vercel project

- [ ] GitHub repo connected; push to `main` auto-deploys (`npm run push-deploy` from rfts-platform if needed).
- [ ] Copy env from **`.env.example`** into Vercel → Settings → Environment Variables (**Production**).
- [ ] **`POSTGRES_URL`** — schema applied (`npm run db:schema` locally against that DB, or run `scripts/schema.sql` in Vercel Postgres Query tab).
- [ ] **`SESSION_SECRET`** (long random string).
- [ ] Admin: **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD_HASH`** **or** create first admin at `/admin/setup` on the preview URL.

### Blob / audio

- [ ] **`BLOB_READ_WRITE_TOKEN`** for admin audio and cover uploads.

### Email (minimal for Phase 1 smoke)

See **`RESEND.md`**. Full domain verify waits for Phase 3 DNS.

- [ ] **`RESEND_API_KEY`** on Vercel (can send from `onboarding@resend.dev` until domain is verified).
- [ ] Optional now: **`REPORT_ISSUE_EMAIL`**, **`EMAIL_STAFF_BCC`**, **`WELCOME_EMAIL_CC`**.

### Phase 1 smoke test (preview URL)

- [ ] Admin login at `https://<your-vercel-app>/admin/setup` or `/login`.
- [ ] Upload audio, add to library, assign to goal (or managed member).
- [ ] Member login works (`SESSION_SECRET` set — see `PROJECT_STATUS.md` if cookie issues).
- [ ] Play Options loads for a test member.

**Phase 1 done when:** preview site runs, admin + member flows work, DB and Blob configured. Stripe live checkout and custom-domain email are **Phase 2**.

---

## Phase 2 — Stripe live, email, member migration

See **`STRIPE_SETUP.md`**, **`docs/STRIPE_GO_LIVE_NOW.md`**, and **`RESEND.md`**.

### Stripe

- [ ] Live **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, **`NEXT_PUBLIC_STRIPE_MODE=live`** (unset **`DEMO_SKIP_STRIPE`** in production).
- [ ] Customer Billing Portal enabled in Stripe Dashboard.
- [ ] Webhook endpoint: `https://<your-host>/api/webhooks/stripe`.
- [ ] Plan **Price IDs** in Admin → Subscriptions.
- [ ] Migrate existing members: link **`stripe_customer_id`** / **`stripe_subscription_id`** in SQL (avoid second Checkout).
- [ ] Members use **My Profile → Manage billing** or **Play Options → Manage billing**.

### Email (production sender)

- [ ] **`EMAIL_FROM`** with verified domain (full verify usually in Phase 3 after DNS).
- [ ] Password reset, welcome, report-issue, subscription-active emails tested.

### Phase 2 smoke test

- [ ] New member signup → Checkout (live or test per your choice).
- [ ] Migrated member login → Manage billing opens Stripe portal (no duplicate sub).
- [ ] Password reset email, welcome email, report-issue email.

---

## Phase 3 — Production domain (name.com)

**Code is ready** (www → apex redirect, canonical URLs, cookie domain). **You** complete DNS and dashboard steps in **`docs/PHASE3_YOUR_STEPS.md`**.

### Implemented in the app

- [x] `www.reachforthestars.today` → `https://reachforthestars.today` (middleware + `vercel.json`)
- [x] Central `getPublicSiteUrl()` / `getPublicAppUrl()` for Stripe, checkout, emails
- [x] Member session cookie domain `.reachforthestars.today` on production hostnames
- [x] `metadataBase` uses `NEXT_PUBLIC_SITE_URL` or production default

### Your actions (cannot be done from Cursor)

1. **Vercel** → Domains: add `reachforthestars.today` and `www.reachforthestars.today`
2. **name.com** → DNS: add records Vercel shows (A or CNAME)
3. **Vercel env (Production):** `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` = `https://reachforthestars.today` → **Redeploy**
4. **Resend** → verify `reachforthestars.today` (TXT/MX at name.com) → set `EMAIL_FROM` → redeploy
5. **Stripe** → webhook `https://reachforthestars.today/api/webhooks/stripe` → update `STRIPE_WEBHOOK_SECRET` on Vercel
6. **Smoke test** on `https://reachforthestars.today` (checklist in `docs/PHASE3_YOUR_STEPS.md`)

---

## Quick reference

| Topic | Doc |
|--------|-----|
| Email | `RESEND.md` |
| Stripe + migration | `STRIPE_SETUP.md` |
| Env template | `.env.example` |
| Project handoff | `PROJECT_STATUS.md` |
| Phase 3 (your DNS/dashboard steps) | `docs/PHASE3_YOUR_STEPS.md` |
