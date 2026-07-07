-- Up to 3 image/video attachments on member issue reports (Report an issue form)
ALTER TABLE member_issue_reports
  ADD COLUMN IF NOT EXISTS attachment_urls text[];
