# RFTS Platform — Project Status & Where We Left Off

Use this file to get up to speed when opening the project in the **rfts-platform** folder or starting a new chat.

---

## What This Project Is

**Reach For The Stars (RFTS)** — A wellness platform with:
- Next.js 14 (App Router), TypeScript, Vercel Postgres, Stripe, Vercel Blob
- Member signup flow (subscription selection → personal details → payment)
- Admin (content, users, moderators, subscriptions, playback settings)
- Moderation workflow, affiliates, library, facilitator pages

App code lives in **rfts-platform** (this folder). The repo root is **CursorRFTS** (parent), which also has Marketing docs, products.csv, and Cursor agent rules.

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

## Where We Left Off

- **Handoff:** Read this file and **README.md** for env. Run schema with `npm run db:schema` if DB is new or after schema changes.
- **Git:** Pushes from rfts-platform to origin/main work; commit PROJECT_STATUS.md with related work.
- **T-18 on signup:** Implemented. New members are auto-assigned the fallback track (T-18) on registration; when a CGMR is assigned, the schedule uses it instead. No open follow-up for this feature.
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
