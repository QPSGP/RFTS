-- One-time: store completed_schedule_nights as main goal audios played (not schedule-night index).
-- 1 audio/night members: unchanged. 2 audio/night members: previous value * 2 (capped at 732).
-- Safe to re-run: only rows with schedule_progress_model <> 1 are updated.

ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS schedule_progress_model smallint NOT NULL DEFAULT 0;

UPDATE member_profiles mp
SET
  completed_schedule_nights = CASE
    WHEN COALESCE(u.plays_per_night, 2) = 1 THEN LEAST(732, COALESCE(mp.completed_schedule_nights, 0))
    ELSE LEAST(732, COALESCE(mp.completed_schedule_nights, 0) * 2)
  END,
  schedule_progress_model = 1,
  updated_at = now()
FROM users u
WHERE u.id = mp.user_id
  AND COALESCE(mp.schedule_progress_model, 0) <> 1;

ALTER TABLE member_profiles ALTER COLUMN schedule_progress_model SET DEFAULT 1;
