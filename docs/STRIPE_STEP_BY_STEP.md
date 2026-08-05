# Stripe step-by-step guide (for Reach For The Stars)

**Who this is for:** You are moving from the old app to the new site at `https://reachforthestars.today`. This guide assumes you are **not** a Stripe expert.

**Time needed:** About 30–60 minutes for setup, plus time to link each existing member.

---

## Plain English: what Stripe does for RFTS

| Stripe concept | What it means for you |
|----------------|----------------------|
| **Stripe account** | Where cards are charged. Your old app and new app should use the **same** account so existing members keep billing on their current subscriptions. |
| **Customer** (`cus_…`) | One person in Stripe, usually one per email. |
| **Subscription** (`sub_…`) | The monthly billing record ($19.95 Gold or $39.95 Platinum Managed). |
| **Checkout** | The payment page new signups see when they click pay. |
| **Webhook** | Stripe tells your **new** website “payment succeeded” so the member becomes **active** in RFTS. |
| **Billing Portal** | Secure Stripe page where members update card, cancel, or view invoices (“Manage billing”). |
| **Live vs Test mode** | **Test** = fake cards, no real money. **Live** = real charges. Production must use **Live**. |

**Important:** Turning off the **old website** does **not** stop Stripe from charging existing subscriptions. Stripe keeps billing until someone cancels. The new site must **know** who already pays (link `cus_` / `sub_` IDs).

---

## Before you start - checklist

- [ ] DNS points `reachforthestars.today` to the **new** Vercel app (you did this).
- [ ] You can log in to [Stripe Dashboard](https://dashboard.stripe.com) (same account the old app used).
- [ ] You can log in to [Vercel](https://vercel.com) for the RFTS project.
- [ ] You can log in to RFTS **Admin** at `https://reachforthestars.today/admin`.

---

## Part A - Switch Stripe to Live mode

1. Open https://dashboard.stripe.com
2. Look at the top-right corner for a toggle: **Test mode** / **Live mode**.
3. Click until it says **Live mode** (orange/live indicator, not “Test mode”).
4. Everything below must be done in **Live mode** for real members.

> If you only see test data, you are still in Test mode. Flip the toggle.

---

## Part B - Disable old webhooks (old app is going away)

These URLs belong to the **old** apps. They must **not** be the only webhooks once the new site is live.

1. Go to **Developers** (left sidebar) → **Webhooks**  
   Direct link: https://dashboard.stripe.com/webhooks
2. You may see a table like:

   | Destination | URL | Status |
   |-------------|-----|--------|
   | universe-production | `…universe-production…/api/stripe/webhook` | Disabled |
   | app-alpha | `…amplifyapp.com/api/callback/stripe` | Active |

3. For **app-alpha** (Amplify / old alpha):
   - Click the row.
   - Click **⋯** (three dots) or **Disable endpoint** / turn off the destination.
   - Confirm. Status should show **Disabled**.

4. For **universe-production**:
   - Should already be **Disabled**. Leave it disabled (or delete later).

5. Do **not** disable your entire Stripe account - only these **old endpoints**.

You will add a **new** endpoint in Part E.

---

## Part C - Turn on Customer Billing Portal

Members use this when they click **Manage billing** on the new site.

1. In Stripe, go to **Settings** (gear icon, bottom left) → **Billing** → **Customer portal**  
   Direct link: https://dashboard.stripe.com/settings/billing/portal
2. Click **Activate** or **Turn on** if the portal is not active.
3. Recommended settings (check/enable):
   - Customers can **update payment methods**
   - Customers can **cancel subscriptions** (or your business policy)
   - Customers can **view invoice history**
4. Under **Products**, ensure your membership products are allowed in the portal (usually default is fine).
5. Click **Save** at the bottom.

---

## Part D - Confirm your two membership prices (Products)

New signups use two plans:

| What members see | Admin plan row | Price | Free trial |
|------------------|----------------|-------|------------|
| **Gold Member** | Gold (`platinum` in database) | **$19.95 / month** | 14 days |
| **Platinum Managed** | Platinum Managed | **$39.95 / month** | 14 days |

### Find Price IDs in Stripe

1. Go to **Product catalog** → **Products**  
   https://dashboard.stripe.com/products
2. Open your **Gold / $19.95** product (name may vary).
3. On the product page, find **Pricing** section.
4. Copy the **Price ID** - it must start with `price_` (example: `price_1ABC…`).  
   **Do not** copy **Product ID** (`prod_…`) - Checkout needs `price_`.
5. Repeat for **Platinum Managed / $39.95** → copy its `price_…` ID.

Write them down:

```
Gold $19.95     → price_________________
Platinum $39.95 → price_________________
```

### Paste Price IDs into RFTS Admin

1. Open `https://reachforthestars.today/admin` and log in.
2. Go to **Content** (or **Admin Content**) → **Subscription Plans**.
3. Find the row **Gold** - paste the Gold `price_…` into **Stripe Price ID**.
4. Find **Platinum Managed** - paste the Platinum `price_…` ID.
5. Click **Save Plans**.

---

## Part E - Add the NEW webhook (critical)

This connects Stripe to the **new** website.

### E1. Create the endpoint

1. **Developers** → **Webhooks** → **Add endpoint**  
   (Stripe may say **Add destination** - same idea.)
2. **Endpoint URL** - copy/paste exactly:

   ```
   https://reachforthestars.today/api/webhooks/stripe
   ```

   - Must be `https`
   - Must be `webhooks` (plural)
   - No trailing slash

3. **Description** (optional): `RFTS production Vercel`

4. **Events to send:**
   - Choose **Select events** (not “all events”).
   - In the search box, type: `checkout.session.completed`
   - Check the box for **checkout.session.completed**
   - Click **Add events** or **Done**

5. Click **Add endpoint** / **Create**.

### E2. Copy the signing secret (`whsec_…`)

1. After creation, Stripe shows **Signing secret** on the endpoint page.
2. Click **Reveal** or **Click to reveal**.
3. Copy the full value. It starts with `whsec_`.
4. Store it somewhere safe temporarily (password manager or notepad until Vercel is done).

> Each webhook endpoint has its **own** `whsec_`. Do not use a secret from the old `universe` or `app-alpha` endpoints.

### E3. Quick test (optional)

On the same endpoint page:

1. Click **Send test webhook**.
2. Pick **checkout.session.completed**.
3. Click **Send**.

You might see **400** on the test - that can be normal for fake data. After Vercel is configured (Part F), real checkouts should show **200**.

---

## Part F - Put Stripe secrets on Vercel

### F1. Get your Live Secret Key

1. Stripe → **Developers** → **API keys**  
   https://dashboard.stripe.com/apikeys
2. Under **Standard keys**, find **Secret key**.
3. Click **Reveal live key**.
4. Copy - starts with `sk_live_`.

> Never paste `sk_live_` in email, chat, or GitHub. Only Vercel env vars.

### F2. Add variables in Vercel

1. Open https://vercel.com → your **RFTS** project.
2. **Settings** → **Environment Variables**.
3. For each row below, click **Add** (or edit if it exists).  
   **Environment:** check **Production** only (unless you also want Preview).

| Name | Value | Notes |
|------|--------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` | From F1 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | From Part E2 |
| `NEXT_PUBLIC_STRIPE_MODE` | `live` | Exact word `live` |
| `DEMO_SKIP_STRIPE` | **Delete this variable** OR set to `false` | If `true`, signup skips payment |

4. Confirm these already exist for Production:

| Name | Should be |
|------|-----------|
| `NEXT_PUBLIC_SITE_URL` | `https://reachforthestars.today` |
| `NEXT_PUBLIC_APP_URL` | `https://reachforthestars.today` |
| `POSTGRES_URL` | (your database) |
| `SESSION_SECRET` | (set) |
| `RESEND_API_KEY` | (set) |
| `EMAIL_FROM` | e.g. `Reach For The Stars <noreply@reachforthestars.today>` |

### F3. Redeploy

Env vars do not apply to the running site until you redeploy.

1. Vercel → **Deployments**.
2. Click the latest **Production** deployment.
3. **⋯** menu → **Redeploy**.
4. Wait until status is **Ready**.

---

## Part G - Link existing paying members (no double billing)

Do this for **each person who already paid on the old app** and still has an active Stripe subscription.

### G1. Find them in Stripe

1. Stripe → **Customers**  
   https://dashboard.stripe.com/customers
2. Search by **email** (same email they use on RFTS).
3. Click the customer name.

### G2. Copy two IDs

On the customer page:

1. Near the top: **Customer ID** → `cus_XXXXX` - copy it.
2. Scroll to **Subscriptions** section.
3. Click the active subscription.
4. Copy **Subscription ID** → `sub_XXXXX`.
5. Confirm status is **Active** or **Trialing** (not **Canceled**).

### G3. Create or find them on the new RFTS site

**Option A - Admin creates the account (recommended)**

1. RFTS Admin → **Members** → create member with the **same email** as Stripe.
2. Set tier:
   - Gold $19.95 → **Gold Member**
   - Platinum Managed $39.95 → **Platinum Managed Member**
3. Set subscription status → **active**.

**Option B - They already signed up on new site**

Skip create; use their existing account. Email must **match** Stripe exactly.

### G4. Paste Stripe IDs in Admin (section 3. Membership)

1. In Admin → **Members**, find the member.
2. Open their detail / edit section **3. Membership** (or Membership section).
3. Paste:
   - **Stripe Customer ID** → `cus_…`
   - **Stripe Subscription ID** → `sub_…`
4. Save.

### G5. Member sets password and logs in

- If new account: send them **Forgot password** at `/member/forgot-password` or set password via admin flow.
- They log in at `https://reachforthestars.today/member/login`.
- **Play Options** should load (not “Subscription required”).
- **Manage billing** should open Stripe portal - **not** a new Checkout page.

### G6. Do NOT do this for migrated members

- Do **not** send them through **signup Checkout** again.
- That can create a **second** monthly charge.

Repeat G1–G5 for each paying member.

---

## Part H - Test a brand-new signup (live)

Use this after Parts A–F are done.

1. Open `https://reachforthestars.today/signup/step-1-subscription-selection`
2. Complete all steps with a **new email** you have not used before (or `yourname+test1@gmail.com`).
3. On payment step you should see **Continue to Stripe Payment** - **not** “Skip Payment” (unless you are still in demo mode).
4. Complete Stripe Checkout with a real card (you can cancel later in portal).
5. After payment you should land on **Play Options** with active access.
6. Check Stripe → **Developers** → **Webhooks** → your new endpoint → **Event deliveries** → latest event should be **200**.

---

## Part I - Shut down old app (after migration)

| Item | Action |
|------|--------|
| Old Stripe webhooks (Amplify, universe) | Disabled (Part B) |
| Amplify / old hosting | Stop deployments or delete app |
| `universe-production.reachforthestars.today` DNS | Remove at name.com if still listed |
| New webhook + Vercel keys | **Keep active** |

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Signup skips payment, goes straight to console | Vercel: remove `DEMO_SKIP_STRIPE` or set `false`, redeploy |
| Checkout error “No such price” | Admin → Subscription Plans: IDs must be `price_…` from **Live** mode products |
| Paid but member still inactive | Webhook missing, wrong `whsec_` on Vercel, or webhook not 200 in Stripe |
| Webhook shows **400** | Wrong `STRIPE_WEBHOOK_SECRET` (mixed test/live secrets) |
| Webhook shows **500** | `STRIPE_WEBHOOK_SECRET` not set on Vercel |
| Member charged twice | Migrated member went through Checkout before `cus_`/`sub_` were linked |
| Manage billing does not open | Billing Portal not enabled (Part C) |

---

## Quick reference - URLs and IDs

| Item | Value |
|------|--------|
| New webhook URL | `https://reachforthestars.today/api/webhooks/stripe` |
| Webhook event | `checkout.session.completed` |
| Vercel env: secret key | `STRIPE_SECRET_KEY` = `sk_live_…` |
| Vercel env: webhook | `STRIPE_WEBHOOK_SECRET` = `whsec_…` |
| Vercel env: mode | `NEXT_PUBLIC_STRIPE_MODE` = `live` |
| Member login | `https://reachforthestars.today/member/login` |
| Signup | `https://reachforthestars.today/signup/step-1-subscription-selection` |

---

## Need help?

If stuck, note:

1. Stripe mode (Test or Live)
2. Screenshot of Webhooks table (hide secrets)
3. Last webhook delivery status (200 vs 400 vs 500)
4. Whether the member is **new signup** or **migrated from old app**

See also: `STRIPE_SETUP.md`, `docs/STRIPE_GO_LIVE_NOW.md`.
