import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const defaultFrom =
  process.env.EMAIL_FROM || "Reach For The Stars <onboarding@resend.dev>";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

/**
 * Send an email via Resend. Used for password reset, welcome emails, and other automated mail.
 * Requires RESEND_API_KEY. Optional EMAIL_FROM overrides the sender.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: "Email not configured (RESEND_API_KEY missing)." };
  }
  const to = Array.isArray(options.to) ? options.to : [options.to];
  if (!to.length || !to[0]) {
    return { ok: false, error: "Missing recipient." };
  }
  try {
    const { error } = await resend.emails.send({
      from: options.from || defaultFrom,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });
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
  if (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (origin) {
    return origin.replace(/\/$/, "");
  }
  return "https://reachforthestars.today";
}
