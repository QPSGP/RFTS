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

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  tier text NOT NULL DEFAULT 'bronze',
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
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  cover_url text NOT NULL DEFAULT '',
  audio_url text NOT NULL DEFAULT '',
  interest_ids text[] DEFAULT ARRAY[]::text[],
  allowed_user_emails text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  order_index integer NOT NULL DEFAULT 1,
  is_adult boolean DEFAULT false
);

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
  email text NOT NULL,
  focus_areas text NOT NULL,
  experience text NOT NULL,
  links text,
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
