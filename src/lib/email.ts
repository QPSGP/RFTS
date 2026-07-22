import { Resend } from "resend";
import { getPublicAppUrl } from "./site-url";
import { shouldSkipWelcomeStaffCc } from "./smoke-test-users";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const defaultFrom =
  process.env.EMAIL_FROM || "Reach For The Stars <onboarding@resend.dev>";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  /** When true, do not append EMAIL_STAFF_BCC recipients (rare; default is staff get BCC on transactional mail). */
  skipStaffBcc?: boolean;
};

/** Optional member context — smoke-test signups do not CC Terry/staff. */
export type WelcomeEmailCcContext = {
  memberEmail?: string;
  firstName?: string | null;
  lastName?: string | null;
  referralSource?: string | null;
};

/**
 * Comma- or semicolon-separated list (e.g. Terry and Richard) for BCC on automated member emails.
 * Addresses already in `to` are not duplicated on BCC.
 */
export function parseStaffBccEmails(): string[] {
  const raw = process.env.EMAIL_STAFF_BCC || "";
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * CC recipients for new-member welcome, Life Guidance follow-up, and therapist/healer/coach follow-up (same list).
 * Override with WELCOME_EMAIL_CC (comma-separated); defaults to Terry and Richard.
 * Returns [] for smoke-test members so only real signups are copied to staff.
 */
export function getWelcomeEmailCcRecipients(context?: WelcomeEmailCcContext): string[] {
  if (context && shouldSkipWelcomeStaffCc(context)) {
    return [];
  }

  const raw = process.env.WELCOME_EMAIL_CC?.trim();
  if (raw) {
    return raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["terry_bg@msn.com", "Richard@richardleeweatherman.com"];
}

/** End of default staff monitoring window for issue-resolved member emails (90 days from rollout). */
const ISSUE_RESOLVED_STAFF_BCC_DEFAULT_UNTIL = "2026-09-16";

const ISSUE_RESOLVED_STAFF_BCC_DEFAULTS = [
  "Richard@richardleeweatherman.com",
  "craigmilorogers@gmail.com"
];

/**
 * BCC staff while monitoring issue-resolved / closed member emails (90-day window).
 * Active until ISSUE_RESOLVED_STAFF_BCC_UNTIL (YYYY-MM-DD) or the default end date.
 * Addresses: ISSUE_RESOLVED_STAFF_BCC if set, else Richard + Craig (Terry's tech contact).
 */
export function getIssueResolvedStaffMonitorBcc(memberEmail: string): string[] {
  const untilRaw =
    process.env.ISSUE_RESOLVED_STAFF_BCC_UNTIL?.trim() || ISSUE_RESOLVED_STAFF_BCC_DEFAULT_UNTIL;
  const end = Date.parse(untilRaw);
  if (Number.isNaN(end) || Date.now() > end) {
    return [];
  }

  const explicit = process.env.ISSUE_RESOLVED_STAFF_BCC?.trim();
  const candidates = explicit
    ? explicit.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : ISSUE_RESOLVED_STAFF_BCC_DEFAULTS;

  const member = memberEmail.trim().toLowerCase();
  return [...new Set(candidates.filter(Boolean))].filter((e) => e.toLowerCase() !== member);
}

function staffBccExcludingRecipients(to: string[]): string[] {
  const recipients = new Set(to.map((e) => e.trim().toLowerCase()));
  return parseStaffBccEmails().filter((e) => !recipients.has(e.trim().toLowerCase()));
}

/**
 * Send an email via Resend. Used for password reset, welcome emails, and other automated mail.
 * Requires RESEND_API_KEY. Optional EMAIL_FROM overrides the sender.
 * Appends EMAIL_STAFF_BCC to BCC unless skipStaffBcc is set (deduped against `to`).
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: "Email not configured (RESEND_API_KEY missing)." };
  }
  const to = Array.isArray(options.to) ? options.to : [options.to];
  if (!to.length || !to[0]) {
    return { ok: false, error: "Missing recipient." };
  }
  const staffBcc = options.skipStaffBcc ? [] : staffBccExcludingRecipients(to);
  const mergedBcc = [...(options.bcc || []), ...staffBcc];
  const uniqueBcc = [...new Set(mergedBcc.map((e) => e.trim()).filter(Boolean))];
  const recipientSet = new Set(to.map((e) => e.trim().toLowerCase()));
  const uniqueCc = [
    ...new Set(
      (options.cc || [])
        .map((e) => e.trim())
        .filter(Boolean)
        .filter((e) => !recipientSet.has(e.toLowerCase()))
    )
  ];
  try {
    const payload = {
      from: options.from || defaultFrom,
      to,
      subject: options.subject,
      ...(options.html && { html: options.html }),
      ...(options.text && { text: options.text }),
      ...(uniqueCc.length ? { cc: uniqueCc } : {}),
      ...(uniqueBcc.length ? { bcc: uniqueBcc } : {})
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Resend SDK union requires template/react; we use html/text.
    const { error } = await resend.emails.send(payload as any);
    if (error) {
      return { ok: false, error: error.message || "Send failed." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
  }
}

/** Base URL for links in emails (e.g. password reset). Set NEXT_PUBLIC_APP_URL or pass request origin. */
export function getBaseUrl(origin?: string | null): string {
  return getPublicAppUrl(origin);
}
