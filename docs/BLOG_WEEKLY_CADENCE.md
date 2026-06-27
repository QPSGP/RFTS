# Weekly blog cadence

**Goal:** Publish **one SEO article per week** that links to a **goal** or **wellness** landing page and drives readers to **signup**.

## Cadence

- **Frequency:** at least one new post every **7 days**
- **Rotation:** alternate through goals and wellness focus areas (see `src/lib/blog-weekly-plan.ts`)
- **Signup CTA:** every article must link to `/signup/step-1-subscription-selection` (built into `BlogPostView`)

## How to add an article

1. Run `npm run blog:check-cadence` — shows whether a post is due and the **suggested next topic**
2. Add a new entry to `src/lib/blog-posts.ts`:
   - `publishedAt` (today)
   - `topicSlug` when the article matches a wellness landing page
   - Sections + `transcriptExcerpt` (existing pattern)
   - Mention the related goal/wellness page in body copy where natural
3. Deploy — sitemap picks up `/blog/[slug]` automatically
4. Run `npm run blog:check-cadence` again to confirm on track

## Reminders

| Mechanism | What it does |
|-----------|----------------|
| `npm run blog:check-cadence` | Local check; exits with error if overdue |
| Vercel Cron `GET /api/cron/blog-cadence-reminder` | Mondays 09:00 UTC — emails staff **only when overdue** |
| `.cursor/rules/blog-weekly.mdc` | Cursor agents check cadence when working on blog/marketing |

## Cron

Configured in `vercel.json` (same `CRON_SECRET` as other cron routes).

## Topic rotation

Topics are built from:

- **Goals:** Health, Wealth, Relationship, Memory, Inspiration, Spirituality, Overcoming Addiction, Balanced Life
- **Wellness:** 10 scientifically proven benefit areas (sleep, stress, pain, memory, etc.)

The next suggested topic advances by `blog post count % rotation length`.
