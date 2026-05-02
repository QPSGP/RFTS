-- Run once on production Postgres (Vercel Storage → SQL / Neon console / psql).
-- Fixes: "Order save failed ... only one row per recording per member"
-- Managed rotation needs multiple rows with the same library_item_id (different assignment_order).
--
-- UI note: new rows can appear in the admin list before you click Save — that is local state only.
--          Persisting still requires Save Personalized Audios + a DB that allows duplicate library_item_id per member.

-- Optional: inspect current rules (run alone, read output, then run the rest)
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'member_audio_assignments'::regclass;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'member_audio_assignments';

-- Known legacy constraint names (no-op if absent)
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_user_email_library_item_id_key;
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_library_item_id_user_email_key;

-- UNIQUE table constraints: drop if columns include user_email + library_item_id but NOT assignment_order
-- (Uses pg_catalog so quoted identifiers / formatting in pg_get_constraintdef cannot hide the rule.)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      c.conname::text AS cname,
      (
        SELECT array_agg(a.attname ORDER BY u.ord)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum AND a.attnum > 0
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
       AND NOT 'assignment_order' = ANY (r.cols) THEN
      EXECUTE format('ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS %I', r.cname);
    END IF;
  END LOOP;
END $$;

-- Standalone UNIQUE indexes (CREATE UNIQUE INDEX ...): same column logic
-- Uses attnum = ANY(indkey) so we do not rely on int2vector → array casts.
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
       AND NOT 'assignment_order' = ANY (r.cols) THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', r.idx_name);
    END IF;
  END LOOP;
END $$;
