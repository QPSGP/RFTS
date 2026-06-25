-- Remove hyphens from stored SKU codes and playback track references.
UPDATE library_items
SET sku_code = REPLACE(TRIM(sku_code), '-', '')
WHERE sku_code LIKE '%-%';

UPDATE playback_settings
SET fallback_track_id = REPLACE(TRIM(fallback_track_id), '-', '')
WHERE fallback_track_id LIKE '%-%';

UPDATE playback_settings
SET cgmr_track_id = REPLACE(TRIM(cgmr_track_id), '-', '')
WHERE cgmr_track_id LIKE '%-%';
