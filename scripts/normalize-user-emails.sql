-- One-time maintenance: store member emails in lowercase (matches app behavior after deploy).
-- Safe to run multiple times. Run against your Postgres (e.g. Vercel Storage SQL editor).
UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
