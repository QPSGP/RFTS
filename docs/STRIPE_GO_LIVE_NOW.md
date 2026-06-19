# Stripe go-live — connect production billing

**New to Stripe?** Start with **`docs/STRIPE_STEP_BY_STEP.md`** — full click-by-click instructions.

Complete these steps in order. The app code is ready; you configure Stripe and Vercel.

**Production site:** `https://reachforthestars.today`

---

## 1. Stripe Dashboard (Live mode)

Turn **Test mode OFF** (toggle top-right in [Stripe Dashboard](https://dashboard.stripe.com)).

### Products and prices

Confirm **live** prices exist (IDs start with `price_`, not `prod_`):

| RFTS plan (Admin) | Member label | Monthly price | Trial |
|-------------------|--------------|---------------|-------|
| `platinum` | Gold Member | $19.95 | 14 days |
| `platinum_managed` | Platinum Managed | $39.95 | 14 days |

Copy each **Price ID** (`price_…`) from Stripe → Products.

### Customer Billing Portal

1. [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable portal, allow customers to update payment methods, cancel subscriptions, view invoices.
3. **Save**.

### Webhook

1. [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. **URL:** `https://reachforthestars.today/api/webhooks/stripe`
3. **Event:** `checkout.session.completed`
4. Copy the **Signing secret** (`whsec_…`).

### API keys

[Developers → API keys](https://dashboard.stripe.com/apikeys) → copy **Secret key** (`sk_live_…`).

---

## 2. RFTS Admin — Price IDs

1. Log in → **Admin** → **Content** → **Subscription Plans**
2. For **Gold** (`platinum` row): paste live **Gold** Price ID (`price_…` for $19.95/mo)
3. For **Platinum Managed**: paste live **Platinum Managed** Price ID (`price_…` for $39.95/mo)
4. **Save Plans**

Run locally to verify IDs look correct:

```bash
npm run stripe:verify
```

Each signup plan must use `price_…` (not `prod_…`).

---

## 3. Vercel — environment variables (Production)

**Settings → Environment Variables → Production**

| Variable | Value |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 1 |
| `NEXT_PUBLIC_STRIPE_MODE` | `live` |
| `STRIPE_MODE` | `live` (optional; auto-detected from key) |
| **Remove or set false** | `DEMO_SKIP_STRIPE` — must **not** be `true` in production |

Keep existing: `POSTGRES_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `BLOB_READ_WRITE_TOKEN`.

**Redeploy** after changing env vars (Deployments → … → Redeploy).

---

## 4. Smoke tests

### New signup (live card)

1. Open `https://reachforthestars.today/signup/step-1-subscription-selection`
2. Complete signup → **Continue to Stripe Payment** (no “Skip Payment” in live mode)
3. Use a real card or Stripe test live card if you have test clock setup
4. After payment: **Play Options** loads, subscription **active**
5. Welcome email shows Gold ($19.95) and Platinum Managed ($39.95) in Payment section

### Migrated members (no double billing)

For members who already pay in Stripe on the old system:

1. Link `cus_…` and `sub_…` in Admin → Members (section 3) or SQL — see `STRIPE_SETUP.md`
2. They log in → **Manage billing** opens portal — **not** Checkout again

---

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Signup skips payment, goes straight to console | `DEMO_SKIP_STRIPE=true` on Vercel — remove it |
| Checkout error “No such price” | Wrong Price ID or test price used with live key — fix Admin plans |
| Paid but still “Subscription Required” | Webhook missing or wrong `STRIPE_WEBHOOK_SECRET` |
| Second subscription created | Link existing `cus_`/`sub_` before member uses Checkout |

---

## Current DB reference (verify in Admin)

After you save in Admin, `stripe:verify` prints what Postgres has. Legacy rows `gold` / `bronze` with `prod_…` IDs are not used for signup; signup uses plan id **`platinum`** (Gold).
