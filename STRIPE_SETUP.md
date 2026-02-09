# Stripe Setup for RFTS

## Linking subscription plans to Stripe

Plans are stored in the `subscription_plans` table. The **Stripe Price ID** links each plan to a Stripe product/price so checkout works correctly.

### 1. Create a product and price in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products** (use **Test mode** for demo).
2. Click **Add product**.
3. Set:
   - **Name:** e.g. "RFTS Membership"
   - **Pricing:** Recurring (monthly), amount (e.g. $39.95)
   - **Free trial:** Optional (e.g. 14 days)
4. Click **Save product**.
5. Copy the **Price ID** (starts with `price_`).

### 2. Add the Price ID in RFTS Admin

1. Log in as Admin.
2. Go to **Admin Content** → **Subscription Plans**.
3. For the plan (e.g. "RFTS Membership Package"), paste the Stripe Price ID into **Stripe Price ID**.
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
DEMO_SKIP_STRIPE=true   # optional: allow skip payment even when Stripe not fully configured
```
