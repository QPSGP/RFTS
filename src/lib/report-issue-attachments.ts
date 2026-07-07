export const REPORT_ISSUE_MAX_ATTACHMENTS = 3;
export const REPORT_ISSUE_MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const REPORT_ISSUE_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
] as const;

export const REPORT_ISSUE_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime"
] as const;

export const REPORT_ISSUE_ATTACHMENT_TYPES = [
  ...REPORT_ISSUE_IMAGE_TYPES,
  ...REPORT_ISSUE_VIDEO_TYPES
] as const;

export const REPORT_ISSUE_UPLOAD_PATH_PREFIX = "issue-attachments/";

export const REPORT_ISSUE_ATTACHMENT_ACCEPT = REPORT_ISSUE_ATTACHMENT_TYPES.join(",");

export function isReportIssueImageType(type: string): boolean {
  return (REPORT_ISSUE_IMAGE_TYPES as readonly string[]).includes(type);
}

export function isReportIssueVideoType(type: string): boolean {
  return (REPORT_ISSUE_VIDEO_TYPES as readonly string[]).includes(type);
}

export function isReportIssueAttachmentType(type: string): boolean {
  return isReportIssueImageType(type) || isReportIssueVideoType(type);
}

export function formatReportIssueAttachmentTypes(): string {
  return "PNG, JPEG, WebP, GIF, MP4, WebM, or MOV";
}

export function formatReportIssueMaxAttachmentSizeMb(): number {
  return REPORT_ISSUE_MAX_ATTACHMENT_BYTES / (1024 * 1024);
}

export function mergeReportIssueAttachmentUrls(
  attachmentUrls: string[] | undefined,
  legacyScreenshotUrl: string | undefined
): string[] {
  const merged = [
    ...(attachmentUrls ?? []).map((url) => url.trim()).filter(Boolean),
    ...(legacyScreenshotUrl?.trim() ? [legacyScreenshotUrl.trim()] : [])
  ];
  return [...new Set(merged)].slice(0, REPORT_ISSUE_MAX_ATTACHMENTS);
}

export function resolveReportIssueAttachmentUrls(
  attachmentUrls: string[] | null | undefined,
  screenshotUrl: string | null | undefined
): string[] {
  const fromColumn = (attachmentUrls ?? []).map((url) => url.trim()).filter(Boolean);
  if (fromColumn.length) return fromColumn;
  const legacy = screenshotUrl?.trim();
  return legacy ? [legacy] : [];
}
