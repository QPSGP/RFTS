# Phase 3 — Your steps (name.com + Vercel + Resend + Stripe)

The app is ready for production domain cutover. **You** must complete these in dashboards (Cursor cannot access them).

Code already handles: **www → apex redirect**, canonical URLs, cookie domain on `reachforthestars.today`, and production URL fallbacks when env vars are set.

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
3. Event: **`checkout.session.completed`** (and any others you already use).
4. Copy the signing secret → Vercel env **`STRIPE_WEBHOOK_SECRET`** → redeploy.

Confirm **Customer Billing Portal** is enabled (Settings → Billing → Customer portal).

---

## 6. Smoke test on production

Open **`https://reachforthestars.today`** (not www — www should redirect).

- [ ] Home page loads; `www` redirects to apex.
- [ ] Admin login → Content Console.
- [ ] Member login → Play Options.
- [ ] Forgot password → email link uses `https://reachforthestars.today/...`
- [ ] New signup → Stripe Checkout → return URL works.
- [ ] Manage billing opens Stripe portal.
- [ ] Report an issue → confirmation email.

Quick health check: `https://reachforthestars.today/api/health` → `{"ok":true,...}`

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
