import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  formatBlogCadenceReminder,
  getBlogCadenceStatus
} from "@/lib/blog-weekly-plan";
import { getWelcomeEmailCcRecipients, sendEmail } from "@/lib/email";
import { getPublicAppUrl } from "@/lib/site-url";

/**
 * Blog cadence reminder (Vercel Cron: daily 17:00 UTC).
 * Emails staff when behind the 3-posts-per-week pace and suggests the next topic.
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
      subject: `[RFTS] Blog cadence late — ${status.publishedThisWeek}/${status.target} this week`,
      html: `${html}<p><a href="${appUrl}/blog">Blog</a> · <a href="${appUrl}${status.signupPath}">Signup</a> · <a href="${appUrl}${status.nextTopic.path}">${status.nextTopic.label}</a></p>`,
      text: body,
      skipStaffBcc: true
    });
    emailSent = result.ok;
    emailError = result.error;
  }

  console.info("[cron blog-cadence-reminder]", JSON.stringify({
    due: status.due,
    publishedThisWeek: status.publishedThisWeek,
    target: status.target,
    daysSinceLatest: status.daysSinceLatest,
    nextTopic: status.nextTopic.label,
    emailSent
  }));

  return NextResponse.json({
    ok: true,
    due: status.due,
    publishedThisWeek: status.publishedThisWeek,
    target: status.target,
    daysSinceLatest: status.daysSinceLatest,
    nextTopic: status.nextTopic,
    emailSent,
    emailError
  });
}
