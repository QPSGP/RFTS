-- Add A/B/C audio slot columns to interests (run once on existing DBs)
-- New installs: schema.sql has been updated to include these
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interests' AND column_name = 'audio_id_a') THEN
    ALTER TABLE interests ADD COLUMN audio_id_a uuid REFERENCES library_items(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interests' AND column_name = 'audio_id_b') THEN
    ALTER TABLE interests ADD COLUMN audio_id_b uuid REFERENCES library_items(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interests' AND column_name = 'audio_id_c') THEN
    ALTER TABLE interests ADD COLUMN audio_id_c uuid REFERENCES library_items(id) ON DELETE SET NULL;
  END IF;
END $$;
