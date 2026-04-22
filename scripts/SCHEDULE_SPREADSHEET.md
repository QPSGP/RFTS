# Schedule algorithm export (single member)

Exports the **same** schedule the app uses for “Tonight’s Audio” (`buildSchedulePreview` in `src/lib/scheduler.ts`, with inputs aligned to `GET /api/user/schedule`).

**Gold (platinum):** goal-based rotation. **Platinum Managed:** `member_audio_assignments` order. The export picks the path from the member’s subscription tier.

## Option A — Admin (recommended)

1. Open **Content Console** → [Schedule algorithm (member)](/admin/content#admin-schedule-algorithm).
2. Enter the **member email**, set **nights (1–366)**, then **Preview in admin** and/or **Download CSV** / **Download HTML**.

Uses the **production** database when you are on the live site.

## Option B — Local CLI

From `rfts-platform` with `POSTGRES_URL` in `.env.local`:

```powershell
$env:SCHEDULE_EMAIL="richard@visimon.app"
$env:SCHEDULE_NIGHTS="42"
npm run schedule:spreadsheet
```

- Output: `scripts/output/schedule-algorithm.csv` and `schedule-algorithm.html` (gitignored).  
- Legacy: `SCHEDULE_GOLD_EMAIL` is still read if `SCHEDULE_EMAIL` is not set (single-account export only).

## Column reference

| Column | Meaning |
|--------|--------|
| Schedule night | 1…N (same as app). |
| Algorithm note | e.g. special / T-18 night, etc. |
| Play 1 / 2, SKU | First and second main play that night. |
| Rotation (night start) | New item in rotation and/or (Gold) session-drop. |
| Rotation (after plays) | After this night, items removed for play-cap. |

Yellow Highlight in HTML: rotation change that night. Use conditional formatting in Excel on rotation columns if you use CSV.

## If a Platinum Managed schedule looks empty

- Ensure **member audio assignments** are saved in Admin for that email, then re-run.

## Algorithm code

`src/lib/scheduler.ts` and `PROJECT_STATUS.md` (schedule notes).
