# Event lead cards (Expo + QR)

## Forms
| Form | Path | Default persona / category |
|------|------|----------------------------|
| Practice survey | `/lead/practice` | Chris - Spiritual Entrepreneur / Coaches, studios & practitioners |
| Consumer lead (Abundance) | `/lead/consumer` | Offer code `abundance-magnet` |

Both pages are **noindex** and not in the site nav. Share via QR or direct link only.

Long Beach Expo practice QR (default):
`/lead/practice?key=holistic-healing-expo-long-beach-2026-08`

## Admin
**Admin → Marketing → Event leads**
- List / filter by event key
- **Add lead** and **Edit** (syncs linked Outreach target/contact when present)
- Detail view (payload, scan path, outreach target id) with status dropdown
- Scanned leads open in **Compare & edit** with an **Open scan to compare** link so staff can check the card image against the fields that were read
- **Import extracts JSON batch** for Long Beach Expo scans

Each submit also creates an Outreach **individual** target + primary contact for CRM follow-up.

After a successful CRM add, matching **Convert lead card** emails are lined up and sent weekly (Mondays) until the person converts, opts out, or the interest list is finished. Admin → Marketing → Leads & outreach → **3. Weekly emails**.

Lead-card checkbox emails: **Convert lead card - {interest}** (and **Convert menu - Lead card interests** when they marked many). Seed via Admin → Marketing → **Add missing starter templates**. See `docs/MEMBER_CONVERSION_EMAILS.md`.

## Resend
Optional auto-reply on submit (checkbox on form). Templates:
- Practice: `getEventLeadPracticeAutoReplyContent`
- Consumer: `getEventLeadConsumerAutoReplyContent`

## Scan import
Folder: `docs/lead-card-scans/20260806 Leads from Long Beach Holistic Health Expo/` (106 PDFs).

Pipeline:
1. JPEG + preview under `docs/lead-card-scans/long-beach-2026-08/`
2. Hand/vision extracts → `docs/lead-card-scans/long-beach-2026-08/extracts.json` (admin-only; served via `GET /api/admin/marketing/event-leads?extracts=long-beach-2026-08`)
3. Admin → Event leads → **Import extracts JSON batch**
4. Optional bulk vision: add `OPENAI_API_KEY` to `.env.local`, then `npx tsx scripts/extract-lead-card-scans.ts`
5. Upload JPEGs to Vercel Blob so production admin can open them: `npm run upload:lead-scans` (needs `BLOB_READ_WRITE_TOKEN` in `.env.local`). The scan API still requires admin login.

**Security:** Do not put extracts under `public/` (PII). Public `POST /api/lead/submit` is rate-limited.

Staff marks **DN / No Deal** → import status `paused`.
