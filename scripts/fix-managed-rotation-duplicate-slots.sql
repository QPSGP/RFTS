-- Run once on production Postgres (Vercel Storage → SQL / Neon console / psql).
-- Fixes: unique violation on member_audio_assignments_pkey with Key (user_email, library_item_id)=(...)
--
-- That error means the PRIMARY KEY is still the LEGACY composite (user_email, library_item_id).
-- Managed rotation requires PRIMARY KEY (id) plus uniqueness on (user_email, assignment_order) only.

-- Optional: inspect current primary key
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'member_audio_assignments'::regclass AND contype = 'p';

-- -----------------------------------------------------------------------------
-- STEP 1: Replace legacy PRIMARY KEY (user_email, library_item_id) with PRIMARY KEY (id)
-- Runs even if column `id` already exists (fixes partial migrations that RETURNed too early).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pk_name text;
  cols text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member_audio_assignments'
  ) THEN
    RETURN;
  END IF;

  -- Use attnum = ANY (conkey): unnest(conkey) breaks some hosted SQL runners (int2vector).
  SELECT c.conname::text,
         array_agg(a.attname ORDER BY a.attnum)
  INTO pk_name, cols
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum > 0 AND NOT a.attisdropped AND a.attnum = ANY (c.conkey)
  WHERE n.nspname = 'public'
    AND t.relname = 'member_audio_assignments'
    AND c.contype = 'p'
  GROUP BY c.conname;

  IF pk_name IS NULL OR cols IS NULL THEN
    RETURN;
  END IF;

  -- Already on id-only PK
  IF cols = ARRAY['id']::text[] THEN
    RETURN;
  END IF;

  -- Legacy composite PK on member + recording (blocks duplicate library_item_id rows)
  IF 'user_email' = ANY (cols)
     AND 'library_item_id' = ANY (cols)
     AND NOT ('assignment_order' = ANY (cols)) THEN

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'member_audio_assignments'
        AND column_name = 'id'
    ) THEN
      ALTER TABLE member_audio_assignments ADD COLUMN id uuid DEFAULT gen_random_uuid();
    END IF;

    UPDATE member_audio_assignments SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE member_audio_assignments ALTER COLUMN id SET NOT NULL;

    EXECUTE format('ALTER TABLE member_audio_assignments DROP CONSTRAINT %I', pk_name);
    ALTER TABLE member_audio_assignments ADD PRIMARY KEY (id);

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'member_audio_assignments_user_email_assignment_order_key'
    ) THEN
      CREATE UNIQUE INDEX member_audio_assignments_user_email_assignment_order_key
        ON member_audio_assignments (user_email, assignment_order);
    END IF;
  END IF;
END $$;

-- Known legacy UNIQUE constraint names (no-op if absent)
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_user_email_library_item_id_key;
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_library_item_id_user_email_key;

-- UNIQUE table constraints: drop if columns include user_email + library_item_id but NOT assignment_order
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      c.conname::text AS cname,
      (
        SELECT array_agg(a.attname ORDER BY a.attnum)
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum > 0 AND NOT a.attisdropped AND a.attnum = ANY (c.conkey)
      ) AS cols
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'member_audio_assignments'
      AND c.contype = 'u'
  LOOP
    IF r.cols IS NOT NULL
       AND 'library_item_id' = ANY (r.cols)
       AND 'user_email' = ANY (r.cols)
       AND NOT ('assignment_order' = ANY (r.cols)) THEN
      EXECUTE format('ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS %I', r.cname);
    END IF;
  END LOOP;
END $$;

-- Standalone UNIQUE indexes (CREATE UNIQUE INDEX ...)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      ic.relname::text AS idx_name,
      array_agg(a.attname ORDER BY a.attnum) AS cols
    FROM pg_index ix
    JOIN pg_class tc ON tc.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = tc.relnamespace
    JOIN pg_class ic ON ic.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum > 0 AND NOT a.attisdropped AND a.attnum = ANY (ix.indkey)
    WHERE n.nspname = 'public'
      AND tc.relname = 'member_audio_assignments'
      AND ix.indisunique
      AND NOT ix.indisprimary
    GROUP BY ic.relname
  LOOP
    IF r.cols IS NOT NULL
       AND 'library_item_id' = ANY (r.cols)
       AND 'user_email' = ANY (r.cols)
       AND NOT ('assignment_order' = ANY (r.cols)) THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', r.idx_name);
    END IF;
  END LOOP;
END $$;
