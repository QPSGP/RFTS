# Phase 3 — Your steps (name.com + Vercel + Resend + Stripe)

The app is ready for production domain cutover. **You** must complete these in dashboards (Cursor cannot access them).

Code already handles: **www → apex redirect**, canonical URLs, cookie domain on `reachforthestars.today`, and production URL fallbacks when env vars are set.

---

## Day start — affiliate payouts, checkout, and smoke test (June 2026)

Use this checklist when picking up work on **affiliate commissions**, **PayPal/ACH checkout**, and **production verification**. Order matters.

### A. Database migrations (production Postgres)

From `rfts-platform/`, point `.env.local` at **production** `POSTGRES_URL` (Neon / Vercel Postgres), then run **once** (safe to re-run):

```bash
npm run affiliates:migrate
npm run affiliates:payout-migrate
npm run affiliates:commissions-migrate
npm run affiliates:connect-migrate
```

| Script | Adds |
|--------|------|
| `affiliates:migrate` | Member affiliate codes, referral columns |
| `affiliates:payout-migrate` | Payout method columns on profiles + applications |
| `affiliates:commissions-migrate` | `affiliate_commissions` ledger table |
| `affiliates:connect-migrate` | Stripe Connect columns on `users` |

If migrations only ran against a dev database, repeat with production `POSTGRES_URL`.

### B. Stripe Dashboard (Test + Live)

**Payment methods** — [Settings → Payment methods](https://dashboard.stripe.com/settings/payment_methods):

- [ ] **PayPal** — connect / enable
- [ ] **ACH Direct Debit** (US bank account) — enable

Checkout code requests `card`, `paypal`, and `us_bank_account` on every membership Checkout session.

**Webhooks** — [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → your endpoint `https://reachforthestars.today/api/webhooks/stripe`:

- [ ] `checkout.session.completed` (already used)
- [ ] **`invoice.paid`** — required for affiliate commission ledger on renewals and paid invoices

Copy signing secret to Vercel `STRIPE_WEBHOOK_SECRET` if you add or rotate the endpoint.

**Billing portal** — Settings → Billing → Customer portal: enabled (members manage card / PayPal / bank there).

**Connect** — enable Stripe Connect (Express) for automated affiliate payouts.

- [ ] Webhook: **`account.updated`** (sync Connect onboarding status)

### B2. Vercel — `CRON_SECRET` (monthly Connect payouts)

Monthly cron runs `GET /api/cron/affiliate-connect-payouts` on the **1st at 14:00 UTC** (`vercel.json`).

1. [Vercel](https://vercel.com) → RFTS project → **Settings** → **Environment Variables**
2. Add **`CRON_SECRET`** (Production, **Sensitive**): use the value in your local `.env.local`, or generate a new 32+ character random string.
3. **Redeploy** production after adding the variable.

**CLI (optional):** add `VERCEL_TOKEN` to `.env.local` ([create token](https://vercel.com/account/tokens)), then:

```bash
npm run vercel:set-cron-secret
```

If the project name is not `rfts`, set `VERCEL_PROJECT` in `.env.local`.

### C. Automated smoke test

```bash
npm run test:production-smoke
```

Target: **31/31** passed against `https://reachforthestars.today`. If **Signup onboarding → Stripe Checkout** fails with `url=/play-options`, check Vercel logs for `[onboarding]` / Stripe errors (invalid price, API key, or Checkout payment-method config).

### D. Manual tests (you in browser)

**Checkout (PayPal + ACH)**

1. Open `https://reachforthestars.today/signup/step-1-subscription-selection` (or start a new test signup).
2. Complete onboarding → Stripe Checkout should offer **card**, **PayPal**, and **bank** (not Venmo/Zelle).
3. In **Stripe test mode**, complete a test payment; confirm return to Play Options and active subscription.

**Referred signup path**

1. As a member, open **My Profile** → copy referral link (`?ref=AFFILIATECODE`).
2. New signup in incognito using that link.
3. After signup, confirm in admin or DB: new user has `referred_by_affiliate_code` set.
4. After first **paid** invoice (not $0 trial invoice): Admin → Content Console → **Affiliate payout queue** shows a pending commission (~25% of payment).

**Admin payout queue**

1. Admin login → **Content Console** → open **Affiliates** section.
2. **Affiliate payout queue** lists affiliates with pending balances and payout method/details.
3. Affiliates at **≥ $25** (launch period) show “ready for payout”.
4. After manual payout, click **Mark pending as paid**.

**Screen wake (optional)**

Play Options → **Enable Screen Wake** once (preference is saved). Start Session → confirm message or **Enable** if auto-wake fails.

### E. Payout policy (member-facing)

- **$25** minimum through **June 18, 2027**; then **$50**.
- Override launch end: `NEXT_PUBLIC_AFFILIATE_PAYOUT_LAUNCH_END=YYYY-MM-DD` on Vercel + redeploy.

---

## 1. Vercel — add the domain

1. [Vercel Dashboard](https://vercel.com) → your RFTS project → **Settings** → **Domains**.
2. Add **`reachforthestars.today`** and **`www.reachforthestars.today`**.
3. Vercel shows DNS records to add at name.com (usually **A** record to Vercel’s IP, or **CNAME** to `cname.vercel-dns.com` — follow what Vercel displays).

---

## 2. name.com — DNS

1. Log in at [name.com](https://www.name.com).
2. Open DNS for **reachforthestars.today**.
3. Add/update records exactly as Vercel shows (remove conflicting old A/CNAME if the site pointed elsewhere).
4. Wait for propagation (often 5–60 minutes; can take up to 48h).

**Check:** In Vercel Domains, both hostnames show **Valid Configuration**.

---

## 3. Vercel — production environment variables

**Settings** → **Environment Variables** → **Production** → set or confirm:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://reachforthestars.today` |
| `NEXT_PUBLIC_APP_URL` | `https://reachforthestars.today` |
| `EMAIL_FROM` | `Reach For The Stars <noreply@reachforthestars.today>` (after Resend verify) |
| All Phase 1–2 vars | `POSTGRES_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, Stripe live keys, `BLOB_READ_WRITE_TOKEN`, etc. |

Then **Redeploy** (Deployments → … → Redeploy) so `NEXT_PUBLIC_*` values are baked into the build.

---

## 4. Resend — verify sending domain

1. [Resend Dashboard](https://resend.com) → **Domains** → **Add domain** → `reachforthestars.today`.
2. Add the **TXT / MX** records Resend gives you at **name.com** (same DNS zone).
3. Wait until Resend shows **Verified**.
4. Set `EMAIL_FROM` on Vercel as above and redeploy if you changed it.

Until verified, you can still send from `onboarding@resend.dev` for testing.

---

## 5. Stripe — production webhook URL

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. Endpoint URL: **`https://reachforthestars.today/api/webhooks/stripe`**
3. Events: **`checkout.session.completed`** and **`invoice.paid`** (affiliate commissions).
4. Copy the signing secret → Vercel env **`STRIPE_WEBHOOK_SECRET`** → redeploy.

Confirm **Customer Billing Portal** is enabled (Settings → Billing → Customer portal).

Enable **PayPal** and **ACH Direct Debit** under Settings → Payment methods (see **Day start** above).

---

## 6. Smoke test on production

Open **`https://reachforthestars.today`** (not www — www should redirect).

- [ ] Home page loads; `www` redirects to apex.
- [ ] Admin login → Content Console.
- [ ] Member login → Play Options.
- [ ] Forgot password → email link uses `https://reachforthestars.today/...`
- [ ] New signup → Stripe Checkout → return URL works.
- [ ] Checkout shows card, PayPal, and US bank (ACH) when enabled in Stripe.
- [ ] Manage billing opens Stripe portal.
- [ ] Referral link signup sets affiliate attribution; commission appears after paid invoice.
- [ ] Admin → Affiliates → payout queue loads.
- [ ] Report an issue → confirmation email.

Quick health check: `https://reachforthestars.today/api/health` → `{"ok":true,...}`

Automated: `npm run test:production-smoke` from `rfts-platform/`.

---

## If something fails

| Issue | Check |
|--------|--------|
| Site not loading | name.com DNS + Vercel domain status |
| Login works then drops | `SESSION_SECRET` set on Vercel Production |
| Email links go to wrong host | `NEXT_PUBLIC_APP_URL` + redeploy |
| Stripe checkout wrong return URL | `NEXT_PUBLIC_SITE_URL` + redeploy |
| Emails don’t send | `RESEND_API_KEY`, domain verified, `EMAIL_FROM` matches verified domain |

See also **`GO_LIVE_CHECKLIST.md`**, **`RESEND.md`**, **`STRIPE_SETUP.md`**.
