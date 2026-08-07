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
- Locked digital lead detail (payload, scan path, outreach target id)
- **Import Sarah Rose scan** - verified extract from `docs/20260803_124059.PDF` (image at `docs/lead-card-scans/20260803_124059-1.jpg`)

Each submit also creates an Outreach **individual** target + primary contact for CRM follow-up.

## Resend
Optional auto-reply on submit (checkbox on form). Templates:
- Practice: `getEventLeadPracticeAutoReplyContent`
- Consumer: `getEventLeadConsumerAutoReplyContent`

## Scan import
Folder: `docs/lead-card-scans/20260806 Leads from Long Beach Holistic Health Expo/` (106 PDFs).

Pipeline:
1. JPEG + preview under `docs/lead-card-scans/long-beach-2026-08/`
2. Hand/vision extracts → `docs/lead-card-scans/long-beach-2026-08/extracts.json` (also `public/lead-card-extracts/long-beach-2026-08.json`)
3. Admin → Event leads → **Import extracts JSON batch**
4. Optional bulk vision: add `OPENAI_API_KEY` to `.env.local`, then `npx tsx scripts/extract-lead-card-scans.ts`

Staff marks **DN / No Deal** → import status `paused`.
