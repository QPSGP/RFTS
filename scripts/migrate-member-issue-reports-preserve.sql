-- Keep issue reports when a member account is deleted (reports remain in admin queue).
-- Safe to run repeatedly.

ALTER TABLE member_issue_reports
  ADD COLUMN IF NOT EXISTS screenshot_url text;

ALTER TABLE member_issue_reports
  DROP CONSTRAINT IF EXISTS member_issue_reports_user_id_fkey;

ALTER TABLE member_issue_reports
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE member_issue_reports
  ADD CONSTRAINT member_issue_reports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
