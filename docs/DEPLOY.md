# Deploy & ops checklist

Use this before and after shipping changes to production (`https://reachforthestars.today`).

## Pre-deploy

1. **Env vars** - Confirm Vercel has required values: `SESSION_SECRET`, Postgres (`POSTGRES_URL`), Stripe keys, `RESEND_API_KEY`, `SUBMISSION_KEY`, cron secret if used.
2. **Schema** - If `scripts/schema.sql` changed, run locally against prod DB:
   ```bash
   npm run db:schema
   ```
3. **Build** - From `rfts-platform/`:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
4. **Smoke tests** (against production or staging):
   ```bash
   npm run test:facilitator-smoke
   npm run test:production-smoke
   ```

## Deploy

**Option A - Git push (Vercel auto-deploy)**

```bash
git add -A
git commit -m "your message"
git push
```

**Option B - Vercel CLI**

```bash
npm run deploy
```

**Option C - Commit + push helper**

```bash
DEPLOY_MSG="feat: your message" npm run push-deploy
```

## Post-deploy verification

1. Open `/login` - admin and facilitator login load.
2. Open `/moderator/console` - facilitator console loads (after login).
3. Open `/admin` - admin panels load (after login).
4. Member flows: `/member/profile`, library playback, checkout redirect.
5. Re-run smoke tests against production if you changed API routes or auth.

## Rollback

- Vercel Dashboard → Deployments → promote previous deployment.
- For DB changes, restore from backup or run a corrective migration script (no automatic down migrations).

## CI

GitHub Actions workflow `.github/workflows/smoke.yml` runs facilitator and production smoke tests on pushes and PRs to `main`.
