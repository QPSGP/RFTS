import { getBaseUrl } from "./email";

/**
 * Transactional templates (HTML + text) sent via Resend from the app:
 * - getForgotPasswordEmailContent — member forgot password
 * - getWelcomeEmailContent — after full signup / onboarding (member + CC to staff)
 * - getSubscriptionActiveEmailContent — Stripe checkout completed (subscription active)
 * - getReportIssueConfirmationContent — member report / tech support acknowledgment
 * - getIssueResolvedEmailContent — admin marked report resolved; notify member
 * - getLgdInterestEmailContent — Life Guidance Discovery Session interest (onboarding or profile)
 * - getLgdIntakeSubmittedFacilitatorEmailContent — member submitted electronic LGD intake
 * - getTherapistHealerCoachEmailContent — therapist / healer / coach (Build Practice) interest
 * - getAffiliateThresholdReachedEmailContent — affiliate pending balance reached payout minimum
 * - getAffiliatePayoutSentEmailContent — Stripe Connect affiliate commission payout sent
 *
 * Staff BCC: set EMAIL_STAFF_BCC (comma-separated) for Terry, Richard, etc. Applied in sendEmail().
 */

export type TemplateContent = { subject: string; html: string; text: string };

function greeting(firstName?: string | null): string {
  return firstName ? `Hi ${firstName},` : "Hi there,";
}

/** Shared font stack — avoid system-ui (Gmail often ignores body font). */
const EMAIL_FONT = "Arial, Helvetica, sans-serif";
const EMAIL_TEXT =
  `margin:0 0 16px;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:#1f2937;`;
const EMAIL_H2 =
  `margin:28px 0 8px;font-family:${EMAIL_FONT};font-size:18px;line-height:1.35;font-weight:bold;color:#111827;`;
const EMAIL_MUTED =
  `margin:0 0 16px;font-family:${EMAIL_FONT};font-size:14px;line-height:1.6;color:#6b7280;`;
const EMAIL_FOOTER =
  `margin:16px 0 0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.5;color:#9ca3af;`;

/**
 * Gmail-safe wrapper: nested tables + fully inlined styles.
 * Gmail strips/ignores many `body` rules (max-width, margin:auto, system fonts), which is why
 * the same HTML can look different in Outlook/Apple Mail vs Gmail.
 */
const emailWrapper = (inner: string) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reach For The Stars</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    table, td, div, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    Reach For The Stars
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f3f4f6;width:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!--[if mso]>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td>
        <![endif]-->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:600px;background-color:#ffffff;">
          <tr>
            <td style="padding:28px 24px;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:#1f2937;">
${inner}
              <p style="${EMAIL_FOOTER}">Reach For The Stars</p>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

/** Bulletproof CTA — table + bgcolor so Gmail keeps the button look. */
function emailCtaButton(href: string, label: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:24px 0;">
    <tr>
      <td align="center" bgcolor="#0f766e" style="border-radius:8px;background-color:#0f766e;">
        <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${EMAIL_FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function p(html: string, style = EMAIL_TEXT): string {
  return `<p style="${style}">${html}</p>`;
}

function h2(text: string): string {
  return `<h2 style="${EMAIL_H2}">${text}</h2>`;
}

function notesBox(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 16px;">
  <tr>
    <td style="padding:12px;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:#1f2937;background-color:#f9fafb;border:1px solid #e5e7eb;">
${html}
    </td>
  </tr>
</table>`;
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

export function getForgotPasswordEmailContent(resetUrl: string, expiryHours: number): TemplateContent {
  const subject = "Reset your Reach For The Stars password";
  const html = emailWrapper(`
  ${p("You asked to reset your member password.")}
  ${emailCtaButton(resetUrl, "Reset password")}
  ${p(`This link expires in ${expiryHours} hour(s). If you didn't request this, you can ignore this email.`, EMAIL_MUTED)}
  ${p("Questions? Call 800-GOAL-NOW (462-5669) or reply if your mail client allows.", EMAIL_MUTED)}
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
      ? p(`Your plan: <strong>${escapeHtml(tierLabel)}</strong>`)
      : "";
  const subject = "Your Reach For The Stars membership is active";
  const html = emailWrapper(`
  ${p(greeting(firstName))}
  ${p("Thank you — your subscription payment went through and your membership is <strong>active</strong>.")}
  ${tierLine}
  ${p("You can open your member console anytime to manage sessions, goals, and the audio library.")}
  ${emailCtaButton(`${baseUrl}/play-options`, "Go to your console")}
  ${p("We're glad you're here. Questions? 800-GOAL-NOW (462-5669) or customerservice@reachforthestars.today", EMAIL_MUTED)}
`);
  const text = `
${greeting(firstName)}

Your subscription is active. Open your console: ${baseUrl}/play-options

Questions? 800-GOAL-NOW (462-5669)
`.trim();
  return { subject, html, text };
}

/** Platinum Managed benefits paragraph in the welcome email (HTML + plain text). */
export const WELCOME_EMAIL_PLATINUM_MANAGED_COPY =
  'The package has a 30-day free trial period and includes: Unlimited Access to All Recordings in the Success Center Library. A 15-Minute Private Consultation every 90 days to discuss "Goal Changing & Progress Evaluation" with a Success Center Associate ($285 Value). 12-month commitment includes two free months and a free otherwise required Customized Goal Manifestation Recording ($200 value) which will play every 4th play. Call us for details.';

export function welcomeEmailHasUpdatedPlatinumCopy(content: Pick<TemplateContent, "html" | "text">): boolean {
  return (
    content.text.includes(WELCOME_EMAIL_PLATINUM_MANAGED_COPY) &&
    content.text.includes("Customized Goal Manifestation Recording")
  );
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

  const brandMuted =
    `margin:0 0 16px;font-family:${EMAIL_FONT};font-size:14px;line-height:1.6;color:#374151;`;
  const html = emailWrapper(`
  ${p(dearLine)}
  ${p("By becoming a member of <strong>ReachForTheStars.Today</strong>, you have made a valuable investment in your personal development. We would like to acknowledge and congratulate you for making that commitment to yourself!")}
  ${p('We welcome you here and want to support you on your commitment to grow! Our "ReachForTheStars.Today" system is specifically designed to maximize the effectiveness of changing your subconscious programming in alignment with your chosen goals. <strong>The "Key" to your success is repetition</strong> so stick to the program.')}
  ${p('When you log in it opens you to your member <strong>"Console"</strong>. Everything is accessible and explained from within the console. Scroll through your console to quickly familiarize yourself with your options and features.')}
  ${p('If you are having any technical issues go to the menu and click on <strong>"Report an issue"</strong>.')}
  ${h2("Recommendations but not required.")}
  ${p("Two Audios Per night (repetition)")}
  ${p("Comfortable headset with mask (when listening while sleeping)")}
  ${p("Using ReachForTheStars.Today is one of the easiest ways to overcome present challenges and make your goals a reality, all while falling asleep and during sleep!")}
  ${p(`Have any questions or concerns?<br />
  We'd love to help. Call the Success Center, Inc. office at <strong>(800) GOAL NOW (462-5669)</strong>, internationally: <strong>+1 818-989-2923</strong>, or send an email to <a href="mailto:customerservice@reachforthestars.today" style="color:#0f766e;">customerservice@reachforthestars.today</a>`)}
  ${h2("Payment and Cancellation")}
  ${p("<strong>Gold Member membership:</strong> The Gold Member package has a <strong>14-day free trial</strong> period, after which <strong>$19.95 per month</strong> will be charged to the payment card you entered. Gold membership includes tailored recordings scheduled from your goals, access to the Success Center library, and a one-time 15-minute Goal Changing &amp; Progress Evaluation consultation after 90 days with a Success Center hypnotherapist or coach.")}
  ${p('<strong>Platinum Managed membership:</strong> The package has a <strong>30-day free trial</strong> period and includes: Unlimited Access to All Recordings in the Success Center Library. A 15-Minute Private Consultation every 90 days to discuss "Goal Changing &amp; Progress Evaluation" with a Success Center Associate ($285 Value). 12-month commitment includes two free months and a free otherwise required Customized Goal Manifestation Recording ($200 value) which will play every 4th play. Call us for details.')}
  ${p("To upgrade or cancel your membership, update your credit card or billing information, and see your payment history please go to your profile in your console.")}
  ${p("You can cancel at any time from your console, being responsible only for the current month you signed up for. Please see the ReachForTheStars.Today Terms and Conditions for details.")}
  ${h2("Technical Support")}
  ${p('For any challenges with the ReachForTheStars.Today website itself, you may submit an issue from the menu bar under <strong>"Report an Issue"</strong> or text tech support at <strong>(818) 264-9760</strong> with your name, a brief description of the issue, and the best way/time for us to get back to you.')}
  ${p("<strong>Facilitating Goal Manifestation &amp; Self-Actualization Since 1969</strong>", brandMuted)}
  ${p("Hypnosis &amp; Coaching In-Person, by Phone, and on Zoom,", brandMuted)}
  ${p(`USA &amp; Canada: <strong>(800) GOAL NOW (462-5669)</strong> | International: <strong>+1 818-989-2923</strong><br />
  Visit <a href="https://acesuccess.com" style="color:#0f766e;">AceSuccess.com</a>`, brandMuted)}
  ${emailCtaButton(`${baseUrl}/play-options`, "Open your member console")}
`);

  const dearPlain = name ? `Dear ${name},` : "Dear Member,";
  const text = `
${dearPlain}

By becoming a member of ReachForTheStars.Today, you have made a valuable investment in your personal development. We would like to acknowledge and congratulate you for making that commitment to yourself!

We welcome you here and want to support you on your commitment to grow! Our "ReachForTheStars.Today" system is specifically designed to maximize the effectiveness of changing your subconscious programming in alignment with your chosen goals. The "Key" to your success is repetition so stick to the program.

When you log in it opens you to your member "Console". Everything is accessible and explained from within the console. Scroll through your console to quickly familiarize yourself with your options and features.

If you are having any technical issues go to the menu and click on "Report an issue".

Recommendations but not required.
Two Audios Per night (repetition)
Comfortable headset with mask (when listening while sleeping)
Using ReachForTheStars.Today is one of the easiest ways to overcome present challenges and make your goals a reality, all while falling asleep and during sleep!

Have any questions or concerns?
We'd love to help. Call the Success Center, Inc. office at (800) GOAL NOW (462-5669), internationally: +1 818-989-2923, or send an email to customerservice@reachforthestars.today

Payment and Cancellation
Gold Member membership: The Gold Member package has a 14-day free trial period, after which $19.95 per month will be charged to the payment card you entered. Gold membership includes tailored recordings scheduled from your goals, access to the Success Center library, and a one-time 15-minute Goal Changing & Progress Evaluation consultation after 90 days with a Success Center hypnotherapist or coach.

Platinum Managed membership: ${WELCOME_EMAIL_PLATINUM_MANAGED_COPY}

To upgrade or cancel your membership, update your credit card or billing information, and see your payment history please go to your profile in your console.

You can cancel at any time from your console, being responsible only for the current month you signed up for. Please see the ReachForTheStars.Today Terms and Conditions for details.

Technical Support
For any challenges with the ReachForTheStars.Today website itself, you may submit an issue from the menu bar under "Report an Issue" or text tech support at (818) 264-9760 with your name, a brief description of the issue, and the best way/time for us to get back to you.

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
    ? p("We've received your <strong>tech support</strong> request and our team will review it. For website, playback, or login issues, we'll follow up as soon as we can — often within one business day.")
    : p("We've received your report and will look into it.");
  const html = emailWrapper(`
  ${p(greeting(firstName))}
  ${lead}
  ${p(`<strong>Category:</strong> ${escapeHtml(categoryLabel)}`)}
  ${p(`<strong>Subject:</strong> ${escapeHtml(subject)}`)}
  ${p(`Our team will get back to you if we need more information. You can also reach us anytime at 800-GOAL-NOW (462-5669) or <a href="mailto:customerservice@reachforthestars.today" style="color:#0f766e;">customerservice@reachforthestars.today</a>.`)}
  ${emailCtaButton(`${baseUrl}/play-options`, "Back to your console")}
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
  /** Default resolved; closed uses the same layout with closed wording. */
  outcome?: "resolved" | "closed";
};

/** Member-facing email when an admin sets their issue report to Resolved or Closed. */
export function getIssueResolvedEmailContent(opts: IssueResolvedEmailOptions): TemplateContent {
  const { firstName, reportSubject, categoryLabel, resolutionNotes } = opts;
  const outcome = opts.outcome ?? "resolved";
  const baseUrl = getBaseUrl();
  const subj =
    outcome === "closed"
      ? "Your report has been closed — Reach For The Stars"
      : "Your report has been resolved — Reach For The Stars";
  const notes = (resolutionNotes || "").trim();
  const emptyLead =
    outcome === "closed"
      ? p("Our team has marked your report as <strong>closed</strong>. If anything else comes up, you can submit another report anytime from your member console.")
      : p("Our team has marked your report as <strong>resolved</strong>. If anything else comes up, you can submit another report anytime from your member console.");
  const notesBlock =
    notes.length > 0
      ? `${p("<strong>Message from our team:</strong>")}${notesBox(escapeHtml(notes).replace(/\n/g, "<br />"))}`
      : emptyLead;
  const statusWord = outcome === "closed" ? "closed" : "resolved";
  const html = emailWrapper(`
  ${p(firstName?.trim() ? `Hi ${escapeHtml(firstName.trim())},` : "Hi there,")}
  ${p(`Thank you for reaching out. Your report has been <strong>${statusWord}</strong>.`)}
  ${p(`<strong>Category:</strong> ${escapeHtml(categoryLabel)}`)}
  ${p(`<strong>Subject you reported:</strong> ${escapeHtml(reportSubject)}`)}
  ${notesBlock}
  ${emailCtaButton(`${baseUrl}/play-options`, "Back to your console")}
`);
  const hiText = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi there,";
  const text = `${hiText}

Thank you for reaching out. Your report has been ${statusWord}.

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
  const hi = p(fn.length > 0 ? `Hi ${escapeHtml(fn)},` : "Hi there,");

  const html = emailWrapper(`
  ${hi}
  ${p(`Thank you for letting us know through <a href="${baseUrl}" style="color:#0f766e;">ReachForTheStars.Today</a> that you are interested in a <strong>Life Guidance Discovery Session</strong>. <strong>Terry Brussel-Rogers</strong> will contact you for more information on this or do feel free to call her at <strong>800-GOAL-NOW (800-462-5669)</strong> to make your goals a reality.`)}
  ${p("This session entitles you to the following <strong>Platinum Membership Benefits</strong>: Guided meditations programmed by your hypnotherapist to reinforce your exact priorities in terms of challenge resolution and personal/professional growth desires. Platinum membership also gives you access to our complete library of guided meditations. Finally, you get a <strong>15 minute private consultation</strong> with your hypnotherapist every 90 days to reassess your goals and their ranking which your hypnotherapist will program into ReachForTheStars.Today for your use.")}
  ${h2("Here is what the session itself includes")}
  ${p("We set your goals in order of priority, based on a very in-depth Client Intake Form that our director has developed since 1969, always updating it. We figure out exactly what steps are necessary to accomplish those goals in terms of Hypnosis Sessions, Books, Recordings, Coaching, whatever it is you need to get from where you are to where you want to be.")}
  ${p("<strong>It's like a road map. You get it in writing.</strong>")}
  ${p("Then, through a private hypnosis session based on your individual Road Map, we instill in your subconscious mind the clarity of purpose, the intense desire, the determination, and the absolute confidence in yourself necessary to make your goals a reality.")}
  ${p("<strong>It's a very empowering session.</strong> It takes about 2 and a half hours. The cost is <strong>$397</strong>, the value Unlimited. If you decide to go ahead with anything else at Success Center, we just apply that to your program.")}
  ${h2("How we meet")}
  ${p("It's very convenient. We do it by phone, Zoom or in person if you happen to be near one of the hypnotherapists trained in the use of the <strong>Seven Keys to Self-Actualization</strong>. Terry Brussel-Rogers pioneered telephone hypnosis in 1995. It had nothing to do with Covid; we simply found that doing the session at home in your own space was more comfortable and productive for you, the client. Instead of having to drive there and back at an expense of gas money and your valuable time (not to mention effect on our environment), you do it from home and can use the energy of the session for accomplishing things after it or enjoy a relaxed, healing night's sleep afterward if it is an evening session. Since that is where you are likely to be practicing your self-hypnosis, it also works better to learn it in that environment.")}
  ${h2("Customized Goal Manifestation Recording")}
  ${p("The Life Guidance Discovery Session is the only way to arrange for the creation of a <strong>Customized Goal Manifestation Recording</strong> which includes the exact suggestions you and your hypnotherapist created together during the consultation and educational portions of that session. That professionally done recording suitable for listening to while going to sleep and during sleep is produced by your hypnotherapist and our audio engineer with as many takes as needed, music added, deepening suggestions and post production to make it exactly right for you. It plays automatically on Reach for the Stars program whether that is the 2nd play every other night at two meditations per night or every 4th play with one meditation per night. It is an integral part of manifesting your goals into reality!")}
  ${p("This costs <strong>$200</strong> at the time of your session, <strong>$250</strong> later. It is a gift if you sign up for more private sessions at the time of your session or decide to purchase an annual membership in Reach for the Stars for <strong>$390</strong>—a $78 savings over the $39 a month price.")}
  ${emailCtaButton(`${baseUrl}/play-options`, "Back to your member console")}
`);

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

/** Notify assigned facilitator when a member submits electronic LGD intake. */
export function getLgdIntakeSubmittedFacilitatorEmailContent(input: {
  facilitatorName?: string | null;
  memberEmail: string;
  memberFirstName?: string | null;
  memberLastName?: string | null;
}): TemplateContent {
  const baseUrl = getBaseUrl();
  const memberName =
    [input.memberFirstName, input.memberLastName].filter(Boolean).join(" ").trim() ||
    input.memberEmail;
  const subject = `Electronic LGD submitted — ${memberName}`;
  const fac = input.facilitatorName?.trim() || "Facilitator";
  const consoleUrl = `${baseUrl}/moderator/console`;
  const html = emailWrapper(`
  ${p(`Hi ${escapeHtml(fac)},`)}
  ${p(`<strong>${escapeHtml(memberName)}</strong> (${escapeHtml(input.memberEmail)}) submitted an electronic <strong>Life Guidance Discovery</strong> intake.`)}
  ${p("Open the Facilitators Console → Life Guidance Discovery to review the session brief and Goal Manifestation script draft.")}
  ${emailCtaButton(consoleUrl, "Open Facilitators Console")}
`);
  const text = `
Hi ${fac},

${memberName} (${input.memberEmail}) submitted an electronic Life Guidance Discovery intake.

Open the Facilitators Console → Life Guidance Discovery to review the session brief and Goal Manifestation script draft.

${consoleUrl}

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
  const hi = p(fn.length > 0 ? `Hi ${escapeHtml(fn)},` : "Hi there,");

  const html = emailWrapper(`
  ${hi}
  ${p(`Thank you for letting us know through <a href="${baseUrl}" style="color:#0f766e;">ReachForTheStars.Today</a> that you want to learn more about <strong>building your practice</strong>.`)}
  ${p("I am <strong>Terry Brussel-Rogers CCHt.</strong>, Director of Success Center Inc. and founder of Reach For the Stars. I will be in touch with you by phone, or feel free to call me at <strong>800-GOAL-NOW (800-462-5669)</strong>.")}
  ${p("I have been doing hypnotherapy, coaching, and healing since 1969, helping others build their practices since 1995. I would like to help you build <strong>YOUR</strong> practice. Please click the link below for your practice building gifts.")}
  ${emailCtaButton(giftsUrl, "Practice building gifts")}
  ${p(`From there you can also open your <a href="${baseUrl}/play-options" style="color:#0f766e;">member console</a> or browse the <a href="${baseUrl}/library" style="color:#0f766e;">library</a> for Build Practice content.`, EMAIL_MUTED)}
`);

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

export function getAffiliateThresholdReachedEmailContent(params: {
  firstName?: string | null;
  affiliateCode: string;
  balanceUsd: string;
  thresholdUsd: number;
}): TemplateContent {
  const baseUrl = getBaseUrl();
  const profileUrl = `${baseUrl}/member/profile`;
  const subject = "Your affiliate commission balance is ready for payout";
  const html = emailWrapper(`
  ${p(greeting(params.firstName))}
  ${p("Good news — your Reach For The Stars affiliate commission balance has reached the minimum payout threshold.")}
  ${p(`<strong>Affiliate #:</strong> ${escapeHtml(params.affiliateCode)}`)}
  ${p(`<strong>Pending balance:</strong> ${escapeHtml(params.balanceUsd)}`)}
  ${p(`Minimum payout is <strong>$${params.thresholdUsd}</strong>. Payouts are processed monthly for affiliates who set up automatic payouts through Stripe. You can also update manual payout preferences (PayPal, Venmo, Zelle, crypto) on your profile.`)}
  ${emailCtaButton(profileUrl, "Open member profile")}
  ${p("Questions? 800-GOAL-NOW (462-5669) or customerservice@reachforthestars.today", EMAIL_MUTED)}
`);
  const text = `
${greeting(params.firstName)}

Your affiliate commission balance (${params.balanceUsd}) has reached the $${params.thresholdUsd} minimum payout threshold.

Affiliate #: ${params.affiliateCode}

Set up automatic Stripe payouts or manual payout preferences: ${profileUrl}

Questions? 800-GOAL-NOW (462-5669)
`.trim();
  return { subject, html, text };
}

export function getAffiliatePayoutSentEmailContent(params: {
  firstName?: string | null;
  affiliateCode: string;
  amountUsd: string;
  transferId?: string;
}): TemplateContent {
  const baseUrl = getBaseUrl();
  const profileUrl = `${baseUrl}/member/profile`;
  const transferLine = params.transferId
    ? p(`Reference: ${escapeHtml(params.transferId)}`, EMAIL_MUTED)
    : "";
  const subject = "Your affiliate commission payout was sent";
  const html = emailWrapper(`
  ${p(greeting(params.firstName))}
  ${p("We sent your Reach For The Stars affiliate commission payout via Stripe Connect.")}
  ${p(`<strong>Affiliate #:</strong> ${escapeHtml(params.affiliateCode)}`)}
  ${p(`<strong>Amount:</strong> ${escapeHtml(params.amountUsd)}`)}
  ${transferLine}
  ${p("Funds typically arrive in your connected bank account within a few business days, depending on your bank and Stripe.")}
  ${emailCtaButton(profileUrl, "View profile")}
  ${p("Questions? 800-GOAL-NOW (462-5669) or customerservice@reachforthestars.today", EMAIL_MUTED)}
`);
  const transferText = params.transferId ? `Reference: ${params.transferId}\n\n` : "";
  const text = `
${greeting(params.firstName)}

Your affiliate commission payout of ${params.amountUsd} was sent via Stripe Connect.

Affiliate #: ${params.affiliateCode}
${transferText}
View your profile: ${profileUrl}

Questions? 800-GOAL-NOW (462-5669)
`.trim();
  return { subject, html, text };
}

/** Sent when a facilitator creates a new member account from the console. */
export function getFacilitatorCreatedMemberEmailContent(params: {
  firstName?: string | null;
  tierLabel: string;
  statusLabel: string;
  facilitatorName: string;
  loginUrl: string;
  billingNote: string;
}): TemplateContent {
  const baseUrl = getBaseUrl();
  const subject = "Your Reach For The Stars member account is ready";
  const dear = params.firstName?.trim()
    ? `Hi ${escapeHtml(params.firstName.trim())},`
    : "Hi there,";
  const html = emailWrapper(`
  ${p(dear)}
  ${p(`<strong>${escapeHtml(params.facilitatorName)}</strong>, your facilitator on Reach For The Stars, created a member account for you.`)}
  ${p(`<strong>Plan:</strong> ${escapeHtml(params.tierLabel)}<br />
  <strong>Status:</strong> ${escapeHtml(params.statusLabel)}`)}
  ${p(escapeHtml(params.billingNote))}
  ${p(`Sign in at <a href="${params.loginUrl}" style="color:#0f766e;">${escapeHtml(params.loginUrl)}</a> with the email and password your facilitator gave you.`)}
  ${emailCtaButton(`${baseUrl}/play-options`, "Open member console")}
  ${p("Questions? 800-GOAL-NOW (462-5669) or customerservice@acesuccess.com", EMAIL_MUTED)}
`);
  const text = `
${params.firstName?.trim() ? `Hi ${params.firstName.trim()},` : "Hi there,"}

${params.facilitatorName} created your Reach For The Stars member account.

Plan: ${params.tierLabel}
Status: ${params.statusLabel}

${params.billingNote}

Sign in: ${params.loginUrl}
Member console: ${baseUrl}/play-options
`.trim();
  return { subject, html, text };
}
