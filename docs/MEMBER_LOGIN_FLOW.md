# Member login - how it works (for any agent)

**Restored (Feb 2026):** Member login and play-options were restored to the state at commit **2af5bde** (when they were working): form POST → 302 redirect with Set-Cookie, play-options as a single client page that fetches `/api/user/me`. Rebuild from here if needed.

---

## Current flow (after restore)

1. **Form**  
   `/member/login` uses `UserAuth` with a plain form: `action="/api/user/login" method="POST"`.  
   We do **not** use a server action for login: in Next.js 14, `cookies().set()` then `redirect()` in a server action often does **not** send the Set-Cookie header.

2. **Login API**  
   `POST /api/user/login` (`src/app/api/user/login/route.ts`):
   - Reads `application/x-www-form-urlencoded` body (email, password).
   - Validates with `getUserByEmail()` (Postgres via `POSTGRES_URL` in `.env.local`).
   - On success: returns **200** with **Set-Cookie** via `setUserSessionCookieOnResponse(response, token)` and an HTML body with `<meta http-equiv="refresh" content="1;url=/play-options">`.  
   So the browser gets the session cookie on the 200 response, then after 1s navigates to `/play-options`.

3. **Play-options**  
   `src/app/play-options/page.tsx` is a **server component** that calls `getMemberProfileForSession()` (same cookie as the header).  
   - No session → show “Please log in” / “Go to member login”.  
   - Session → render `PlayOptionsClient` with that profile. No client-side `/api/user/me` fetch.

## How to test

1. `npm run dev`
2. Open http://localhost:3000/member/login
3. Sign in with a member that exists in the DB (same DB as `POSTGRES_URL`).
4. You should see “Signed in. Taking you to Play Options…” then the Play Options console.

Optional: set `LOGIN_TEST_EMAIL` and `LOGIN_TEST_PASSWORD` and run:
`node scripts/test-login-flow.js http://localhost:3000`  
That script POSTs to `/api/user/login` (form body) and then GETs `/api/user/me` with the cookie; it does **not** submit the real form (server action is not used anymore).

## If it still fails

- **Env:** `POSTGRES_URL` and `SESSION_SECRET` in `.env.local` (and on Vercel if deployed).
- **DevTools → Network:** On the login response, confirm `Set-Cookie: rfts_user_session=...`. On the next request (to `/play-options`), confirm `Cookie: rfts_user_session=...`.
- **Header shows “Members Console” but page says “need to sign in”:** The cookie is present for the layout (header) but play-options must also read it in the same request; it uses `getMemberProfileForSession()` in the page server component. If that still happens, layout and page may be running in different contexts - check for middleware or dynamic rendering differences.
