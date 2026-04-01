import { getBaseUrl } from "./email";

/**
 * Transactional templates (HTML + text) sent via Resend from the app:
 * - getForgotPasswordEmailContent — member forgot password
 * - getWelcomeEmailContent — after signup / onboarding
 * - getSubscriptionActiveEmailContent — Stripe checkout completed (subscription active)
 * - getReportIssueConfirmationContent — member report / tech support acknowledgment
 * - getLgdInterestEmailContent — Life Guidance checkbox
 * - getTherapistHealerCoachEmailContent — Build Practice / therapist-healer-coach checkbox
 *
 * Staff BCC: set EMAIL_STAFF_BCC (comma-separated) for Terry, Richard, etc. Applied in sendEmail().
 */

export type TemplateContent = { subject: string; html: string; text: string };

function greeting(firstName?: string | null): string {
  return firstName ? `Hi ${firstName},` : "Hi there,";
}

const emailWrapper = (inner: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
${inner}
  <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;

export function getForgotPasswordEmailContent(resetUrl: string, expiryHours: number): TemplateContent {
  const subject = "Reset your Reach For The Stars password";
  const html = emailWrapper(`
  <p>You asked to reset your member password.</p>
  <p style="margin-top: 24px;">
    <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset password</a>
  </p>
  <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">This link expires in ${expiryHours} hour(s). If you didn’t request this, you can ignore this email.</p>
  <p style="font-size: 14px; color: #6b7280;">Questions? Call 800-GOAL-NOW (462-5669) or reply if your mail client allows.</p>
`);
  const text = `Reset your Reach For The Stars password: ${resetUrl}\n\nThis link expires in ${expiryHours} hour(s).\n\nIf you didn't request this, ignore this email.`;
  return { subject, html, text };
}

export function getSubscriptionActiveEmailContent(
  firstName?: string | null,
  tierLabel?: string | null
): TemplateContent {
  const baseUrl = getBaseUrl();
  const tierLine =
    tierLabel && tierLabel.trim()
      ? `<p>Your plan: <strong>${tierLabel}</strong></p>`
      : "";
  const subject = "Your Reach For The Stars membership is active";
  const html = emailWrapper(`
  <p>${greeting(firstName)}</p>
  <p>Thank you — your subscription payment went through and your membership is <strong>active</strong>.</p>
  ${tierLine}
  <p>You can open your member console anytime to manage sessions, goals, and the audio library.</p>
  <p style="margin-top: 24px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to your console</a>
  </p>
  <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">We’re glad you’re here. Questions? 800-GOAL-NOW (462-5669) or customerservice@reachforthestars.today</p>
`);
  const text = `
${greeting(firstName)}

Your subscription is active. Open your console: ${baseUrl}/play-options

Questions? 800-GOAL-NOW (462-5669)
`.trim();
  return { subject, html, text };
}

/**
 * Welcome email after signup: how to use the console and inspiration to use it.
 */
export function getWelcomeEmailContent(firstName?: string | null): TemplateContent {
  const baseUrl = getBaseUrl();
  const subject = "Welcome to Reach For The Stars — here’s how to get started";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${greeting(firstName)}</p>
  <p>Welcome to Reach For The Stars. You’re in the right place to start reprogramming your subconscious with guided audio — tailored to your goals and designed to support you while you sleep.</p>

  <h2 style="font-size: 1.1em; margin-top: 24px;">How to use your member console</h2>
  <ul style="margin: 12px 0; padding-left: 20px;">
    <li><strong>Console (Play Options)</strong> — Your nightly sessions are built here. Choose how many sessions per night and your “session cycle” (how often new tracks are added). This is your control center.</li>
    <li><strong>Goals</strong> — The goals you picked during signup shape which audios are scheduled. You can update them anytime so your sessions stay aligned with what matters to you.</li>
    <li><strong>Library</strong> — Browse and stream the full Success Center library. You can listen to any track on demand in addition to your scheduled nightly lineup.</li>
  </ul>
  <p style="margin-top: 16px;">Bookmark your console and make it part of your routine: a few minutes to check your schedule, then press play when it’s time to rest.</p>

  <h2 style="font-size: 1.1em; margin-top: 24px;">A little inspiration</h2>
  <p>Our system works best when you use it consistently. Listen as you fall asleep; let the recordings do the work. Many members report clearer focus, better sleep, and progress toward their goals within the first weeks. You’ve already taken the first step — now let the nightly sessions support you.</p>

  <p style="margin-top: 24px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to your console</a>
  </p>
  <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">Questions? Reply to this email or call 800-GOAL-NOW (462-5669). We’re here for you.</p>
  <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;
  const text = `
${greeting(firstName)}

Welcome to Reach For The Stars. You're in the right place to start reprogramming your subconscious with guided audio — tailored to your goals and designed to support you while you sleep.

How to use your member console:
- Console (Play Options): Your nightly sessions are built here. Choose how many sessions per night and your session cycle. This is your control center.
- Goals: The goals you picked during signup shape which audios are scheduled. You can update them anytime.
- Library: Browse and stream the full Success Center library and listen to any track on demand.

Bookmark your console and make it part of your routine.

A little inspiration: Our system works best when you use it consistently. Listen as you fall asleep; let the recordings do the work. Many members report clearer focus, better sleep, and progress toward their goals within the first weeks.

Go to your console: ${baseUrl}/play-options

Questions? Reply to this email or call 800-GOAL-NOW (462-5669).

Reach For The Stars
`.trim();
  return { subject, html, text };
}

export type ReportIssueConfirmationOptions = {
  firstName?: string | null;
  subject: string;
  categoryLabel: string;
  /** Form value e.g. support, technical — triggers tech-support style acknowledgment. */
  categoryValue?: string;
};

/**
 * Confirmation email to the member after they submit "Report an issue"
 * (general or tech / support categories).
 */
export function getReportIssueConfirmationContent(
  opts: ReportIssueConfirmationOptions
): TemplateContent {
  const { firstName, subject, categoryLabel, categoryValue } = opts;
  const baseUrl = getBaseUrl();
  const cv = (categoryValue || "").toLowerCase().trim();
  const isTechSupport = cv === "support" || cv === "technical";
  const subj = isTechSupport
    ? "We received your tech support request — Reach For The Stars"
    : "We received your report — Reach For The Stars";
  const lead = isTechSupport
    ? `<p>We’ve received your <strong>tech support</strong> request and our team will review it. For website, playback, or login issues, we’ll follow up as soon as we can — often within one business day.</p>`
    : `<p>We’ve received your report and will look into it.</p>`;
  const html = emailWrapper(`
  <p>${greeting(firstName)}</p>
  ${lead}
  <p><strong>Category:</strong> ${categoryLabel}</p>
  <p><strong>Subject:</strong> ${subject}</p>
  <p style="margin-top: 24px;">Our team will get back to you if we need more information. You can also reach us anytime at 800-GOAL-NOW (462-5669) or <a href="mailto:customerservice@reachforthestars.today">customerservice@reachforthestars.today</a>.</p>
  <p style="margin-top: 24px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Back to your console</a>
  </p>
`);
  const text = `
${greeting(firstName)}

${isTechSupport ? "We've received your tech support request and will review it.\n\n" : "We've received your report and will look into it.\n\n"}Category: ${categoryLabel}
Subject: ${subject}

Our team will get back to you if we need more information. 800-GOAL-NOW (462-5669) or customerservice@reachforthestars.today.

Back to your console: ${baseUrl}/play-options
`.trim();
  return { subject: subj, html, text };
}

/**
 * Email when they check the Life Guidance Discovery Session interest option: explains the process.
 */
export function getLgdInterestEmailContent(firstName?: string | null): TemplateContent {
  const subject = "Your Life Guidance Discovery Session — next steps";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${greeting(firstName)}</p>
  <p>Thank you for your interest in a <strong>Life Guidance Discovery Session</strong>. Here’s how the process works so you know what to expect.</p>

  <h2 style="font-size: 1.1em; margin-top: 24px;">What is a Life Guidance Discovery Session?</h2>
  <p>It’s a private session (in person or by phone/video) designed to clarify where you are now, where you want to go, and how to get there. We then use that insight to shape your experience — including the option of a customized audio designed by you, for you.</p>

  <h2 style="font-size: 1.1em; margin-top: 24px;">What happens next?</h2>
  <ol style="margin: 12px 0; padding-left: 20px;">
    <li><strong>We reach out</strong> — Our team will contact you to schedule your session at a time that works for you.</li>
    <li><strong>Your session</strong> — You’ll work with a trained professional to explore your goals and what you want from the program. There’s no pressure; it’s a conversation focused on you.</li>
    <li><strong>Your customized path</strong> — Based on the session, we can recommend or create content that fits you — including a personalized recording when appropriate.</li>
  </ol>

  <p style="margin-top: 16px;">You can reach us directly to schedule or ask questions:</p>
  <ul style="margin: 8px 0; padding-left: 20px;">
    <li><strong>Phone:</strong> 800-GOAL-NOW (462-5669)</li>
    <li><strong>Email:</strong> <a href="mailto:customerservice@reachforthestars.today">customerservice@reachforthestars.today</a></li>
  </ul>
  <p style="margin-top: 24px;">We look forward to supporting you.</p>
  <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;
  const text = `
${greeting(firstName)}

Thank you for your interest in a Life Guidance Discovery Session. Here's how the process works.

What is a Life Guidance Discovery Session?
It's a private session (in person or by phone/video) designed to clarify where you are now, where you want to go, and how to get there. We then use that insight to shape your experience — including the option of a customized audio designed by you, for you.

What happens next?
1. We reach out — Our team will contact you to schedule your session at a time that works for you.
2. Your session — You'll work with a trained professional to explore your goals and what you want from the program.
3. Your customized path — Based on the session, we can recommend or create content that fits you — including a personalized recording when appropriate.

To schedule or ask questions:
- Phone: 800-GOAL-NOW (462-5669)
- Email: customerservice@reachforthestars.today

We look forward to supporting you.

Reach For The Stars
`.trim();
  return { subject, html, text };
}

/**
 * Email when they check "I am or would like to be a therapist, healer, or coach": response and next steps.
 */
export function getTherapistHealerCoachEmailContent(firstName?: string | null): TemplateContent {
  const baseUrl = getBaseUrl();
  const subject = "Therapist, healer & coach path — Reach For The Stars";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${greeting(firstName)}</p>
  <p>Thank you for letting us know that you <strong>are or would like to be a therapist, healer, or coach</strong>. We’re glad you’re here.</p>

  <h2 style="font-size: 1.1em; margin-top: 24px;">What this means for your membership</h2>
  <p>Your member account now includes access to our <strong>Build Practice</strong> content — audios and resources designed to support practitioners in their own growth and in their work with clients. You’ll see these in your Goals and Library where applicable.</p>

  <h2 style="font-size: 1.1em; margin-top: 24px;">What you can do next</h2>
  <ul style="margin: 12px 0; padding-left: 20px;">
    <li>Use your <strong>Console</strong> and <strong>Goals</strong> to include Build Practice goals so the right sessions are scheduled for you.</li>
    <li>Browse the <strong>Library</strong> and explore the full catalog, including practitioner-focused material.</li>
    <li>If you’re interested in how our system can support your practice or training, we’d love to hear from you.</li>
  </ul>

  <p style="margin-top: 16px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to your console</a>
  </p>
  <p style="margin-top: 24px;">Questions about the practitioner path or Build Practice content? Reply to this email or call 800-GOAL-NOW (462-5669).</p>
  <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;
  const text = `
${greeting(firstName)}

Thank you for letting us know that you are or would like to be a therapist, healer, or coach. We're glad you're here.

What this means for your membership:
Your member account now includes access to our Build Practice content — audios and resources designed to support practitioners. You'll see these in your Goals and Library where applicable.

What you can do next:
- Use your Console and Goals to include Build Practice goals so the right sessions are scheduled.
- Browse the Library and explore practitioner-focused material.
- If you're interested in how our system can support your practice or training, we'd love to hear from you.

Go to your console: ${baseUrl}/play-options

Questions? Reply to this email or call 800-GOAL-NOW (462-5669).

Reach For The Stars
`.trim();
  return { subject, html, text };
}
