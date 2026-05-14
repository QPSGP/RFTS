-- Optional one-time migration: default was 7 main plays; product default is now 14 (≈7 full nights at 2 main plays/night).
-- Run against Vercel Postgres if `playback_settings` still has the old value and you want to match new installs.
UPDATE playback_settings
SET add_new_track_every_nights = 14
WHERE id = 1 AND add_new_track_every_nights = 7;
