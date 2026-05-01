-- Fix erroneous goal linkage for SKU T-14 (Memory Excellence).
-- Safe to run once on production Postgres after a backup.
--
-- Problem: T-14 can appear under romance/attract goals in "By goal" and admin views when
-- library_items.interest_ids incorrectly includes those goals, or when interests.audio_id_a/b/c
-- points at T-14 on those goals.
--
-- Before (optional): inspect current tags and slots
--   SELECT id, sku_code, title, interest_ids FROM library_items WHERE TRIM(UPPER(sku_code)) = 'T-14';
--   SELECT id, name, audio_id_a, audio_id_b, audio_id_c FROM interests ORDER BY name;

-- 1) Drop romance/attract-style goal IDs from T-14's interest_ids array only.
UPDATE library_items li
SET interest_ids = COALESCE(
  ARRAY(
    SELECT x
    FROM unnest(COALESCE(li.interest_ids, ARRAY[]::text[])) AS x
    WHERE NOT EXISTS (
      SELECT 1
      FROM interests i
      WHERE i.id = x
        AND (
          i.name ILIKE '%attract love for singles%'
          OR i.name ILIKE '%attract your special someone%'
          OR (
            i.name ILIKE '%attract%'
            AND i.name ILIKE '%love%'
            AND i.name ILIKE '%single%'
          )
        )
    )
  ),
  ARRAY[]::text[]
)
WHERE TRIM(UPPER(li.sku_code)) = 'T-14';

-- 2) Remove T-14 from A/B/C play slots on those same goals (if it was assigned there).
WITH t14 AS (
  SELECT id AS tid
  FROM library_items
  WHERE TRIM(UPPER(sku_code)) = 'T-14'
  LIMIT 1
)
UPDATE interests i
SET
  audio_id_a = CASE WHEN i.audio_id_a = t14.tid THEN NULL ELSE i.audio_id_a END,
  audio_id_b = CASE WHEN i.audio_id_b = t14.tid THEN NULL ELSE i.audio_id_b END,
  audio_id_c = CASE WHEN i.audio_id_c = t14.tid THEN NULL ELSE i.audio_id_c END
FROM t14
WHERE
  (i.audio_id_a = t14.tid OR i.audio_id_b = t14.tid OR i.audio_id_c = t14.tid)
  AND (
    i.name ILIKE '%attract love for singles%'
    OR i.name ILIKE '%attract your special someone%'
    OR (
      i.name ILIKE '%attract%'
      AND i.name ILIKE '%love%'
      AND i.name ILIKE '%single%'
    )
  );

-- After: re-check T-14 row and adjust remaining goals in Admin → Library → Edit if needed.
