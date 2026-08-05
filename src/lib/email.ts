import { Resend } from "resend";
import { getPublicAppUrl } from "./site-url";
import { shouldSkipWelcomeStaffCc } from "./smoke-test-users";
import { getEmailStaffList } from "./db";

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
  /** When true, do not append staff BCC list (rare; default is staff get BCC on transactional mail). */
  skipStaffBcc?: boolean;
};

/** Optional member context - smoke-test signups do not CC Terry/staff. */
export type WelcomeEmailCcContext = {
  memberEmail?: string;
  firstName?: string | null;
  lastName?: string | null;
  referralSource?: string | null;
};

/** Staff BCC list (admin-editable; falls back to EMAIL_STAFF_BCC / empty). */
export async function getStaffBccEmails(): Promise<string[]> {
  return getEmailStaffList("staff_bcc");
}

/**
 * CC recipients for new-member welcome, Life Guidance follow-up, and therapist/healer/coach follow-up.
 * Admin-editable list; returns [] for smoke-test members.
 */
export async function getWelcomeEmailCcRecipients(
  context?: WelcomeEmailCcContext
): Promise<string[]> {
  if (context && shouldSkipWelcomeStaffCc(context)) {
    return [];
  }
  return getEmailStaffList("welcome_cc");
}

/** Primary inbox(es) for issue reports. */
export async function getReportIssueToEmails(): Promise<string[]> {
  const list = await getEmailStaffList("report_issue_to");
  return list.length ? list : ["Richard@richardleeweatherman.com"];
}

/** End of default staff monitoring window for issue-resolved member emails (90 days from rollout). */
const ISSUE_RESOLVED_STAFF_BCC_DEFAULT_UNTIL = "2026-09-16";

/**
 * BCC staff while monitoring issue-resolved / closed member emails (90-day window).
 * Active until ISSUE_RESOLVED_STAFF_BCC_UNTIL (YYYY-MM-DD) or the default end date.
 * Addresses from admin-editable list (seeded from env/defaults).
 */
export async function getIssueResolvedStaffMonitorBcc(memberEmail: string): Promise<string[]> {
  const untilRaw =
    process.env.ISSUE_RESOLVED_STAFF_BCC_UNTIL?.trim() || ISSUE_RESOLVED_STAFF_BCC_DEFAULT_UNTIL;
  const end = Date.parse(untilRaw);
  if (Number.isNaN(end) || Date.now() > end) {
    return [];
  }

  const candidates = await getEmailStaffList("issue_resolved_bcc");
  const member = memberEmail.trim().toLowerCase();
  return [...new Set(candidates.filter(Boolean))].filter((e) => e.toLowerCase() !== member);
}

async function staffBccExcludingRecipients(to: string[]): Promise<string[]> {
  const recipients = new Set(to.map((e) => e.trim().toLowerCase()));
  const staff = await getStaffBccEmails();
  return staff.filter((e) => !recipients.has(e.trim().toLowerCase()));
}

/**
 * Send an email via Resend. Used for password reset, welcome emails, and other automated mail.
 * Requires RESEND_API_KEY. Optional EMAIL_FROM overrides the sender.
 * Appends staff BCC unless skipStaffBcc is set (deduped against `to`).
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: "Email not configured (RESEND_API_KEY missing)." };
  }
  const to = Array.isArray(options.to) ? options.to : [options.to];
  if (!to.length || !to[0]) {
    return { ok: false, error: "Missing recipient." };
  }
  const staffBcc = options.skipStaffBcc ? [] : await staffBccExcludingRecipients(to);
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
