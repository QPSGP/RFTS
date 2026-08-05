# Blog cadence (3 posts / week)

**Goal:** Publish **three SEO articles per week** that link to a **goal** or **wellness** landing page and drive readers to **signup**.

## Cadence

- **Frequency:** **3 published posts** every calendar week (Monday–Sunday, UTC)
- **Pace milestones** (for late reminders):
  - Mon–Tue: at least **1**
  - Wed–Thu: at least **2**
  - Fri–Sun: at least **3**
- **Rotation:** alternate through goals and wellness focus areas (see `src/lib/blog-weekly-plan.ts`)
- **Signup CTA:** every article must link to `/signup/step-1-subscription-selection` (built into `BlogPostView`)

## How to add an article

1. Run `npm run blog:check-cadence` - shows weekly progress and the **suggested next topic**
2. Add a new entry to `src/lib/blog-posts.ts`:
   - `publishedAt` (today)
   - `topicSlug` when the article matches a wellness landing page
   - Sections + `transcriptExcerpt` (existing pattern)
   - Mention the related goal/wellness page in body copy where natural
3. Deploy - sitemap picks up `/blog/[slug]` automatically
4. Run `npm run blog:check-cadence` again to confirm on track

## Reminders

| Mechanism | What it does |
|-----------|----------------|
| `npm run blog:check-cadence` | Local check; exits with error if behind pace |
| Vercel Cron `GET /api/cron/blog-cadence-reminder` | Daily 17:00 UTC - emails staff **only when late** |
| Admin Marketing overview | Shows current week cadence status |
| `.cursor/rules/blog-weekly.mdc` | Cursor agents check cadence when working on blog/marketing |

## Cron

Configured in `vercel.json` (same `CRON_SECRET` as other cron routes).

## Topic rotation

Topics are built from:

- **Goals:** Health, Wealth, Relationship, Memory, Inspiration, Spirituality, Overcoming Addiction, Balanced Life
- **Wellness:** 10 scientifically proven benefit areas (sleep, stress, pain, memory, etc.)

The next suggested topic advances by `blog post count % rotation length`.
