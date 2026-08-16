CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  goal_ids text[] DEFAULT ARRAY[]::text[],
  goal_updated_at timestamptz,
  plays_per_night integer NOT NULL DEFAULT 2,
  screen_wake_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  gender text,
  year_born integer,
  contact_number text,
  best_contact_times text,
  time_zone text,
  occupation text,
  income_goal text,
  income_goal_year integer,
  income_goal_relation text,
  is_first_responder boolean DEFAULT false,
  wants_practice_growth boolean DEFAULT false,
  adult_consent boolean DEFAULT false,
  wants_polyamory boolean DEFAULT false,
  /** Interested in more information about a Life Guidance Discovery Session (follow-up email). */
  wants_lgd_info boolean DEFAULT false,
  /** Member already completed a Life Guidance Discovery Session (live or electronic). */
  had_lgd_session boolean DEFAULT false,
  /** Internal: legacy interest→wants_lgd_info migration applied. */
  lgd_interest_migrated boolean DEFAULT false,
  referral_source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  tier text NOT NULL DEFAULT 'platinum',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interests (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_adult boolean DEFAULT false,
  categories text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  sku_code text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  categories text[] DEFAULT ARRAY[]::text[],
  cover_url text NOT NULL DEFAULT '',
  audio_url text NOT NULL DEFAULT '',
  interest_ids text[] DEFAULT ARRAY[]::text[],
  allowed_user_emails text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  order_index integer NOT NULL DEFAULT 1,
  is_adult boolean DEFAULT false
);

-- Enforce unique SKU (multiple empty SKU allowed; non-empty must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS library_items_sku_code_unique
  ON library_items (TRIM(sku_code)) WHERE TRIM(sku_code) <> '';

CREATE TABLE IF NOT EXISTS affiliate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  payout_address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  creator text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  notes text
);

CREATE TABLE IF NOT EXISTS moderator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  focus_areas text NOT NULL,
  experience text NOT NULL,
  links text,
  phone text,
  website text,
  social_links text,
  photo_url text,
  profile_slug text,
  submitted_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  assigned_user_emails text[] DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_id text NOT NULL DEFAULT '',
  trial_days integer NOT NULL DEFAULT 0,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS playback_settings (
  id integer PRIMARY KEY DEFAULT 1,
  plays_per_recording integer NOT NULL,
  nightly_gap_hours numeric NOT NULL,
  add_new_track_every_nights integer NOT NULL,
  initial_tracks integer NOT NULL,
  cgmr_track_id text NOT NULL DEFAULT '',
  fallback_track_id text NOT NULL DEFAULT ''
);

-- One row per session use (member started a session on the console)
CREATE TABLE IF NOT EXISTS member_session_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_session_usage_user_used
  ON member_session_usage (user_id, used_at);

-- Staff (admin + facilitator) activity: logins and actions
CREATE TABLE IF NOT EXISTS staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('admin', 'moderator')),
  actor_email text NOT NULL,
  actor_name text,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_activity_log_created_at
  ON staff_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_log_actor_email
  ON staff_activity_log (actor_email, created_at DESC);

-- Member activity: logins and console actions (for admin behavior insights)
CREATE TABLE IF NOT EXISTS member_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_activity_log_created_at
  ON member_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS member_activity_log_user_id
  ON member_activity_log (user_id, created_at DESC);

-- Member "report an issue" submissions (admin queue + resolution notes)
CREATE TABLE IF NOT EXISTS member_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  member_email text NOT NULL,
  category text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  screenshot_url text,
  attachment_urls text[],
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_issue_reports_status_check CHECK (
    status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])
  )
);

CREATE INDEX IF NOT EXISTS member_issue_reports_created_at
  ON member_issue_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS member_issue_reports_status_created
  ON member_issue_reports (status, created_at DESC);

-- Password reset tokens for member self-service (forgot password)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at
  ON password_reset_tokens (expires_at);

-- Migration: admin notes on member profiles (safe to run on existing DBs)
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS notes text;

-- Migration: schedule start date so "tonight" advances each day (safe to run on existing DBs)
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS schedule_started_at date;

-- Migration: full birth date (day/month/year) for calendar picker; age still derived from year (safe to run on existing DBs)
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- Migration: main goal audios completed (play-based progression; safe on existing DBs)
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS completed_schedule_nights integer NOT NULL DEFAULT 0;
-- 0 = legacy schedule-night index; 1 = main audios played (see scripts/migrate-schedule-progress-main-audios.sql)
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS schedule_progress_model smallint NOT NULL DEFAULT 0;

-- Member audio assignments with order (for managed members).
-- Same library_item_id may repeat up to admin UI limits (multiple rotation slots).
CREATE TABLE IF NOT EXISTS member_audio_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  library_item_id uuid NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  assignment_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_email, assignment_order)
);
CREATE INDEX IF NOT EXISTS member_audio_assignments_user_email
  ON member_audio_assignments (user_email, assignment_order);

-- Upgrade legacy table that used PRIMARY KEY (user_email, library_item_id).
-- Do not skip when column id exists: partial installs may have added id but left the composite PK (member_audio_assignments_pkey).
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

  IF pk_name IS NULL OR cols IS NULL OR cols = ARRAY['id']::text[] THEN
    RETURN;
  END IF;

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

-- Legacy installs may still forbid the same library_item_id twice per member (old composite PK).
-- Managed rotation requires multiple slots per recording; safe no-op if constraint names differ.
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_user_email_library_item_id_key;
ALTER TABLE member_audio_assignments DROP CONSTRAINT IF EXISTS member_audio_assignments_library_item_id_user_email_key;


-- Dynamic cleanup: legacy unique on (user_email, library_item_id) via pg_catalog columns (not regex on defs).
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

-- Admin display profile (optional; safe on existing DBs)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_name text;

-- Member affiliate codes + referral attribution
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_affiliate_code text;
CREATE UNIQUE INDEX IF NOT EXISTS users_affiliate_code_unique
  ON users (affiliate_code) WHERE affiliate_code IS NOT NULL;

ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_applications_affiliate_code_unique
  ON affiliate_applications (affiliate_code) WHERE affiliate_code IS NOT NULL;

-- Affiliate payout methods (crypto, PayPal, Venmo, Zelle, bank/ACH contact)
ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS payout_method text;
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS affiliate_payout_method text;
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS affiliate_payout_detail text;

-- Affiliate commission ledger (25% of referred subscription payments)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text NOT NULL,
  affiliate_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_event_id text,
  gross_amount_cents integer NOT NULL,
  commission_amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  payout_notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_code_status_idx
  ON affiliate_commissions (affiliate_code, status);
CREATE INDEX IF NOT EXISTS affiliate_commissions_referred_user_id_idx
  ON affiliate_commissions (referred_user_id);

-- Stripe Connect (Express) for automated affiliate payouts
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_connect_account_id_unique
  ON users (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS screen_wake_enabled boolean NOT NULL DEFAULT false;

-- Facilitator-owned library tracks (private to assigned members until admin promotes)
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS moderator_id uuid REFERENCES moderators(id) ON DELETE SET NULL;
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS in_general_catalog boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS library_items_moderator_id_idx ON library_items (moderator_id)
  WHERE moderator_id IS NOT NULL;

-- Marketing outreach tracker / lightweight CRM: partner orgs, contacts, activity
CREATE TABLE IF NOT EXISTS marketing_outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization text NOT NULL,
  target_type text NOT NULL DEFAULT 'organization',
  category text,
  persona text,
  entry_path text,
  contact text,
  ref_code text,
  status text NOT NULL DEFAULT 'prospect',
  notes text,
  interest text,
  audience_size text,
  decision_timeline text,
  follow_up_at timestamptz,
  do_not_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketing_outreach_targets
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'organization';
CREATE INDEX IF NOT EXISTS marketing_outreach_targets_status_idx
  ON marketing_outreach_targets (status);
CREATE INDEX IF NOT EXISTS marketing_outreach_targets_follow_up_idx
  ON marketing_outreach_targets (follow_up_at)
  WHERE follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_outreach_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES marketing_outreach_targets(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  first_name text,
  last_name text,
  email text,
  phone text,
  phone_mobile text,
  role_title text,
  preferred_times text,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  x_url text,
  website_url text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS phone_mobile text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS x_url text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS notes text;
CREATE INDEX IF NOT EXISTS marketing_outreach_contacts_target_idx
  ON marketing_outreach_contacts (target_id);

CREATE TABLE IF NOT EXISTS marketing_outreach_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES marketing_outreach_targets(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES marketing_outreach_contacts(id) ON DELETE SET NULL,
  kind text NOT NULL,
  subject text,
  body_preview text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_outreach_activities_target_idx
  ON marketing_outreach_activities (target_id, created_at DESC);

-- Admin-editable staff / transactional email recipient lists
CREATE TABLE IF NOT EXISTS email_staff_lists (
  list_key text PRIMARY KEY,
  emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Outreach email templates (member/partner messages admins edit for campaigns)
CREATE TABLE IF NOT EXISTS outreach_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outreach_email_templates_purpose_idx
  ON outreach_email_templates (purpose);

-- Electronic Life Guidance Discovery intakes (see docs/LGD_ELECTRONIC_INTAKE.md)
CREATE TABLE IF NOT EXISTS lgd_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facilitator_id uuid REFERENCES moderators(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  script_draft jsonb,
  script_draft_text text,
  voice_id text,
  frequency_bed_id text,
  price_cents integer,
  paid_at timestamptz,
  stripe_checkout_session_id text,
  own_voice_audio_url text,
  library_item_id uuid,
  produced_audio_url text,
  member_edit_authorized_at timestamptz,
  member_edit_authorized_by text,
  edit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  approved_at timestamptz
);
CREATE INDEX IF NOT EXISTS lgd_intakes_user_id_idx ON lgd_intakes (user_id);
CREATE INDEX IF NOT EXISTS lgd_intakes_status_idx ON lgd_intakes (status);

CREATE TABLE IF NOT EXISTS facilitator_lgd_settings (
  moderator_id uuid PRIMARY KEY REFERENCES moderators(id) ON DELETE CASCADE,
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event lead cards (Expo / QR) - also created at runtime by ensureEventLeadsTable
CREATE TABLE IF NOT EXISTS marketing_event_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  event_name text NOT NULL,
  event_dates text,
  event_key text,
  first_name text,
  last_name text,
  full_name text,
  email text,
  phone_mobile text,
  sms_ok boolean NOT NULL DEFAULT false,
  city text,
  state text,
  zip text,
  country text,
  persona text,
  category text,
  interest text,
  entry_path text,
  captured_by text,
  notes text,
  source_scan_path text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  outreach_target_id uuid,
  auto_reply_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_event_leads_event_key_idx
  ON marketing_event_leads (event_key);
CREATE INDEX IF NOT EXISTS marketing_event_leads_email_idx
  ON marketing_event_leads (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS marketing_event_leads_email_event_uidx
  ON marketing_event_leads (lower(email), event_key)
  WHERE email IS NOT NULL AND event_key IS NOT NULL;
