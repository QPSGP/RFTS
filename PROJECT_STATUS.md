# RFTS Platform — Project Status & Where We Left Off

Use this file to get up to speed when opening the project in the **rfts-platform** folder or starting a new chat.

---

## Summary of changes (for the day)

**Use this section to keep up to date and write your daily notes.**

- **Admin → Members → Create member:** Form includes First name and Last name; list shows member name (or email). API: `POST /api/admin/users` and list use `upsertMemberProfile`; names stored on `member_profiles`.
- **Admin → View/Edit member order:** Sections are: 1. Member Profile, 2. Goals, 3. Membership/Active/sessions/Reset, 4. Add file, 5. Check audios, 6. Billing.
- **Profile save:** `PATCH /api/admin/member-profile` coerces `yearBorn` and `incomeGoalYear` to valid numbers; client sends valid years. Admin can save profile without errors.
- **Birth date and adult content:** `yearBorn` is validated (number, 1900–2100) in `/api/user/me`, `/api/user/schedule`, and `/api/stream/audio`. `hasVerifiedAge` and adult access use it. New members and admin profile both use birth year for 18+ gating.
- **Member profile matches new-member onboarding (this session):**
  - **File:** `src/components/AdminUsers.tsx` — “1. Member Profile” card only (no API changes).
  - **Layout:** Intro line “Same fields as new member signup”; Admin notes at top; then **Personal details** in onboarding order: First name, Last name, Birth year (hint: mature content 18+), Gender (hint: helps with customization), Occupation, Best contact number, Best times, Timezone.
  - **Then:** LGD checkbox (“I am interested in a Life Guidance Discovery Session?”), **Adult content** card (only when birth year implies 18+): “I consent to hear audios with mature content” + “I would like to hear audios related to polyamory”, then “I am or would like to be a therapist, healer, or coach”, then Referral (“How did you find us?…”).
  - **Separate “Additional (admin)”:** Income goal, Goal year, Goal vs current income, First responder. Save Profile unchanged.
  - **Labels/copy** aligned with `MemberOnboarding.tsx` step 1 where applicable.
- **Platinum Managed tier:** New tier `platinum_managed`; managed members use admin-assigned audios (no goal-based lineup). `DbSubscription` / types include `platinum_managed`. Signup page pricing updated (e.g. .95/mo Platinum). Admin member list: search by name/email, filter by membership tier (`AdminUsers.tsx`).
- **Managed members — goals hidden, audio order:** For managed accounts, goals UI is hidden; schedule uses assigned audios only. Audio order: admin can set display order by SKU (numbered inputs); schema + `POST /api/admin/member-audio-order`; ordering used in schedule/library for managed members.
- **Session behavior (1 vs 2 per night):** One session = two audio plays; 2 per night = full session (prep + first, gap, then second); 1 per night = half session (stop and close after first audio, no 2.5h countdown or auto second). SessionPlayer: auto-close when session ends; first session closes and queues second after gap; second auto-starts then closes. Scheduler docs updated (`src/lib/scheduler.ts`).
- **Admin Subscription Plans — second plan:** Platinum Managed added. **`src/lib/content-seed.ts`:** `defaultSubscriptionPlans` now has two entries: `platinum` (Membership) and `platinum_managed` (Platinum Managed; description: "Curated sessions and assigned audios; no goal selection."). **`src/components/AdminSubscriptions.tsx`:** UI shows both plans (filter: `platinum` or `platinum_managed`). **`src/lib/db.ts`:** `ensureSubscriptionPlansSeeded()` now inserts each default plan if missing (no longer exits when any plan exists), so existing DBs get `platinum_managed` on first load of subscription plans. Admin can set Stripe Price ID and save for both plans.

---

## Moving to another computer

**Open this file (`PROJECT_STATUS.md`) and README for env/setup.** Then:

1. **Repo:** Clone or pull **rfts-platform** (or parent CursorRFTS). Work from **rfts-platform** for app code.
2. **Install:** `npm install` in rfts-platform.
3. **Env:** Copy `.env.example` to `.env.local` (or use existing); set `POSTGRES_URL`, `SESSION_SECRET`, Stripe/Blob/Resend keys per README.
4. **DB:** If new or after schema changes: `npm run db:schema` (or `node scripts/run-schema.js`).
5. **Uncommitted work (this session):** Subscription plans change: `src/lib/content-seed.ts`, `src/components/AdminSubscriptions.tsx`, `src/lib/db.ts`. Optionally: `src/app/play-options/PlayOptionsClient.tsx` (may show as modified due to line endings only). Commit and push when ready.
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

- **Uncommitted (this session):** **Subscription plans (second plan):** `src/lib/content-seed.ts`, `src/components/AdminSubscriptions.tsx`, `src/lib/db.ts`. Also possibly `src/app/play-options/PlayOptionsClient.tsx` (line-ending only). Commit these when moving computers or when ready; then push to origin/main.
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
- **Email:** `src/lib/email.ts` (Resend); templates in `src/lib/email-templates.ts`. Env: RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL.
- **Upload audio:** `POST /api/admin/upload-audio` → Vercel Blob; client large uploads via `POST /api/admin/upload-audio-handler` + `@vercel/blob/client`; env: BLOB_READ_WRITE_TOKEN.
- **Admin members:** `src/components/AdminUsers.tsx` — list with search (name/email), filter by tier; managed members: goals hidden, audio order via `POST /api/admin/member-audio-order` and schema (member_audio_order). Play Options / SessionPlayer: `src/app/play-options/PlayOptionsClient.tsx`, `src/components/SessionPlayer.tsx` (1 vs 2 per night).
- **Admin Subscription Plans:** `src/components/AdminSubscriptions.tsx` — edit both plans (Platinum + Platinum Managed). Defaults in `src/lib/content-seed.ts` (`defaultSubscriptionPlans`); seeding in `src/lib/db.ts` (`ensureSubscriptionPlansSeeded` inserts each default if missing). API: GET/POST `/api/subscriptions`.
