# DNS (name.com) + Resend - step-by-step

Your site **`https://reachforthestars.today`** is already loading, so **Vercel DNS for the website is likely done**. Use this checklist to confirm and to add **Resend** email records on the same domain.

---

## Part A - Confirm Vercel DNS (website)

### In Vercel

1. [Vercel Dashboard](https://vercel.com) → your RFTS project → **Settings** → **Domains**
2. Confirm **`reachforthestars.today`** and **`www.reachforthestars.today`** show **Valid Configuration** (green check).

### In name.com

1. Log in → **My Domains** → **reachforthestars.today** → **DNS Records** (or **Manage DNS**)
2. You should see records Vercel asked for, typically one of:
   - **A** record: `@` → Vercel IP (e.g. `76.76.21.21`), **or**
   - **CNAME**: `@` or `www` → `cname.vercel-dns.com`
3. If Vercel still shows “Invalid Configuration”, compare name.com to Vercel’s **Domains** page and fix mismatches. Remove old A/CNAME that point to a previous host.

**Test:** `https://reachforthestars.today` loads (you already have this).

---

## Part B - Resend domain verification (email)

Do this so mail can send from **`noreply@reachforthestars.today`** (not only `onboarding@resend.dev`).

### 1. Add domain in Resend

1. [Resend](https://resend.com) → **Domains** → **Add Domain**
2. Enter **`reachforthestars.today`** (apex domain, not www)
3. Resend shows **DNS records** to add - usually:
   - **TXT** (domain verification)
   - **MX** (optional for receiving; often needed for sending reputation)
   - Sometimes **CNAME** for DKIM (e.g. `resend._domainkey`)

### 2. Add those records at name.com

1. name.com → **reachforthestars.today** → **DNS Records**
2. **Add** each record Resend shows (type, host/name, value, priority for MX)
3. **Host/name tips:**
   - `@` = apex (`reachforthestars.today`)
   - Some panels want `@` for root; others want blank for root
   - DKIM often looks like `resend._domainkey` or similar - copy exactly from Resend

4. **Do not delete** Vercel’s A/CNAME records - website and email DNS live in the same zone.

### 3. Wait for verification

1. Back in Resend → **Domains** → click **Verify** / refresh until status is **Verified**
2. Propagation: often 5–60 minutes; can take up to 48 hours

### 4. Update Vercel env + redeploy

1. Vercel → **Settings** → **Environment Variables** → **Production**
2. Set:
   ```
   EMAIL_FROM=Reach For The Stars <noreply@reachforthestars.today>
   ```
   (Use the exact address Resend allows for your verified domain.)
3. Confirm **`RESEND_API_KEY`** is set.
4. **Deployments** → latest → **Redeploy** (required after `EMAIL_FROM` change).

### 5. Test email

1. Production: **Forgot password** on `/member/forgot-password` with a test member email
2. Or admin **Report an issue** flow
3. Check the message sends and links use `https://reachforthestars.today/...`

---

## Quick reference - records in one place

| Purpose | Where to configure | Typical records |
|--------|-------------------|-----------------|
| Website (Vercel) | name.com DNS | A or CNAME from Vercel Domains page |
| Email send (Resend) | name.com DNS | TXT + DKIM CNAME + MX from Resend Domains page |
| App URLs | Vercel env | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` |

---

## Stripe (when you’re ready - no double charge)

**Do not turn on live checkout for existing members until their Stripe IDs are linked.**

1. Use the **same Stripe account** as the old system (`STRIPE_SECRET_KEY=sk_live_…` on Vercel).
2. In **Stripe Dashboard → Customers**, find each member by email → copy **`cus_…`** and active **`sub_…`**.
3. In **Admin → Members → View member** → section **3. Membership** → paste **Stripe Customer ID** and **Stripe Subscription ID** → **Save**.
4. Set tier **active**; member uses **Manage billing** - **not** signup Checkout again.
5. App blocks new Checkout when those IDs exist (billing portal instead).

See **`STRIPE_SETUP.md`** (Go-live: link old-system Stripe customers).

---

## If Resend verify fails

| Symptom | Fix |
|--------|-----|
| “Pending” forever | Wait 1h; confirm TXT/DKIM at name.com match Resend exactly (no extra quotes) |
| Sends fail after verify | `EMAIL_FROM` must use verified domain; redeploy Vercel |
| Links in email wrong | `NEXT_PUBLIC_APP_URL=https://reachforthestars.today` + redeploy |
