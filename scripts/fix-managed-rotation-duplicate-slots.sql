-- Run once on production Postgres (Vercel Storage → Query / any SQL client).
-- Fixes: "Order save failed ... only one row per recording per member"
-- Managed rotation requires the SAME library_item_id in MULTIPLE rows (different assignment_order).
--
-- Safe: keeps PRIMARY KEY, FOREIGN KEY, and UNIQUE (user_email, assignment_order).

-- Known legacy constraint names (no-op if absent)
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_user_email_library_item_id_key;
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_library_item_id_user_email_key;

-- Any remaining UNIQUE *constraint* that pairs user_email + library_item_id but is NOT the assignment_order rule
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname::text AS cname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'member_audio_assignments'
      AND c.contype = 'u'
  LOOP
    IF r.def ~* 'library_item_id'
       AND r.def ~* 'user_email'
       AND r.def !~* 'assignment_order' THEN
      EXECUTE format('ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS %I', r.cname);
    END IF;
  END LOOP;
END $$;

-- UNIQUE *indexes* (CREATE UNIQUE INDEX ...) are not always exposed as table constraints
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT ic.relname::text AS idx_name, pg_get_indexdef(ix.indexrelid) AS def
    FROM pg_class tc
    JOIN pg_namespace n ON n.oid = tc.relnamespace
    JOIN pg_index ix ON tc.oid = ix.indrelid
    JOIN pg_class ic ON ic.oid = ix.indexrelid
    WHERE n.nspname = 'public'
      AND tc.relname = 'member_audio_assignments'
      AND ix.indisunique
      AND NOT ix.indisprimary
  LOOP
    IF r.def ~* 'library_item_id'
       AND r.def ~* 'user_email'
       AND r.def !~* 'assignment_order' THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', r.idx_name);
    END IF;
  END LOOP;
END $$;
