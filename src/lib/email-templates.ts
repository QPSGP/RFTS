import { getBaseUrl } from "./email";

/**
 * Transactional templates (HTML + text) sent via Resend from the app:
 * - getForgotPasswordEmailContent — member forgot password
 * - getWelcomeEmailContent — after full signup / onboarding (member + CC to staff)
 * - getSubscriptionActiveEmailContent — Stripe checkout completed (subscription active)
 * - getReportIssueConfirmationContent — member report / tech support acknowledgment
 * - getIssueResolvedEmailContent — admin marked report resolved; notify member
 * - getLgdInterestEmailContent — Life Guidance Discovery Session interest (onboarding or profile)
 * - getTherapistHealerCoachEmailContent — therapist / healer / coach (Build Practice) interest
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function memberDisplayName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean) as string[];
  return parts.join(" ").trim();
}

/**
 * Welcome email after full onboarding signup (Resend + CC to Terry & Richard by default).
 */
export function getWelcomeEmailContent(
  firstName?: string | null,
  lastName?: string | null
): TemplateContent {
  const baseUrl = getBaseUrl();
  const name = memberDisplayName(firstName, lastName);
  const dearLine = name ? `Dear ${escapeHtml(name)},` : "Dear Member,";
  const subject = "Welcome New Member";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
  <p style="margin-bottom: 16px;">${dearLine}</p>
  <p>By becoming a member of <strong>ReachForTheStars.Today</strong>, you have made a valuable investment in your personal development. We would like to acknowledge and congratulate you for making that commitment to yourself!</p>
  <p>We welcome you here and want to support you on your commitment to grow! Our “ReachForTheStars.Today” system is specifically designed to maximize the effectiveness of changing your subconscious programming in alignment with your chosen goals. <strong>The “Key” to your success is repetition</strong> so stick to the program.</p>
  <p>When you log in it opens you to your member <strong>“Console”</strong>. Everything is accessible and explained from within the console. Scroll through your console to quickly familiarize yourself with your options and features.</p>
  <p>If you are having any technical issues go to the menu and click on <strong>“Report an issue”</strong>.</p>

  <h2 style="font-size: 1.05em; margin-top: 28px; margin-bottom: 8px;">Recommendations</h2>
  <ul style="margin: 8px 0; padding-left: 22px;">
    <li>Two Sessions Per night (repetition)</li>
    <li>Comfortable headset with mask (when listening while sleeping)</li>
    <li>Using ReachForTheStars.Today is one of the easiest ways to overcome present challenges and make your goals a reality, all while falling asleep and during sleep!</li>
  </ul>

  <p style="margin-top: 20px;">Have any questions or concerns?<br />
  We’d love to help. Call the Success Center, Inc. office at <strong>(800) GOAL NOW (462-5669)</strong>, internationally: <strong>+1 818-989-2923</strong>, or send an email to <a href="mailto:customerservice@reachforthestars.today">customerservice@reachforthestars.today</a></p>

  <h2 style="font-size: 1.05em; margin-top: 28px; margin-bottom: 8px;">Payment and Cancellation</h2>
  <p>The Platinum Package has a <strong>14-day free trial</strong> period, after which <strong>$39.95 per month</strong> will be charged to the payment card you entered. To make changes to your plan, update your credit card or billing information, and see your payment history please go to your profile in your console.</p>
  <p>You can cancel at any time, being responsible only for the current month you signed up for. Please see the ReachForTheStars.Today Terms and Conditions for details. If you wish to talk to someone directly, feel free to call <strong>(818) 264-9760</strong>.</p>

  <h2 style="font-size: 1.05em; margin-top: 28px; margin-bottom: 8px;">Technical Support</h2>
  <p>For any challenges with the ReachForTheStars.Today website itself, you may submit an issue from the menu bar under <strong>“Report an Issue”</strong> or call tech support at <strong>(520) 302-4471</strong> or text us with your name, a brief description of the issue, and the best way/time for us to get back to you.</p>

  <p style="margin-top: 32px; font-size: 14px; color: #374151;"><strong>Facilitating Goal Manifestation &amp; Self-Actualization Since 1969</strong></p>
  <p style="font-size: 14px; color: #374151;">Hypnosis &amp; Coaching In-Person, by Phone, and on Zoom,</p>
  <p style="font-size: 14px; color: #374151;">USA &amp; Canada: <strong>(800) GOAL NOW (462-5669)</strong> | International: <strong>+1 818-989-2923</strong><br />
  Visit <a href="https://acesuccess.com">AceSuccess.com</a></p>
  <p style="margin-top: 24px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Open your member console</a>
  </p>
  <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;

  const dearPlain = name ? `Dear ${name},` : "Dear Member,";
  const text = `
${dearPlain}

By becoming a member of ReachForTheStars.Today, you have made a valuable investment in your personal development. We would like to acknowledge and congratulate you for making that commitment to yourself!

We welcome you here and want to support you on your commitment to grow! Our "ReachForTheStars.Today" system is specifically designed to maximize the effectiveness of changing your subconscious programming in alignment with your chosen goals. The "Key" to your success is repetition so stick to the program.

When you log in it opens you to your member "Console". Everything is accessible and explained from within the console. Scroll through your console to quickly familiarize yourself with your options and features.

If you are having any technical issues go to the menu and click on "Report an issue".

Recommendations:
- Two Sessions Per night (repetition)
- Comfortable headset with mask (when listening while sleeping)
- Using ReachForTheStars.Today is one of the easiest ways to overcome present challenges and make your goals a reality, all while falling asleep and during sleep!

Have any questions or concerns?
We'd love to help. Call the Success Center, Inc. office at (800) GOAL NOW (462-5669), internationally: +1 818-989-2923, or send an email to customerservice@reachforthestars.today

Payment and Cancellation
The Platinum Package has a 14-day free trial period, after which $39.95 per month will be charged to the payment card you entered. To make changes to your plan, update your credit card or billing information, and see your payment history please go to your profile in your console.

You can cancel at any time, being responsible only for the current month you signed up for. Please see the ReachForTheStars.Today Terms and Conditions for details. If you wish to talk to someone directly, feel free to call (818) 264-9760.

Technical Support
For any challenges with the ReachForTheStars.Today website itself, you may submit an issue from the menu bar under "Report an Issue" or call tech support at (520) 302-4471 or text us with your name, a brief description of the issue, and the best way/time for us to get back to you.

Facilitating Goal Manifestation & Self-Actualization Since 1969

Hypnosis & Coaching In-Person, by Phone, and on Zoom,

USA & Canada:(800) GOAL NOW (462-5669) | International: +1 818-989-2923
Visit AceSuccess.com — https://acesuccess.com

Open your console: ${baseUrl}/play-options

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

export type IssueResolvedEmailOptions = {
  firstName?: string | null;
  reportSubject: string;
  categoryLabel: string;
  /** Admin resolution notes (optional); shown to member when non-empty. */
  resolutionNotes?: string | null;
};

/** Member-facing email when an admin sets their issue report to Resolved. */
export function getIssueResolvedEmailContent(opts: IssueResolvedEmailOptions): TemplateContent {
  const { firstName, reportSubject, categoryLabel, resolutionNotes } = opts;
  const baseUrl = getBaseUrl();
  const subj = "Your report has been resolved — Reach For The Stars";
  const notes = (resolutionNotes || "").trim();
  const notesBlock =
    notes.length > 0
      ? `<p><strong>Message from our team:</strong></p><p style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 8px;">${escapeHtml(notes).replace(/\n/g, "<br />")}</p>`
      : `<p>Our team has marked your report as <strong>resolved</strong>. If anything else comes up, you can submit another report anytime from your member console.</p>`;
  const html = emailWrapper(`
  <p>${firstName?.trim() ? `Hi ${escapeHtml(firstName.trim())},` : "Hi there,"}</p>
  <p>Thank you for reaching out. Your report has been <strong>resolved</strong>.</p>
  <p><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
  <p><strong>Subject you reported:</strong> ${escapeHtml(reportSubject)}</p>
  ${notesBlock}
  <p style="margin-top: 24px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Back to your console</a>
  </p>
`);
  const hiText = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi there,";
  const text = `${hiText}

Thank you for reaching out. Your report has been resolved.

Category: ${categoryLabel}
Subject: ${reportSubject}
${notes.length > 0 ? `\nMessage from our team:\n${notes}\n` : ""}
Back to your console: ${baseUrl}/play-options`;
  return { subject: subj, html, text };
}

/**
 * Follow-up when a member indicates interest in a Life Guidance Discovery Session (Gold / profile checkbox).
 */
export function getLgdInterestEmailContent(firstName?: string | null): TemplateContent {
  const baseUrl = getBaseUrl();
  const subject = "Life Guidance Discovery Session — follow-up";
  const fn = firstName?.trim() ?? "";
  const hi =
    fn.length > 0 ? `<p>Hi ${escapeHtml(fn)},</p>` : `<p>Hi there,</p>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
  ${hi}
  <p>Thank you for letting us know through <a href="${baseUrl}">ReachForTheStars.Today</a> that you are interested in a <strong>Life Guidance Discovery Session</strong>. <strong>Terry Brussel-Rogers</strong> will contact you for more information on this or do feel free to call her at <strong>800-GOAL-NOW (800-462-5669)</strong> to make your goals a reality.</p>

  <p>This session entitles you to the following <strong>Platinum Membership Benefits</strong>: Guided meditations programmed by your hypnotherapist to reinforce your exact priorities in terms of challenge resolution and personal/professional growth desires. Platinum membership also gives you access to our complete library of guided meditations. Finally, you get a <strong>15 minute private consultation</strong> with your hypnotherapist every 90 days to reassess your goals and their ranking which your hypnotherapist will program into ReachForTheStars.Today for your use.</p>

  <h2 style="font-size: 1.05em; margin-top: 26px; margin-bottom: 8px;">Here is what the session itself includes</h2>
  <p>We set your goals in order of priority, based on a very in-depth Client Intake Form that our director has developed since 1969, always updating it. We figure out exactly what steps are necessary to accomplish those goals in terms of Hypnosis Sessions, Books, Recordings, Coaching, whatever it is you need to get from where you are to where you want to be.</p>
  <p><strong>It’s like a road map. You get it in writing.</strong></p>
  <p>Then, through a private hypnosis session based on your individual Road Map, we instill in your subconscious mind the clarity of purpose, the intense desire, the determination, and the absolute confidence in yourself necessary to make your goals a reality.</p>
  <p><strong>It’s a very empowering session.</strong> It takes about 2 and a half hours. The cost is <strong>$397</strong>, the value Unlimited. If you decide to go ahead with anything else at Success Center, we just apply that to your program.</p>

  <h2 style="font-size: 1.05em; margin-top: 26px; margin-bottom: 8px;">How we meet</h2>
  <p>It’s very convenient. We do it by phone, Zoom or in person if you happen to be near one of the hypnotherapists trained in the use of the <strong>Seven Keys to Self-Actualization</strong>. Terry Brussel-Rogers pioneered telephone hypnosis in 1995. It had nothing to do with Covid; we simply found that doing the session at home in your own space was more comfortable and productive for you, the client. Instead of having to drive there and back at an expense of gas money and your valuable time (not to mention effect on our environment), you do it from home and can use the energy of the session for accomplishing things after it or enjoy a relaxed, healing night’s sleep afterward if it is an evening session. Since that is where you are likely to be practicing your self-hypnosis, it also works better to learn it in that environment.</p>

  <h2 style="font-size: 1.05em; margin-top: 26px; margin-bottom: 8px;">Customized Goal Manifestation Recording</h2>
  <p>The Life Guidance Discovery Session is the only way to arrange for the creation of a <strong>Customized Goal Manifestation Recording</strong> which includes the exact suggestions you and your hypnotherapist created together during the consultation and educational portions of that session. That professionally done recording suitable for listening to while going to sleep and during sleep is produced by your hypnotherapist and our audio engineer with as many takes as needed, music added, deepening suggestions and post production to make it exactly right for you. It plays automatically on Reach for the Stars program whether that is the 2nd play every other night at two meditations per night or every 4th play with one meditation per night. It is an integral part of manifesting your goals into reality!</p>
  <p>This costs <strong>$200</strong> at the time of your session, <strong>$250</strong> later. It is a gift if you sign up for more private sessions at the time of your session or decide to purchase an annual membership in Reach for the Stars for <strong>$390</strong>—a $78 savings over the $39 a month price.</p>

  <p style="margin-top: 28px;">
    <a href="${baseUrl}/play-options" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Back to your member console</a>
  </p>
  <p style="margin-top: 20px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;

  const text = `
${greeting(firstName)}

Thank you for letting us know through ReachForTheStars.Today that you are interested in a Life Guidance Discovery Session. Terry Brussel-Rogers will contact you for more information on this or do feel free to call her at 800-GOAL-NOW (800-462-5669) to make your goals a reality.

This session entitles you to the following Platinum Membership Benefits: Guided meditations programmed by your hypnotherapist to reinforce your exact priorities in terms of challenge resolution and personal/professional growth desires. Platinum membership also gives you access to our complete library of guided meditations. Finally, you get a 15 minute private consultation with your hypnotherapist every 90 days to reassess your goals and their ranking which your hypnotherapist will program into ReachForTheStars.Today for your use.

Here is what the session itself includes: we set your goals in order of priority, based on a very in-depth Client Intake Form that our director has developed since 1969, always updating it. We figure out exactly what steps are necessary to accomplish those goals in terms of Hypnosis Sessions, Books, Recordings, Coaching, whatever it is you need to get from where you are to where you want to be.

It's like a road map. You get it in writing.

Then, through a private hypnosis session based on your individual Road Map, we instill in your subconscious mind the clarity of purpose, the intense desire, the determination, and the absolute confidence in yourself necessary to make your goals a reality.

It's a very empowering session. It takes about 2 and a half hours. The cost is $397, the value Unlimited. If you decide to go ahead with anything else at Success Center, we just apply that to your program.

It's very convenient. We do it by phone, Zoom or in person if you happen to be near one of the hypnotherapists trained in the use of the Seven Keys to Self-Actualization. Terry Brussel-Rogers pioneered telephone hypnosis in 1995. It had nothing to do with Covid; we simply found that doing the session at home in your own space was more comfortable and productive for you, the client. Instead of having to drive there and back at an expense of gas money and your valuable time (not to mention effect on our environment), you do it from home and can use the energy of the session for accomplishing things after it or enjoy a relaxed, healing night's sleep afterward if it is an evening session. Since that is where you are likely to be practicing your self-hypnosis, it also works better to learn it in that environment.

The Life Guidance Discovery Session is the only way to arrange for the creation of a Customized Goal Manifestation Recording which includes the exact suggestions you and your hypnotherapist created together during the consultation and educational portions of that session. That professionally done recording suitable for listening to while going to sleep and during sleep is produced by your hypnotherapist and our audio engineer with as many takes as needed, music added, deepening suggestions and post production to make it exactly right for you. It plays automatically on Reach for the Stars program whether that is the 2nd play every other night at two meditations per night or every 4th play with one meditation per night. It is an integral part of manifesting your goals into reality!

This costs $200 at the time of your session, $250 later. It is a gift if you sign up for more private sessions at the time of your session or decide to purchase an annual membership in Reach for the Stars for $390—a $78 savings over the $39 a month price.

Back to your console: ${baseUrl}/play-options

Reach For The Stars
`.trim();

  return { subject, html, text };
}

/**
 * Email when they check "I am or would like to be a therapist, healer, or coach" (Build Practice interest).
 */
export function getTherapistHealerCoachEmailContent(firstName?: string | null): TemplateContent {
  const baseUrl = getBaseUrl();
  const giftsUrl = `${baseUrl}/goals`;
  const subject = "Building your practice — thank you from Reach For The Stars";
  const fn = firstName?.trim() ?? "";
  const hi =
    fn.length > 0 ? `<p>Hi ${escapeHtml(fn)},</p>` : `<p>Hi there,</p>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
  ${hi}
  <p>Thank you for letting us know through <a href="${baseUrl}">ReachForTheStars.Today</a> that you want to learn more about <strong>building your practice</strong>.</p>

  <p>I am <strong>Terry Brussel-Rogers CCHt.</strong>, Director of Success Center Inc. and founder of Reach For the Stars. I will be in touch with you by phone, or feel free to call me at <strong>800-GOAL-NOW (800-462-5669)</strong>.</p>

  <p>I have been doing hypnotherapy, coaching, and healing since 1969, helping others build their practices since 1995. I would like to help you build <strong>YOUR</strong> practice. Please click the link below for your practice building gifts.</p>

  <p style="margin-top: 28px;">
    <a href="${giftsUrl}" style="display: inline-block; padding: 12px 20px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Practice building gifts</a>
  </p>
  <p style="margin-top: 16px; font-size: 14px; color: #6b7280;">From there you can also open your <a href="${baseUrl}/play-options">member console</a> or browse the <a href="${baseUrl}/library">library</a> for Build Practice content.</p>
  <p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">Reach For The Stars</p>
</body>
</html>`;

  const text = `
${greeting(firstName)}

Thank you for letting us know through ReachForTheStars.Today that you want to learn more about building your practice.

I am Terry Brussel-Rogers CCHt. Director of Success Center Inc. and founder of Reach For the Stars. I will be in touch with you by phone, or feel free to call me at 800-GOAL-NOW (800-462-5669).

I have been doing hypnotherapy, coaching, and healing since 1969, helping others build their practices since 1995. I would like to help you build YOUR practice. Please click the link below for your practice building gifts.

${giftsUrl}

Member console: ${baseUrl}/play-options
Library: ${baseUrl}/library

Reach For The Stars
`.trim();

  return { subject, html, text };
}
