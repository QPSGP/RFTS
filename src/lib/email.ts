import { Resend } from "resend";
import { getPublicAppUrl } from "./site-url";

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
 */
export function getWelcomeEmailCcRecipients(): string[] {
  const raw = process.env.WELCOME_EMAIL_CC?.trim();
  if (raw) {
    return raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["terry_bg@msn.com", "Richard@richardleeweatherman.com"];
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
