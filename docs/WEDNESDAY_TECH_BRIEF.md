# Wednesday morning tech meeting brief

Every Wednesday morning (when you first connect in Cursor), the agent should produce this brief automatically (see `.cursor/rules/wednesday-tech-brief.mdc`).

## Generate data

```bash
cd rfts-platform
npm run brief:wednesday
```

Optional:

```bash
npm run brief:wednesday -- --since=2026-07-15
npm run brief:wednesday -- --covers-only
```

(`brief:thursday` remains as an alias to the same script.)

## Brief contents

1. **Developed & fixed** since last Wednesday (`git log`)
2. **Public library covers still missing** (Postgres; excludes CGMR / private)
3. **Wednesday morning tech meeting agenda**
