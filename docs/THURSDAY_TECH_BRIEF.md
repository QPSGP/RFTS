# Thursday morning tech meeting brief

Every Thursday morning (when you first connect in Cursor), the agent should produce this brief automatically (see `.cursor/rules/thursday-tech-brief.mdc`).

## Generate data

```bash
cd rfts-platform
npm run brief:thursday
```

Optional:

```bash
npm run brief:thursday -- --since=2026-07-14
npm run brief:thursday -- --covers-only
```

Requires `POSTGRES_URL` in `.env.local`.

## Brief contents

1. **Developed & fixed** since last Thursday (`git log`)
2. **Public library covers missing** (general catalog, excluding CGMR titles)
3. **Tech meeting agenda** for the morning sync

## Cover definition

A cover is **missing** when `cover_url` is empty or contains `placeholder`.  
**Public library** rows are `in_general_catalog = true`, no moderator owner, and title does not look like a CGMR.
