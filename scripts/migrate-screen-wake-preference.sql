-- Remember screen wake opt-in on the member account (survives login / browser storage clears)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS screen_wake_enabled boolean NOT NULL DEFAULT false;
