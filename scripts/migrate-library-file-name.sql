-- Add file_name to library_items (run once on existing DBs)
-- New installs: schema.sql includes file_name in CREATE TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'library_items' AND column_name = 'file_name') THEN
    ALTER TABLE library_items ADD COLUMN file_name text NOT NULL DEFAULT '';
  END IF;
END $$;
