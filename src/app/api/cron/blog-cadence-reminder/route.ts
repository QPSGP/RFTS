import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  formatBlogCadenceReminder,
  getBlogCadenceStatus
} from "@/lib/blog-weekly-plan";
import { getWelcomeEmailCcRecipients, sendEmail } from "@/lib/email";
import { getPublicAppUrl } from "@/lib/site-url";

/**
 * Weekly blog cadence reminder (Vercel Cron: Mondays 09:00 UTC).
 * Emails staff when no new blog post in 7+ days and suggests the next topic.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const status = getBlogCadenceStatus();
  const appUrl = getPublicAppUrl();
  const body = formatBlogCadenceReminder(status);
  const html = body
    .split("\n")
    .map((line) => (line ? `<p>${line}</p>` : "<br />"))
    .join("");

  let emailSent = false;
  let emailError: string | undefined;

  if (status.due) {
    const recipients = [
      ...new Set([
        ...(await getWelcomeEmailCcRecipients()),
        "customerservice@reachforthestars.today"
      ])
    ];
    const result = await sendEmail({
      to: recipients,
      subject: `[RFTS] Weekly blog article due — ${status.nextTopic.label}`,
      html: `${html}<p><a href="${appUrl}/blog">Blog</a> · <a href="${appUrl}${status.signupPath}">Signup</a> · <a href="${appUrl}${status.nextTopic.path}">${status.nextTopic.label}</a></p>`,
      text: body,
      skipStaffBcc: true
    });
    emailSent = result.ok;
    emailError = result.error;
  }

  console.info("[cron blog-cadence-reminder]", JSON.stringify({
    due: status.due,
    daysSinceLatest: status.daysSinceLatest,
    nextTopic: status.nextTopic.label,
    emailSent
  }));

  return NextResponse.json({
    ok: true,
    due: status.due,
    daysSinceLatest: status.daysSinceLatest,
    nextTopic: status.nextTopic,
    emailSent,
    emailError
  });
}
