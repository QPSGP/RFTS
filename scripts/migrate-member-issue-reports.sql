-- Member issue reports queue (admin /admin/member-issues)
-- Safe to run on production if reports email but do not appear in admin.

CREATE TABLE IF NOT EXISTS member_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_email text NOT NULL,
  category text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
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
