-- Optional: run manually if you prefer a one-shot migration without waiting for app traffic.
-- The app also runs this update automatically on getPlaybackSettings() when the value is not 14.
UPDATE playback_settings
SET add_new_track_every_nights = 14
WHERE id = 1
  AND add_new_track_every_nights IS DISTINCT FROM 14;
