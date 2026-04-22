# RFTS Platform — Project Status & Where We Left Off

Use this file to get up to speed when opening the project in the **rfts-platform** folder or starting a new chat.

---

## Latest handoff — where we left off (March–April 2026 update)

Use this block to resume the next session without re-reading the whole thread.

### Schedule & verification
- **`src/lib/scheduler.ts`:** Each `ScheduleNight` can include **`rotationAdded`**, **`rotationSessionDrop`** (Gold only, session-count bands), **`rotationRemovedAfterPlays`** (play-cap after that night’s plays). Used by the app schedule JSON and by the local export (optional fields; clients can ignore).
- **Schedule export (one member):** Admin **Content Console** → **Schedule algorithm (member)**, or CLI `npm run schedule:spreadsheet` with **`SCHEDULE_EMAIL`** (optional **`SCHEDULE_NIGHTS`**). Same **`buildSchedulePreview`** as the member app. Legacy **`SCHEDULE_GOLD_EMAIL`** still works as a fallback in the script. Writes **`scripts/output/schedule-algorithm.csv/html`**. See **`scripts/SCHEDULE_SPREADSHEET.md`**. **`GET /api/admin/member-activity?email=…&limit=`** supports up to 500 rows for admin.
- **Platinum Managed + CGMR:** `src/app/api/user/schedule/route.ts` — managed members with assigned-audio list use global T-18/fallback for the special slot, not an accidental allow-list steal. **`AdminUsers`** copy matches.

### Member & admin UX
- **Admin → Members → Member activity:** Filter **All / Library plays / Session plays / Other**; row cap **20 / 50 / 100**; **`formatPlayedAudioTitle`** tolerates dash variants and multiline titles; loads up to **500** events when refreshing.
- **Library `AudioPlayer`:** **Close library audio** stops and clears the element; mobile fixed bar hides until playback resumes; copy clarifies **Play second recording** vs library. **`PlaySecondRecordingCta`** placement/copy updated on library pages.
- **`SessionPlayer`:** **End session** no longer restarts audio (overlay no longer bubbles `handlePlay` to parent; **`sessionEpochRef`** cancels stale `canplaythrough` / gap timers). **`AdminUsers`** member activity shows recording titles reliably.

### Member issue reports
- **`PATCH /api/admin/member-issue-reports`:** Member gets email the **first** time a report reaches **resolved** or **closed** (not a second email on resolved→closed). Template supports **`outcome`** in **`src/lib/email-templates.ts`**.

### Still true from earlier (short)
- **Resend / go-live:** **`RESEND_API_KEY`**, **`EMAIL_FROM`**, **`NEXT_PUBLIC_APP_URL`** on Vercel; optional **`WELCOME_EMAIL_CC`**, **`EMAIL_STAFF_BCC`**, **`REPORT_ISSUE_EMAIL`**.
- **Transactional onboarding email** CC patterns and **MemberOnboarding** / profile checkboxes — unchanged; see sections below and **`RESEND.md`**.

---

## Summary of changes (for the day)

**Use this section to keep up to date and write your daily notes.**

### Update batch — schedule export, admin activity, library & sessions (2026)

- **Schedule algorithm spreadsheet:** `scripts/schedule-spreadsheet-export.ts`, `npm run schedule:spreadsheet`, `scripts/SCHEDULE_SPREADSHEET.md`; compares two members (Gold goals vs Managed assigned order); CSV + HTML with rotation columns and yellow row highlights when rotation changes.
- **Scheduler metadata on each night:** `rotationAdded` / `rotationSessionDrop` / `rotationRemovedAfterPlays` in `src/lib/scheduler.ts` (`ScheduleNight` type).
- **Admin member activity table:** Filters (library / session / other), 20–50–100 row cap, improved **played_audio** title parsing in `AdminUsers.tsx`.
- **Library audio:** Close + hide mobile control bar; **Play second recording** confusion reduced (`AudioPlayer`, `PlaySecondRecordingCta`, library page order).
- **SessionPlayer:** End session reliability (overlay + epoch); member activity audio titles.
- **Member issue reports:** One member notice email on first **resolved** or **closed** (`email-templates`, admin route).

- **Cover art (review queue):** `public/covers-review/` — SVG drafts for `data/library.json` rows with empty `coverUrl`, generated from titles + `recording-descriptions.json` + small curated blurbs (`scripts/generate-covers-review.js`, `npm run covers:review`). Each SVG includes a **themed vector background** (keywords → `pickVisualTheme` / `renderThemedBackground` in the script) plus a text-readability fade; `manifest.json` lists `visualTheme` per track; `index.html` gallery has a **Visual theme** column. **Not** linked in the app; open `http://localhost:3000/covers-review/index.html` (or dev server) to review. Approve → export/upload PNG or SVG to Blob / set Cover URL in admin. **Production catalog covers** in `data/blob-assets.json` are **PNG** album art on Vercel Blob (`SKU-*.png`), not the review SVGs. Production DB-only libraries need a JSON export or script tweak to target missing covers.
- **Admin audio library:** Title list and each detail card include **Play preview** (`<audio controls>`) using `/api/stream/audio?id=…`. Stream API skips member subscription check when `isAdminSession()` so admins can preview even without an active member sub.
- **SessionPlayer:** **End session** — members can stop playback manually (desktop + mobile bar + tap-to-play overlays). Clears audio and timers; during gap before second, **End session — cancel second recording** skips auto second. Message: “Session ended…”
- **Audio library covers:** Member `/library` shows each item’s `coverUrl` (96px in “By goal” cards, 56px in “All Audios” list). `libraryItemCoverSrc` + `public/covers/placeholder.svg` when empty. Library detail (`AudioGate` / `AudioPlayer`) shows cover above title (`showCover` on).
- **Member UX:** Signup (`MemberOnboarding`) and reset password show **Show/Hide** on password fields; member login already had it. **SiteHeader** hides Start Your Journey / Start when `consoleType === "member"`. Referral placeholder: **How did you find us?** (onboarding, member profile, admin member profile).
- **Resend reference:** `RESEND.md` — full transactional email setup (env vars, flows, code vs dashboard). Handoff rule: when the user asks for **Resend** info, read `RESEND.md` and answer from it.
- **SessionPlayer:** Pause/Play/Restart, native audio, and mobile fixed bar render only while `phase` is `first` or `second` (`showActivePlaybackUi`). When the second track finishes (2/night), or after the nightly half completes (1/night), or during the gap between first and second, controls are hidden; `isPlaying` / `needsUserPlay` reset when a segment ends. Tests in `SessionPlayer.test.tsx`.
- **Admin → Members → Create member:** Form includes First name and Last name; list shows member name (or email). API: `POST /api/admin/users` and list use `upsertMemberProfile`; names stored on `member_profiles`.
- **Admin → View/Edit member order:** Sections are: 1. Member Profile, 2. Goals, 3. Membership/Active/sessions/Reset, 4. Add file, 5. Check audios, 6. Billing.
- **Profile save:** `PATCH /api/admin/member-profile` coerces `yearBorn` and `incomeGoalYear` to valid numbers; client sends valid years. Admin can save profile without errors.
- **Birth date and adult content:** `yearBorn` is validated (number, 1900–2100) in `/api/user/me`, `/api/user/schedule`, and `/api/stream/audio`. `hasVerifiedAge` and adult access use it. New members and admin profile both use birth year for 18+ gating.
- **Member profile matches new-member onboarding (this session):**
  - **File:** `src/components/AdminUsers.tsx` — “1. Member Profile” card only (no API changes).
  - **Layout:** Intro line “Same fields as new member signup”; Admin notes at top; then **Personal details** in onboarding order: First name, Last name, Birth year (hint: mature content 18+), Gender (hint: helps with customization), Occupation, Best contact number, Best times, Timezone.
  - **Then:** LGD checkbox (“I am interested in a Life Guidance Discovery Session.”), **Adult content** card (only when birth year implies 18+): “I consent to hear audios with mature content” + “I would like to hear audios related to polyamory”, then “I am or would like to be a therapist, healer, or coach”, then Referral (“How did you find us?…”).
  - **Separate “Additional (admin)”:** Income goal, Goal year, Goal vs current income, First responder. Save Profile unchanged.
  - **Labels/copy** aligned with `MemberOnboarding.tsx` step 1 where applicable.
- **Platinum Managed tier:** New tier `platinum_managed`; managed members use admin-assigned audios (no goal-based lineup). `DbSubscription` / types include `platinum_managed`. Signup page pricing updated (e.g. .95/mo Platinum). Admin member list: search by name/email, filter by membership tier (`AdminUsers.tsx`).
- **Managed members — goals hidden, audio order:** For managed accounts, goals UI is hidden; schedule uses assigned audios only. Audio order: admin can set display order by SKU (numbered inputs); schema + `POST /api/admin/member-audio-order`; ordering used in schedule/library for managed members.
- **Session behavior (1 vs 2 per night):** One session = two audio plays; 2 per night = full session (prep + first, gap, then second); 1 per night = half session (stop and close after first audio, no 2.5h countdown or auto second). SessionPlayer: auto-close when session ends; first session closes and queues second after gap; second auto-starts then closes. Scheduler docs updated (`src/lib/scheduler.ts`).
- **Admin Subscription Plans — second plan:** Platinum Managed added. **`src/lib/content-seed.ts`:** `defaultSubscriptionPlans` now has two entries: `platinum` (Membership) and `platinum_managed` (Platinum Managed; description: "Curated sessions and assigned audios; no goal selection."). **`src/components/AdminSubscriptions.tsx`:** UI shows both plans (filter: `platinum` or `platinum_managed`). **`src/lib/db.ts`:** `ensureSubscriptionPlansSeeded()` now inserts each default plan if missing (no longer exits when any plan exists), so existing DBs get `platinum_managed` on first load of subscription plans. Admin can set Stripe Price ID and save for both plans.
- **Affiliates — admin-only and rate copy:**
  - **Access:** `/affiliates` is admin-only. Page uses `isAdminSession()`; non-admins redirect to `/login`. **`src/components/SiteHeader.tsx`:** "Affiliates" link shown only when `consoleType === "admin"` (mobile and desktop nav). Affiliate Section remains in Admin Content Console (`/admin/content` → Affiliate Section).
  - **Rate:** **25% ongoing** — affiliates earn 25% of subscription revenue for as long as the referred member stays subscribed. **`src/app/affiliates/page.tsx`:** Hero and "Earn" card copy updated to "25% ongoing" (no first/recurring split). **`PRICING_REFERENCE.md`:** Section 4 and summary table updated to current rate: 25% ongoing; operational notes (monthly payout, threshold ~$25–50, cookie 30–60 days) kept.
  - **API:** `GET` and `PATCH` `/api/affiliates` require admin; `POST` (create affiliate) remains open for future public signup if needed.
- **Improvements and Report an issue (this session):**
  - **Member login:** `UserAuth` uses fetch + JSON; loading state ("Signing in…"), disabled submit, `?next=` redirect support (e.g. `/member/login?next=/member/report-issue`).
  - **Admin Subscription Plans:** Save button shows "Saving…" and is disabled while saving; success/error status styling.
  - **Status messages:** `.status-message`, `.status-message--success`, `.status-message--error` in `globals.css`; `.sr-only` for labels. Used in UserAuth, AdminSubscriptions, LoginForm, AdminPlaybackSettings, ReportIssueForm.
  - **Terms:** Route renamed to `/terms-and-conditions`; footer link updated; `/terms-and-condition` redirects to new URL.
  - **ModerationQueue:** Uses `ModerationItem` from `@/lib/types`.
  - **API helpers:** `src/lib/api-utils.ts` — `apiError()`, `requireAdmin()`; subscriptions route uses them. Rate limiting: `src/lib/rate-limit.ts`; applied to member login (10/min), forgot-password (5/min), signup (5/min), report-issue (5/min per user).
  - **.env.example:** Added BLOB_READ_WRITE_TOKEN, SUBMISSION_KEY, STRIPE_WEBHOOK_SECRET, DEMO_SKIP_STRIPE, POSTGRES_URL_NON_POOLING, REPORT_ISSUE_EMAIL.
  - **STRIPE_SETUP.md:** Note that Stripe Price ID is entered in Admin → Content → Subscription Plans.
  - **Report an issue:** Members can report issues from Play Options, header (when logged in as member), or `/member/report-issue`. `POST /api/member/report-issue` (auth required) sends email to REPORT_ISSUE_EMAIL or ADMIN_EMAIL or customerservice@reachforthestars.today. Form: category, subject, message; success/error styling and aria.

### Report an issue (complete flow) — session summary
- **Recipient:** All reports go to **REPORT_ISSUE_EMAIL** (optional env); if unset, default **Richard@richardleeweatherman.com**. No separate support vs general routing.
- **Confirmation email:** After a report is sent to the team, the member receives a confirmation email (template: `getReportIssueConfirmationContent` in `src/lib/email-templates.ts`) with subject/message summary and link back to console.
- **When email not configured:** If RESEND_API_KEY is missing, the API returns a friendly message (503): "We're temporarily unable to send your report by email. Please contact us at Richard@richardleeweatherman.com" instead of the raw error.
- **Categories:** Form includes Support, Technical/Website, Playback/Audio, Billing, Content/Library, Other — all are delivered to the same inbox; category is shown in the email body.
- **.env.example:** `REPORT_ISSUE_EMAIL=Richard@richardleeweatherman.com` (optional).

### Email when member checks key profile checkboxes
- **PATCH /api/member/profile:** When the member saves their profile and **newly** checks:
  - **"I am interested in a Life Guidance Discovery Session"** (`hadLgdSession` false → true) → send **LGD interest email** (next steps, how to schedule).
  - **"I am or would like to be a therapist, healer, or coach"** (`wantsPracticeGrowth` false → true) → send **therapist/healer/coach email** (Build Practice, console link).
- Emails sent only on **transition to true** (not on every save when already checked). Uses existing templates in `src/lib/email-templates.ts`. Signup already sent these when checked at registration; profile save now does the same when toggled later.

### Deploy workflow
- **Push to git (main)** → **Vercel auto-deploys** from the connected repo. No separate deploy step; agent commits and pushes from rfts-platform. Set **RESEND_API_KEY** (and optional REPORT_ISSUE_EMAIL, EMAIL_FROM, NEXT_PUBLIC_APP_URL) in Vercel → Project → Settings → Environment Variables so email works in production. See README "Email on Vercel (deployments)."

### Play Options copy
- Meditation session description: "A second recording is scheduled X hours later **if you have enabled** 2 sessions per night" (was "if the admin has enabled …"). Updated in `src/app/play-options/page.tsx` and `PlayOptionsClient.tsx`.

### Keep Screen Awake (ScreenWakeToggle)
- **Unsupported only when API missing:** `wakeLockSupported` is set to false only when `!("wakeLock" in navigator)`. If `navigator.wakeLock.request()` fails (e.g. tab not visible), we show an error but keep the button so the user can retry.
- **Detect on load:** Effect on mount sets `wakeLockSupported` to false when Wake Lock is not in navigator, so the fallback message shows immediately on unsupported browsers.
- **Fallback message:** When unsupported: "Set your device's auto-lock to 'Never' (e.g. Settings → Display → Sleep), or keep this app in the foreground."

### SessionPlayer — mobile and button colors
- **Mobile (≤768px):** When a session is playing, the **fixed bar at the bottom** includes:
  1. **Meditation session** block: Prep, First, Second (when 2 per night) with "(now playing)" beside the current track.
  2. **Pause, Play, Restart** buttons below.
- **Spacer:** Height 200px above the bar so content isn’t hidden behind it.
- **Button colors (desktop and mobile):** Pause = **red** (#dc2626), Play = **green** (#16a34a), Restart = **yellow** (#eab308, dark text for contrast). Applied in `src/components/SessionPlayer.tsx`.

---

## Moving to another computer

**Open this file (`PROJECT_STATUS.md`) and README for env/setup.** Then:

1. **Repo:** Clone or pull **rfts-platform** (or parent CursorRFTS). Work from **rfts-platform** for app code.
2. **Install:** `npm install` in rfts-platform.
3. **Env:** Copy `.env.example` to `.env.local` (or use existing); set `POSTGRES_URL`, `SESSION_SECRET`, Stripe/Blob/Resend keys per README.
4. **DB:** If new or after schema changes: `npm run db:schema` (or `node scripts/run-schema.js`).
5. **Uncommitted work:** None expected; agent should commit and push at end of session when making changes.
6. **Run:** `npm run dev`; admin at `/admin/setup` or use `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`. Member login at `/member/login`; Play Options at `/play-options`.

**Quick context:** RFTS = Next.js 14 wellness platform (Postgres, Stripe, Vercel Blob). Two subscription tiers: Platinum (Membership) and Platinum Managed; admin manages both under Subscription Plans. See "Where We Left Off" and "Quick Reference" below.

---

## What This Project Is

**Reach For The Stars (RFTS)** — A wellness platform with:
- Next.js 14 (App Router), TypeScript, Vercel Postgres, Stripe, Vercel Blob
- Member signup flow (subscription selection → personal details → payment)
- Admin (content, users, moderators, subscriptions, playback settings)
- Moderation workflow, affiliates, library, facilitator pages

App code lives in **rfts-platform** (this folder). The repo root is **CursorRFTS** (parent), which also has Marketing docs, products.csv, and Cursor agent rules.

**Until we go live:** When something needs to be done that’s in the agent’s ability (e.g. commit, push, redeploy), the agent should just do it rather than only instructing the user. **Always commit and push** at the end of a session (or after meaningful changes) until we go live.

---

## What We Did in This Session

### 1. Restored Cursor “agent” / project rules
- **Problem:** No `.cursor` or agent instructions — the project had no persistent AI context.
- **Done:** Created at repo root (CursorRFTS):
  - **`.cursor/rules/project-agent.mdc`** — Always-on rule: stack, layout (API, pages, components, lib), conventions, types.
  - **`AGENTS.md`** — Short agent instructions: work in rfts-platform, follow project rule, preserve patterns.
- **Note:** If you open only **rfts-platform** as the workspace, those files are in the parent folder; you can still open the repo root to get them, or copy/adapt rules into rfts-platform if you want everything self-contained here.

### 2. Centered the membership package on member signup
- **Problem:** “Select Your Membership Package” and the plan card were left-aligned on the signup page.
- **Done:**
  - **`src/app/globals.css`**
    - Added **`.signup-card .membership-package-section`** — flex column, `align-items: center`, so the whole membership block is centered.
    - **`.plan-grid`** — Switched to flex with `justify-content: center` (was grid).
    - **`.plan-card`** — `flex: 0 0 auto`, `max-width: 720px`, `min-width: 0` so the card doesn’t stretch and stays centered.
  - **`src/components/MemberOnboarding.tsx`** — Wrapped “Select Your Membership Package” heading + plan grid in `<div className="membership-package-section">`.
  - **`src/components/SubscriptionSelection.tsx`** — Same wrapper for consistency.
- **Result:** The single “Membership Package” card is centered on the signup page.

### 3. GitHub / Git
- **Tried:** Pushing to GitHub from this chat — **not possible** here (Git not available in this environment).
- **Status:** The **CursorRFTS** folder still had **no `.git`** as of last check — the project was not yet a Git repository.
- **Your path:** Use **GitHub Desktop** to create/add the repo and push:
  - Either: **File → New Repository** with Local Path = `…\miller-engine\CursorRFTS` (or the parent of rfts-platform).
  - Or: Initialize in Cursor (**Ctrl+Shift+P** → “Git: Initialize Repository” in CursorRFTS), then **File → Add Local Repository** in GitHub Desktop and point to that same folder.
  - Then commit and **Push origin** / **Publish repository**.

---

## Latest Session (Handoff Summary)

### Email & password reset
- **`src/lib/email.ts`** — Resend: `sendEmail()`, `getBaseUrl()`. Env: **RESEND_API_KEY** (required), **EMAIL_FROM**, **NEXT_PUBLIC_APP_URL** (optional).
- **Forgot password:** `POST /api/member/forgot-password`, `POST /api/member/reset-password`; pages `/member/forgot-password`, `/member/reset-password?token=...`. DB: `password_reset_tokens`; Resend type fix: `emails.send()` cast `as any` for build.

### Email templates
- **`src/lib/email-templates.ts`** — Welcome, LGD interest, therapist/healer/coach. Sent from **`POST /api/member/onboarding`** (welcome always; LGD if `hadLgdSession`; therapist if `wantsPracticeGrowth`).

### Admin: upload audio (Vercel Blob)
- **Upload:** `POST /api/admin/upload-audio` → **Vercel Blob** (path `audios/`). Env: **BLOB_READ_WRITE_TOKEN**. Max 4 MB; MP3/M4A/WAV/WebM/OGG. Clearer errors in API (Blob config, size, SDK message).
- **Content Console → Audio Library Section:** Step 1 = Upload file (optional), Step 2 = Add audio to library. Add Audio errors shown under button. Library API returns validation error details.
- **Members → Personalized audio (CGMR):** Upload file (optional) per member + Add Personalized Audio; API errors shown.

### Schema
- **`scripts/run-schema.js`** — Run with `node scripts/run-schema.js` or `npm run db:schema`; uses `POSTGRES_URL` from `.env.local`. Skips duplicate unique index.

### Git
- Pushes to **origin/main** from rfts-platform; repo has Git.

---

## Ongoing / Latest Session

- **Member notes:** Admin can add/edit notes on member records. Schema: `member_profiles.notes`; API: GET/PATCH `/api/admin/member-profile`; UI: Admin → Content → Members → View Member Profile → "Admin notes" textarea. Migration in `scripts/schema.sql`.
- **Playback schedule by sessions (not nights):** Rotation adds a new goal track every **N sessions**. Scheduler uses session count; admin labels say "Add new track every N sessions" and "Hours between sessions."
- **4 initial tracks = 3 goals + 1 CGMR/T-18:** Default `initialTracks` is 4. Scheduler: goal count = `initialTracks - 1`, plus one special (CGMR or T-18). Admin UI: "Initial tracks in rotation (total)" is editable; helper text explains 4 = 3 goals + 1 CGMR/T-18.
- **Admin playback:** GET `/api/playback-settings` requires admin. Existing DBs may have `initial_tracks = 3` — admin can set to 4 and save.
- **Large file uploads (up to 100 MB):** Vercel serverless body limit is 4.5 MB, so uploads use **client upload** (browser → Vercel Blob). Token handler: `POST /api/admin/upload-audio-handler` (admin-only). Used in: Audio Library Section Step 1, and Members → Personalized audio (CGMR). Both use `upload()` from `@vercel/blob/client` with multipart for files > 5 MB.

### T-18 auto-assigned on registration (this session)

- **Requirement:** T-18 should be added automatically when a member registers, until a CGMR is assigned to them.
- **Implementation:**
  - **`src/lib/db.ts`** — New helper **`addEmailToLibraryItemAllowedList(libraryItemId, email)`**: appends the email to a library item’s `allowed_user_emails` if not already present (case-insensitive). Used to “assign” the fallback track to a new member.
  - **`src/app/api/member/onboarding/route.ts`** — After creating the user and upserting the member profile, the route now: (1) gets playback settings (`getPlaybackSettings`), (2) finds the library item whose title contains the fallback code (e.g. `"T-18"` from `fallbackTrackId`), (3) calls `addEmailToLibraryItemAllowedList(fallbackItem.id, email)`. Wrapped in try/catch so onboarding does not fail if the fallback track is missing; errors are only logged.
- **Behavior:** New members get the fallback track (T-18 by default) in “Assigned to this member” and in their schedule. When admin assigns a CGMR (library item with category CGMR and the member’s email), the schedule API already prefers that over T-18, so no further change is needed.
- **Prerequisite:** A library item whose title contains the fallback code (e.g. “T-18”) must exist; Admin → Playback “Fallback track (code)” should match (default `T-18`).

**Agent rule:** Always add or update ongoing work and handoff notes in PROJECT_STATUS.md when making changes.

---

## Member login — fixed (form POST → 302)

**Symptom (was):** After member sign-in, user landed on Play Options but saw “login to view” / “Go to member login” (cookie not sent or not accepted).

**What’s actually happening:**  
1. User submits login → server validates and sets session cookie on the response.  
2. User is sent to `/play-options` (redirect or client navigation).  
3. Play Options page calls `GET /api/user/me` with `credentials: "include"`.  
4. If the cookie is missing or invalid, `/api/user/me` returns 401.  
5. Play Options then does `window.location.replace("/member/login")` (see `src/app/play-options/page.tsx`). So the “flip back” is correct behavior when the app thinks the user is not logged in — the real problem is **the session cookie is not present or not accepted on the request to `/api/user/me`**.

**Timeline of changes (what we tried):**

| Commit / state | What changed |
|----------------|--------------|
| **f2906bd** | Login API accepted **JSON only**; returned `200` + `setUserSessionCookieOnResponse(response, token)`. Client had to use **fetch** and then redirect. No form POST. |
| **2af5bde** | Play Options started **redirecting to `/member/login`** when not logged in (fetch `/api/user/me`, if not ok → replace to login). So from this point on, if the cookie isn’t sent or is invalid, user always bounces back. |
| **e2c777d → e6971cf** | Many attempts: form POST + 302/303 redirect with Set-Cookie; manual `Set-Cookie` header; 200 + HTML with meta refresh; strip quotes when reading cookie; longer client delay. None fixed the issue on Vercel. |

**Most likely root causes (check tomorrow):**

1. **SESSION_SECRET not set on Vercel**  
   - Used in `src/lib/user-auth.ts`: `getSecret()` → `process.env.SESSION_SECRET || "dev-secret"`.  
   - Token is **signed** at login and **verified** in `getUserSessionEmail()`. If `SESSION_SECRET` is missing or different between the request that sets the cookie and the one that reads it, verification fails and the API returns 401.  
   - **Action:** In Vercel → Project → Settings → Environment Variables, ensure **SESSION_SECRET** is set (same value for Production/Preview if you use both). Redeploy after adding.

2. **Cookie not set or not sent**  
   - **Action:** In DevTools → Network: on the **login** response, confirm there is a **Set-Cookie** header for `rfts_user_session`. On the **next** request (to `play-options` or `api/user/me`), confirm the **Cookie** header includes `rfts_user_session`. If Set-Cookie is missing, the server isn’t setting it. If Cookie is missing on the next request, the browser isn’t storing or sending it (e.g. Secure/domain/path).

3. **Using a custom `Set-Cookie` header instead of Next’s API**  
   - Next’s recommended way is `response.cookies.set(...)`. Passing a raw `Set-Cookie` in a headers object can behave differently on Vercel. The code was reverted below to use **only** `setUserSessionCookieOnResponse` (which uses `response.cookies.set()`) and **only** the **JSON + fetch** path (no form POST to API).

**What was reverted for tomorrow:**

- **Login API** (`src/app/api/user/login/route.ts`): Form POST path removed. Only accepts **JSON** body. On success returns **200 JSON** and sets the cookie with **`setUserSessionCookieOnResponse(response, token)`** (no manual Set-Cookie, no redirect, no HTML).
- **Member login form** (`src/components/UserAuth.tsx`): Form uses **fetch** again: `preventDefault()`, POST JSON to `/api/user/login`, `credentials: "include"`, then after **1.5 s** delay `window.location.href = "/play-options"`. Autocomplete attributes kept.

**Single path:** Client always does fetch → 200 + Set-Cookie → wait 1.5 s → redirect. One code path, Next’s cookie API only. If it still fails, the next step is to confirm **SESSION_SECRET** on Vercel and inspect **Set-Cookie** and **Cookie** in Network as above.

---

## Recent commits (handoff for next chat)

So any chat can take over from the current codebase state:

| Commit   | What changed |
|----------|--------------|
| **f40878f** | Review covers: themed SVG backgrounds from title/description; `visualTheme` in manifest; gallery column + note. `scripts/generate-covers-review.js`, `public/covers-review/*`. |
| **72f9c97** | SessionPlayer: Pause red, Play green, Restart yellow. File: `src/components/SessionPlayer.tsx`. |
| **7699ff4** | Mobile: meditation session lineup (Prep/First/Second + now playing) above Pause/Play/Restart bar. File: `SessionPlayer.tsx`. |
| **f3e5206** | Email: README "Email on Vercel"; report-issue friendly message when RESEND_API_KEY missing. Files: README, report-issue route, .env.example. |
| **31b43f0** | Report issue: confirmation email to member; all reports to Richard; profile checkmark emails (LGD, therapist/healer/coach when toggled on); Support category. Files: email-templates, report-issue route, member profile route, ReportIssueForm, .env.example. |
| **ee50d26** | Copy/UX: screen wake fallback message and retry logic; play-options "if you have enabled 2 sessions per night." Files: ScreenWakeToggle, PlayOptionsClient, page. |
| **1098df4** | (Earlier) Affiliates 25% ongoing; PRICING_REFERENCE; PROJECT_STATUS. |
| **a745f31** | Affiliates: admin-only page (redirect to `/login` if not admin), header link for admins only. Files: `src/app/affiliates/page.tsx`, `src/components/SiteHeader.tsx`. |
| **3252ad3** | Subscription plans: Platinum + Platinum Managed; seed both; AdminSubscriptions UI; PROJECT_STATUS. Files: `content-seed.ts`, `AdminSubscriptions.tsx`, `db.ts`, `PROJECT_STATUS.md`. |
| **a178500** | Admin member list: search by name/email, filter by membership tier. File: `src/components/AdminUsers.tsx`. |
| **64daea8** | TypeScript: `DbSubscription` tier type includes `platinum_managed`. File: `src/lib/db.ts`. |
| **ea4ef84** | Signup page: Platinum membership pricing .95/mo. File: `src/app/signup/step-1-subscription-selection/page.tsx`. |
| **b8c0ab2** | Platinum Managed tier; fix audio ordering; update pricing and UI text. Files: admin users route, play-options page, AdminUsers, scheduler. |
| **d325946** | Hide goals for managed members; managed accounts use assigned audios instead of goals. Files: `/api/user/goals`, `/api/user/me`, `/api/user/schedule`, play-options page, GoalsSelector, db, scheduler. |
| **b7a2d4d** | Audio order tracking for managed members: display by SKU with numbered order inputs. Schema change + `POST /api/admin/member-audio-order`; AdminUsers. |
| **b61a15d** | 1 per night: stop and close after first audio; no 2.5h countdown or auto second. Files: PlayOptionsClient, play-options page, SessionPlayer. |
| **7afbe64** | Docs: one session = two audio plays; 2 per night = full session, 1 per night = half session. Scheduler. |
| **be14894** | SessionPlayer: move cleanup useEffect after clearWaitTimers declaration. |
| **06b8c79** | Session: auto-close when session ends; first session closes and queues second after gap; second auto-starts then closes. SessionPlayer. |

---

## Where We Left Off

- **Paused (Mar 30, 2026):** Cover-review work is in a good stopping place. Latest push: **`f40878f`** — themed SVG backgrounds for review covers, gallery shows theme id, regenerated `public/covers-review/*`. No open code tasks unless you want review drafts to **match legacy PNG album art** more closely (tweak themes or export workflow). Working tree should be clean; `origin/main` matches local `main` after pull.
- **Deploy:** Push to **main** → Vercel auto-deploys. Set **RESEND_API_KEY** in Vercel Environment Variables for email. See README "Email on Vercel (deployments)."
- **Report an issue:** All reports to **Richard@richardleeweatherman.com** (or REPORT_ISSUE_EMAIL). Member gets confirmation email; friendly message when email not configured. Profile checkmark emails (LGD, therapist/healer/coach) when member toggles on in profile. See Summary above.
- **SessionPlayer:** Mobile: meditation lineup above Pause/Play/Restart; buttons: Pause red, Play green, Restart yellow. **Keep Screen Awake:** Fallback message and retry; "if you have enabled 2 sessions per night" copy.
- **Affiliates:** Admin-only. `/affiliates` redirects non-admins to `/login`. Header shows "Affiliates" only for admins. Rate on site and in `PRICING_REFERENCE.md`: **25% ongoing**. API: GET/PATCH admin-only; POST open. See "Summary of changes (for the day)" for details.
- **Member login (working):** Form POST to `/api/user/login` returns **200 + Set-Cookie + HTML** (meta refresh to `/play-options`) so the cookie is stored reliably. Play-options uses the cookie and shows the console. **`ClearSessionOnEnter`** on `/member/login` clears any stale member session when you open the login page so the header doesn’t show “Members Console” until you’ve logged in. Test user for E2E: `node scripts/seed-test-user.js` then `node scripts/test-login-e2e.js` (dev server must be running).
- **Handoff:** Read this file and **README.md** for env. Run schema with `npm run db:schema` if DB is new or after schema changes.
- **Git:** Pushes from rfts-platform to origin/main work; commit PROJECT_STATUS.md with related work.
- **T-18 on signup:** Implemented. New members are auto-assigned the fallback track (T-18) on registration; when a CGMR is assigned, the schedule uses it instead. No open follow-up for this feature.
- **Member profile like new member:** Done. Admin “1. Member Profile” now matches new-member onboarding (field order, labels, LGD → Adult content → Build practice → Referral, Adult block only when birth year implies 18+, “Additional (admin)” section). See “Summary of changes (for the day)” above.
- **Platinum Managed / sessions:** See "Summary of changes" and "Recent commits" above. Managed members: no goals UI, assigned-audio order via admin; 1 vs 2 per night in Play Options and SessionPlayer.
- **Previous context:** AdminContent has category filter (All/General/Special/CGMR). Schedule API filters library by adult and Special access, uses member profile, user-assigned CGMR; adult content gated by birthdate/consent.

---

## Quick Reference for the Agent

- **App entry:** `src/app/` (App Router); API routes under `src/app/api/`.
- **Types:** `src/lib/types.ts`.
- **Signup flow:** `src/app/signup/step-1-subscription-selection/page.tsx` uses `MemberOnboarding`; subscription UI is in `MemberOnboarding.tsx` and `SubscriptionSelection.tsx`; styles in `src/app/globals.css` (`.signup-card`, `.membership-package-section`, `.plan-grid`, `.plan-card`).
- **Member registration/onboarding:** `POST /api/member/onboarding` — creates user, profile, subscription; assigns fallback track (T-18) via `addEmailToLibraryItemAllowedList` in `src/lib/db.ts`. Fallback track is looked up by playback settings `fallbackTrackId` and library item title match.
- **Schedule / T-18 / CGMR:** `src/lib/scheduler.ts` (`buildSchedulePreview`); schedule API `src/app/api/user/schedule/route.ts` picks `userAssignedTrack` (member in allowedUserEmails + CGMR category, else first with their email). Playback settings: `src/lib/db.ts` `getPlaybackSettings`, `fallbackTrackId` default "T-18".
- **DB/schema:** `scripts/schema.sql` for Vercel Postgres; run with `node scripts/run-schema.js`; env in `.env.local` (see README).
- **Email:** `src/lib/email.ts` (Resend); templates in `src/lib/email-templates.ts`. Setup summary: **`RESEND.md`**. Env: RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL, EMAIL_STAFF_BCC, REPORT_ISSUE_EMAIL. Profile PATCH sends LGD/therapist emails when checkboxes newly turned on.
- **Upload audio:** `POST /api/admin/upload-audio` → Vercel Blob; client large uploads via `POST /api/admin/upload-audio-handler` + `@vercel/blob/client`; env: BLOB_READ_WRITE_TOKEN.
- **Admin members:** `src/components/AdminUsers.tsx` — list with search (name/email), filter by tier; managed members: goals hidden, audio order via `POST /api/admin/member-audio-order` and schema (member_audio_order). Play Options / SessionPlayer: `src/app/play-options/PlayOptionsClient.tsx`, `src/components/SessionPlayer.tsx` (1 vs 2 per night). SessionPlayer: mobile fixed bar has meditation lineup + Pause red / Play green / Restart yellow.
- **Admin Subscription Plans:** `src/components/AdminSubscriptions.tsx` — edit both plans (Platinum + Platinum Managed). Defaults in `src/lib/content-seed.ts` (`defaultSubscriptionPlans`); seeding in `src/lib/db.ts` (`ensureSubscriptionPlansSeeded` inserts each default if missing). API: GET/POST `/api/subscriptions`.
- **Affiliates:** `src/app/affiliates/page.tsx` — admin-only (server check, redirect to `/login`). Rate: 25% ongoing (copy + `PRICING_REFERENCE.md`). Header: `SiteHeader.tsx` shows "Affiliates" when `consoleType === "admin"`. API: `GET`/`PATCH` `/api/affiliates` require admin; `POST` open. Also in Admin Content Console → Affiliate Section.
- **Review-only cover drafts:** `npm run covers:review` → `scripts/generate-covers-review.js` → `public/covers-review/` (SVGs, `index.html`, `manifest.json`). Themed backgrounds: `pickVisualTheme` / `renderThemedBackground` in that script.
- **Report an issue:** `POST /api/member/report-issue` (member auth); page `/member/report-issue`; link in header (when member) and on Play Options. All reports to **REPORT_ISSUE_EMAIL** or default **Richard@richardleeweatherman.com**. Member gets confirmation email. When RESEND_API_KEY missing, API returns friendly message with Richard’s email. Rate limit: 5/min per user. Categories: Support, Technical, Playback, Billing, Content, Other (all same inbox).
- **API helpers:** `src/lib/api-utils.ts` — `apiError()`, `requireAdmin()`. Rate limit: `src/lib/rate-limit.ts` — login, forgot-password, signup, report-issue.
