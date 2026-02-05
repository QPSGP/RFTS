# Reach For The Stars - Blockchain Ready Platform

This is a secure, affiliate-ready wellness platform with crypto payments,
moderation workflows, and admin tooling.

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in values.
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`

## Admin Credentials

- You can either set `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (legacy), or create
  the first admin account at `/admin/setup`.
- To generate a bcrypt hash, run:
  - `node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword', 10));"`
 - Optional: set `ADMIN_SETUP_TOKEN` to require a token on `/admin/setup`.

## Crypto Payments

The homepage includes a wallet connect panel that triggers an `eth_sendTransaction`
to the configured `NEXT_PUBLIC_TREASURY_ADDRESS`.

## Fiat Payments (Stripe)

- Set `STRIPE_SECRET_KEY` and plan price IDs.
- Set `STRIPE_MODE=demo` for test keys (guardrail against live keys).
- Set `NEXT_PUBLIC_STRIPE_MODE=demo` to show a demo banner in the UI.
- Plans support trials via `NEXT_PUBLIC_STRIPE_TRIAL_*`.
- The "Start Trial" button uses Stripe Checkout in subscription mode.
- Set `NEXT_PUBLIC_SITE_URL` for correct redirect URLs.

## Moderation Submissions

Creator submissions are accepted via `POST /api/moderators` with header
`x-submission-key` matching `SUBMISSION_KEY`.

## Security Notes

- Sessions are signed with `SESSION_SECRET` and stored in HTTP-only cookies.
- Admin endpoints require a valid session.
- Add rate limits to public/admin endpoints before production.

## Admin Data Persistence

- Admin content (library, interests, affiliates, moderation, moderators, plans, playback settings) now uses Postgres tables.
- Run `scripts/schema.sql` against your Vercel Postgres instance before first use.
- For goal A/B/C audio slots, run `scripts/migrate-interests-audio-slots.sql` on existing databases.
