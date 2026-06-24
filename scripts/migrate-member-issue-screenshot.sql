-- Optional screenshot on member issue reports (Report an issue form)
ALTER TABLE member_issue_reports
  ADD COLUMN IF NOT EXISTS screenshot_url text;
