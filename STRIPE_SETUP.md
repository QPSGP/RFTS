# Stripe Setup for RFTS

## Quick start: Get signup working locally

1. **Copy `.env.example` to `.env.local`** and fill in:
   - `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` – Vercel Postgres or any PostgreSQL
   - `SESSION_SECRET` – any long random string (e.g. `openssl rand -hex 32`)
   - `DEMO_SKIP_STRIPE=true` and `NEXT_PUBLIC_STRIPE_MODE=demo` – skips Stripe and activates membership immediately

2. **Run the app**: `npm run dev`, then go to `/signup/step-1-subscription-selection`.

3. **Flow**: Plan → Personal details → Payment. In demo mode, use **Skip Payment & Complete (Demo)** to finish without Stripe.

4. **For real Stripe payments**: See below for Price IDs, webhooks, and env vars.

---

## Linking subscription plans to Stripe

Plans are stored in the `subscription_plans` table. The **Stripe Price ID** links each plan to a Stripe product/price so checkout works correctly. You paste each Price ID in **Admin → Content → Subscription Plans** (Stripe Price ID field).

### 1. Create a product and price in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products** (use **Test mode** for demo).
2. Click **Add product**.
3. Set:
   - **Name:** e.g. "RFTS Membership"
   - **Pricing:** Recurring (monthly), amount (e.g. $19.95)
   - **Free trial:** Optional (e.g. 14 days)
4. Click **Save product**.
5. Copy the **Price ID** (starts with `price_`).

### 2. Add the Price ID in RFTS Admin

1. Log in as Admin.
2. Go to **Admin Content** → **Subscription Plans**.
3. For the plan (e.g. "Membership"), paste the Stripe Price ID into **Stripe Price ID**.
4. Click **Save Plans**.

### 3. Test mode (demo)

- Use **test** API keys (`sk_test_...`, `pk_test_...`).
- Set `STRIPE_MODE=demo` and `NEXT_PUBLIC_STRIPE_MODE=demo`.
- On signup Payment step:
  - **Skip Payment & Complete (Demo)** – no Stripe, goes straight to Members Console.
  - **Continue to Stripe Payment** – use test card `4242 4242 4242 4242`, any future expiry, any 3‑digit CVC.

### 4. If you changed plans in Stripe

If you created new products/prices or removed old ones:

1. Create the new product and price in Stripe.
2. Update the plan’s **Stripe Price ID** in Admin → Subscription Plans.
3. Save. Signup will now use the new price.

### 5. Webhook (activates subscription after payment)

To activate a member's subscription when they complete Stripe checkout:

1. In Stripe Dashboard → **Developers** → **Webhooks**, click **Add endpoint**.
2. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`
3. **Events to send:** `checkout.session.completed`
4. Copy the **Signing secret** (starts with `whsec_`).
5. Add to your environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

Without the webhook, members who pay via Stripe will see "Subscription Required" until it is configured.

### 6. Environment variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from Stripe webhook endpoint
NEXT_PUBLIC_STRIPE_MODE=demo
DEMO_SKIP_STRIPE=true   # when true: all signups skip Stripe and go straight to Members Console (no payment)
```

---

## Go-live: link old-system Stripe customers (no double charge)

Use this when members already pay in **Stripe** on the legacy site and you are moving them to this platform **without** a second subscription or lost cards.

### How the new platform avoids double billing (already in code)

- Stripe **Customer ID** (`cus_…`) and **Subscription ID** (`sub_…`) are stored on each member in `subscriptions.stripe_customer_id` and `subscriptions.stripe_subscription_id`.
- If those IDs exist, **Checkout is blocked** and the member is sent to the **Stripe Customer Billing Portal** instead (`src/lib/stripe-billing-portal.ts`, `/api/checkout`, onboarding payment step).
- New signups only get a **new** Stripe subscription when those fields are **empty** and they complete Checkout (webhook stores the IDs).

**Critical:** Use the **same Stripe account** (same live `STRIPE_SECRET_KEY`) as the old system. Subscriptions already in Stripe keep billing on their existing schedule; you are only **linking** IDs in Postgres.

### Before you migrate anyone

1. **Live Stripe keys** on Vercel: `STRIPE_SECRET_KEY=sk_live_…` (not test).
2. **Webhook** on production: `https://reachforthestars.today/api/webhooks/stripe`, event `checkout.session.completed`, `STRIPE_WEBHOOK_SECRET` set.
3. **Billing Portal** enabled: [Stripe Dashboard → Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal) — Save. Members use this to update card, cancel, view invoices.
4. **Price IDs** in Admin → Content → Subscription Plans match your **live** Stripe prices (`price_…` for Gold and Platinum Managed).
5. Turn off **`DEMO_SKIP_STRIPE`** in production (unset or `false`).

### Per-member migration (recommended process)

For each paying member from the old system:

| Step | Action |
|------|--------|
| 1 | In **Stripe Dashboard → Customers**, find the customer by **email** (same email they will use on the new site). |
| 2 | Open the customer → copy **Customer ID** (`cus_…`). |
| 3 | Under **Subscriptions**, copy the active **Subscription ID** (`sub_…`). Confirm status is `active` or `trialing`. |
| 4 | In the **new platform**, create or confirm their **user account** with that **same email** (admin create, or they sign up through step 1–2 only — see below). |
| 5 | Set **tier** and **status** in Admin → Members (Gold = `platinum`, Managed = `platinum_managed`, status **active**). |
| 6 | **Link Stripe IDs** in the database (see SQL below). |
| 7 | **Do not** send them through Stripe Checkout again. They should use **Manage billing** (profile / portal) only. |
| 8 | Have them log in at `/member/login` and open Play Options — they should see an **active** membership. |

**Do not** run Checkout for migrated members. That could create a **second** subscription unless IDs are already linked (the app returns 409 / opens portal when IDs exist).

### SQL to link existing Stripe (admin / one-time)

Run in Vercel Postgres (replace placeholders):

```sql
-- Find user id
SELECT id, email FROM users WHERE lower(email) = lower('member@example.com');

-- Ensure subscription row exists and link Stripe (Gold example)
INSERT INTO subscriptions (user_id, tier, status, stripe_customer_id, stripe_subscription_id)
VALUES (
  '<user-uuid>',
  'platinum',           -- or 'platinum_managed'
  'active',
  'cus_XXXXXXXXXXXX',
  'sub_XXXXXXXXXXXX'
)
ON CONFLICT (user_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  status = EXCLUDED.status,
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id;
```

Verify:

```sql
SELECT u.email, s.tier, s.status, s.stripe_customer_id, s.stripe_subscription_id
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE lower(u.email) = lower('member@example.com');
```

### If the old system used different Stripe prices

- **Do not** cancel old subscriptions and re-checkout on new prices unless you intend to change billing.
- Optionally **migrate subscriptions to new Price IDs** inside Stripe (Dashboard or Stripe support) while keeping the same `sub_…` ID, then link that subscription ID in the app.
- Update Admin **Stripe Price ID** on each plan so **new** signups use the correct live price.

### Signup path for migrated members (avoid duplicate account + duplicate sub)

**Option A — Admin-led (safest for bulk migration)**  
Admin creates the member, sets tier/status active, links Stripe IDs via SQL. Member uses **Forgot password** to set a password and logs in.

**Option B — Member signs up on new site**  
If they complete **full signup including Stripe Checkout** before IDs are linked, they may get a **second** subscription. Prefer Option A, or link Stripe IDs **before** they pay, or have them stop at personal details and contact support.

### After migration checklist

- [ ] Member logs in; Play Options loads (not “Subscription required”).
- [ ] **Manage billing** opens Stripe portal (once profile billing UI is live — see below).
- [ ] No second `sub_…` for the same email in Stripe Dashboard.
- [ ] Webhook + welcome / subscription-active emails work for **new** checkouts only.

---

### Built in app

| Area | Behavior |
|------|----------|
| **New signup step 3** | Review & Payment → Stripe Checkout (`MemberOnboarding.tsx`, `POST /api/member/onboarding`). |
| **Duplicate guard** | If `stripe_customer_id` / `stripe_subscription_id` exist → Billing Portal, not a new Checkout. |
| **Webhook** | `checkout.session.completed` → activate tier, store Stripe IDs, send subscription-active email. |
| **My Profile → Payment & subscription** | Plan, status, **Manage billing** / **Complete payment** → `POST /api/member/billing-portal`. |
| **Play Options** | **Complete payment** (inactive) or **Manage billing** (active) → same API. |
| **Admin** | Set tier + subscription status; link Stripe IDs in **3. Membership** (Customer `cus_…`, Subscription `sub_…`). |

### Optional next

1. **Admin → Members**  
   - Paste `stripe_customer_id` and `stripe_subscription_id` in section **3. Membership** (implemented — no raw SQL required for routine migration).

2. **Onboarding copy**  
   - Step 3 can mention profile billing for card updates after signup.

---

## Production env (Stripe + site)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_MODE=live
NEXT_PUBLIC_SITE_URL=https://reachforthestars.today
NEXT_PUBLIC_APP_URL=https://reachforthestars.today
# DEMO_SKIP_STRIPE unset or false in production
```
