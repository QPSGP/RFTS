# Schedule algorithm spreadsheet (Gold vs Platinum Managed)

This compares **two member accounts** side by side using the same code path as production: `buildSchedulePreview` in `src/lib/scheduler.ts` and the same inputs as `GET /api/user/schedule` (library, playback settings, goals vs assigned audio order, per-member library filtering, T-18/CGMR allow-list rules).

## Who this is for

- **Column “Gold (non-managed)”** — goal-based rotation (e.g. **Craig Rogers** on standard Gold / `platinum`).
- **Column “Platinum Managed”** — admin-ordered assigned audios (e.g. **Terry & Craig Rogers** on `platinum_managed` with `member_audio_assignments`).

## How to generate the CSV / HTML

1. From `rfts-platform`, ensure `.env.local` has a working **`POSTGRES_URL`** (or `POSTGRES_URL_UNPOOLED`) so the app can read members and library.
2. Set member emails and run the export.

### Ready-to-run: Craig (Gold) vs Terry (Platinum Managed)

Use these when comparing **Craig Rogers** (non-managed) and **Terry & Craig Rogers** (managed):

```powershell
# PowerShell
$env:SCHEDULE_GOLD_EMAIL="CraigMiloRogers@gmail.com"
$env:SCHEDULE_MANAGED_EMAIL="terry_bg@msn.com"
$env:SCHEDULE_NIGHTS="42"
npm run schedule:spreadsheet
```

```bash
# macOS / Linux
SCHEDULE_GOLD_EMAIL=CraigMiloRogers@gmail.com \
SCHEDULE_MANAGED_EMAIL=terry_bg@msn.com \
SCHEDULE_NIGHTS=42 \
npm run schedule:spreadsheet
```

### Other members

Replace with any two login emails (Gold goal-based vs Platinum Managed with assignments):

```bash
# PowerShell
$env:SCHEDULE_GOLD_EMAIL="member1@example.com"
$env:SCHEDULE_MANAGED_EMAIL="member2@example.com"
$env:SCHEDULE_NIGHTS="42"
npm run schedule:spreadsheet
```

3. Open the files under **`scripts/output/`**:
   - **`schedule-algorithm-comparison.csv`** — open in Excel or Google Sheets (you may delete the `#` comment lines at the top if you want a clean table only).
   - **`schedule-algorithm-comparison.html`** — open in a browser; you can also open in Excel.

`scripts/output/` is gitignored; copy the files elsewhere if you need to share them.

## What the columns mean

| Column | Meaning |
|--------|--------|
| Schedule night | Night index 1…N (same as app “schedule night”). |
| Algorithm note | e.g. rotation vs T-18/CGMR night (see scheduler). |
| Gold — play 1 / 2 | First and second main play that night (when 2 plays/night). |
| Managed — play 1 / 2 | Same for the managed account’s assigned-audio rotation. |
| SKU | Library SKU codes for traceability. |
| **Gold — rotation (night start)** | **New goal enters** the active set (add-new-track rule) and/or **session-drop**: a goal **leaves** the active set per the fixed session-count bands (first “set” dropping off over time). |
| **Gold — rotation (after plays)** | After this night’s listens, any **goal removed** because every track for that goal hit `playsPerRecording`. |
| **Managed — rotation (night start)** | **New assigned audio** enters the active rotation (same add-new-track cadence as Gold, but for assigned list order). |
| **Managed — rotation (after plays)** | Assigned **audio removed** after this night when it reached `playsPerRecording` plays. |

In the **HTML** export, any night where **either** account has a rotation event is **highlighted in yellow** for quick scanning. The CSV has the same text in the rotation columns (use conditional formatting in Excel on those columns if you want colors locally).

## If managed column looks wrong

- The managed account must have **`member_audio_assignments`** rows (admin “Check audios” / audio order). If the script warns about missing assignments, fix data in admin first, then re-run.

## Algorithm reference

See `src/lib/scheduler.ts` and `PROJECT_STATUS.md` (schedule / T-18 / CGMR notes).
