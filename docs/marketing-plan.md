# Reach For The Stars - Marketing Plan

Overview
- Product appears to be a meditation/wellness web app with guided audio, playlists, and user accounts.
- Goal is to grow users, retention, and build an affiliate/creator ecosystem.

Positioning
- Accessible, calming audio experiences for real-life stress and recovery.
- Emphasize evidence-informed guidance, ease of use, and trusted voices.

Target Segments
- Burnout and stress (ages 25-45).
- First responders and healthcare workers.
- Parents and caregivers seeking sleep and regulation support.
- Secondary: students, remote workers, illness recovery.

Funnel Strategy
- Top of funnel: short-form content, free meditations, SEO.
- Middle of funnel: free 7-day reset challenge, email onboarding.
- Bottom of funnel: premium previews, creator endorsements, annual discount.

Channels and Tactics
Content and SEO
- Build keyword clusters: stress, anxiety, sleep, burnout, first responder support.
- **Weekly blog cadence (required):** one new article every 7 days in `src/lib/blog-posts.ts`.
- Each article links to a **goal** or **wellness** landing page and drives signup (`/signup/step-1-subscription-selection`).
- Rotate topics via `src/lib/blog-weekly-plan.ts`; check status with `npm run blog:check-cadence`.
- Mondays: Vercel cron emails staff if no post in 7+ days (see `docs/BLOG_WEEKLY_CADENCE.md`).
- Publish weekly blog posts with transcript excerpts.
- Create landing pages per audio track with summary, transcript snippet, CTA.
- **Implemented:** `/audio/[slug]` per library track; indexable catalog tracks in sitemap with related links from goal, wellness, and blog pages.
- **Marketing affiliate ref:** set `NEXT_PUBLIC_MARKETING_AFFILIATE_REF` in Vercel to your code (My Profile → Affiliate program). Blog, landing pages, header/footer, and guest signup CTAs then use `?ref=YOURCODE`. Affiliates copy per-page links from **My Profile → Share landing pages**. For manual emails, link to `https://reachforthestars.today/signup/step-1-subscription-selection?ref=YOURCODE`.

Social and Short-Form
- Post 3-5 clips per week on TikTok and Instagram Reels.
- Formats: 10-20s and 30-45s.
- Hooks: "One minute to calm down," "Sleep reset in 10 minutes."

Partnerships and Affiliates
- Tiered payouts: 20-30% first month, 10-15% recurring.
- Bonus for high retention cohorts.
- Targets: therapists, wellness coaches, community leaders, nonprofits.

Paid Acquisition
- Platforms: Meta, TikTok, YouTube pre-roll.
- Creative angles: stress relief, sleep reset, front-line support.
- Lead magnets: 5-day sleep reset or stress reset pack.

Product-Led Growth
- Referral loop: invite 3 friends, unlock premium playlist.
- Shareable audio snippets.
- Streaks and weekly recap for retention.

Trust and Credibility
- "Meet the guides" pages.
- Qualifications, certifications, trauma-informed language.
- Testimonials from target groups.

Offer Architecture
- Free tier with core sessions and daily short.
- Premium library with specialty playlists.
- Bundles: Sleep Pack, Burnout Pack, First Responders Pack.
- Annual plan discount to improve retention.

Analytics and KPIs
- North Star: weekly active listeners and 7-day retention.
- Track: CTR, landing page conversion, trial to paid, D7/D30 retention, CAC vs LTV.

90-Day Plan
Weeks 1-2
- Define top 3 personas — **done:** `docs/personas.md`
- Build 3 landing pages (sleep, stress, burnout) — **done:** `/sleep-meditation`, `/stress-relief`, `/burnout-recovery`
- Set up analytics events and funnels.
- Design affiliate program and materials — **done:** public `/affiliates` + My Profile share links; short-form scripts in `docs/short-form-clips.md`

Weeks 3-6
- Publish 15-20 short-form pieces.
- Launch 4-6 SEO starter articles.
- Run paid tests with 3 creative angles.
- Recruit first 10 affiliates.

Weeks 7-12
- Build creator/moderator pipeline.
- Launch the reset challenge.
- Optimize paid spend and retargeting.
- Partner with community orgs.

Affiliate and Moderator Program
- Onboarding pack: tone, content briefs, brand guidelines.
- Affiliate portal: tracking links and coupon codes.
- Monthly review: active affiliates, conversion, retention.
- Content licensing terms for creators — live at `/creator-content-license`; required on facilitator audio upload.
