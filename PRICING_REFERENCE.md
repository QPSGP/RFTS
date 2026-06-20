# RFTS Pricing Reference

Research on comparable membership services, how RFTS compares, and recommended pricing (members, affiliates, facilitators). Use this for strategy and when setting Stripe prices or payout rules.

---

## 1. Comparable Services — Monthly Pricing

| Service | Monthly | Annual (effective/month) | Notes |
|--------|---------|---------------------------|--------|
| **Headspace** | $12.99 | ~$5.83 (~$70/yr) | Large brand, app-first, 7–14 day trial |
| **Calm** | $14.99 | ~$5.83 (~$70/yr) | Sleep, anxiety, cinematic content |
| **Insight Timer** | $9.99 (Member Plus) | ~$5 (~$60/yr) | Large free tier, community + teachers |
| **Hypnotherapy / niche audio** | $11.99–$19 | ~$11–$16/mo | I Need Hypno, Calmer You, etc. |
| **Personal development** (Mindvalley, LifeHack) | $45–$49 | ~$29–$33 | Courses, coaching, community |

**Takeaway:** Mass-market meditation apps sit around **$10–$15/month** or **$60–$70/year**. Niche audio (hypnotherapy, specialized wellness) often **$12–$19/month**. Higher-touch personal development with coaching/community runs **$30–$50/month**.

---

## 2. How RFTS Compares

- **More personalized:** Goal-based scheduling + optional CGMR/personalized tracks (closer to “your coach’s library” than a generic app).
- **Facilitator-led:** Content and relationships are tied to facilitators, not just a single brand.
- **Affiliate channel:** You’re building a referral network (affiliates + facilitators).
- **Niche:** Specialized wellness / personal growth, not “generic meditation app.”

RFTS sits **between** generic apps (Headspace/Calm) and high-touch personal development (Mindvalley): more personalized than the former, lighter than full coaching memberships.

---

## 3. Recommended Member Pricing

### Monthly

- **Suggested range:** $14.99–$19.99/month.
- **Recommended default:** **$19.99/month** (list price).
- Slightly above mass-market apps ($10–$15) because of personalization and facilitator content; in line with hypnotherapy/niche audio ($12–$19).

### Annual

- **Suggested:** $119–$149/year (~$9.92–$12.42/month), i.e. about **2 months free** vs monthly.
- Aligns with common “~$60–70/year” annual pattern while reflecting higher value.
- **Recommendation:** **$149/year** or **$119/year** for a stronger annual push.

### Trial

- **7–14 day free trial** (e.g. keep 14 days if it converts well). Standard in the space.

---

## 4. Affiliate Recommendations

- **Current rate:** **25% ongoing** — affiliates earn 25% of subscription revenue for as long as the referred member stays subscribed.
- **Benchmarks:** Insight Timer ~50% of first year; others 25–45% one-time or 10–30% recurring.
- **Operational:** Monthly payout; minimum threshold **$25 through launch period** (default through June 18, 2027), then **$50**; cookie 30–60 days. Set `NEXT_PUBLIC_AFFILIATE_PAYOUT_LAUNCH_END` to adjust launch end date.

---

## 5. Facilitator Recommendations

- **Benchmarks:** Coach/facilitator revenue share on platforms often **20–30%**; some niches 15–25%.
- **Current structure:** Facilitators who refer are affiliates (25% ongoing). When they **manage** a client, they earn an **additional 25%** on top of that—so 25% affiliate + 25% management = **50% total** for managed clients. If they stop managing, they keep the 25% affiliate share for those they brought in.
- **Operational:** Monthly payout; clear rules for “facilitator-attributed and managed” members (link, tag, or CGMR assignment).

---

## 6. Summary — Quick Reference

| Element | Recommendation |
|--------|-----------------|
| **Member monthly** | **$19.99/month** (list); consider $14.99 as promo or regional. |
| **Member annual** | **$149/year** (~$12.42/mo) or **$119/year** (~$9.92/mo). |
| **Free trial** | 7–14 days. |
| **Affiliate** | 25% ongoing for as long as the referred member stays subscribed. |
| **Facilitator** | 25% affiliate + **additional 25%** when managing the client (50% total for managed); if they stop managing, 25% affiliate continues. |

---

## 7. Where This Lives in the Codebase

- **Subscription plans / Stripe:** Admin → Subscriptions; create prices in Stripe (e.g. $19.99/month, $149/year) and set `priceId` on plans.
- **Defaults:** `src/lib/content-seed.ts` — `defaultSubscriptionPlans` (e.g. `trialDays`, plan `id`); actual amounts are in Stripe.
- **Affiliate / facilitator payouts:** Implement or adjust in admin and payout logic (percentages and attribution rules).

---

*Last updated: February 2025. Refresh benchmarks periodically.*
