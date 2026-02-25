CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  goal_ids text[] DEFAULT ARRAY[]::text[],
  goal_updated_at timestamptz,
  plays_per_night integer NOT NULL DEFAULT 2,
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
  had_lgd_session boolean DEFAULT false,
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
