import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";
import { getUserSessionEmail } from "@/lib/user-auth";
import { sendEmail } from "@/lib/email";
import { getReportIssueConfirmationContent } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import {
  appendReportIssueContext,
  formatReportIssueContextBlock,
  type ClientDiagnosticContext
} from "@/lib/report-issue-context";
import { mergeReportIssueAttachmentUrls } from "@/lib/report-issue-attachments";
import { getMemberProfileByUserId, getUserByEmail, getUserProfile, insertMemberIssueReport, getFacilitatorsForMemberEmail } from "@/lib/db";

const clientContextSchema = z
  .object({
    pageUrl: z.string().max(2048).optional(),
    userAgent: z.string().max(2000).optional(),
    platform: z.string().max(200).optional(),
    language: z.string().max(50).optional(),
    timeZone: z.string().max(100).optional(),
    screen: z.string().max(100).optional(),
    viewport: z.string().max(100).optional(),
    deviceMemoryGb: z.number().nullable().optional(),
    hardwareConcurrency: z.number().nullable().optional(),
    touchPoints: z.number().optional(),
    standalonePwa: z.boolean().optional(),
    collectedAt: z.string().max(50).optional()
  })
  .optional();

const schema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  category: z.string().max(100).optional().default(""),
  attachmentUrls: z.array(z.string().url().max(2048)).max(3).optional(),
  screenshotUrl: z.string().url().max(2048).optional(),
  clientContext: clientContextSchema
});

const REPORT_ISSUE_MAX_PER_MINUTE = 5;

export async function POST(request: Request) {
  const email = await getUserSessionEmail();
  if (!email) {
    return apiError("You must be logged in to report an issue.", 401);
  }
  if (!rateLimit(`report-issue:${email}`, REPORT_ISSUE_MAX_PER_MINUTE)) {
    return apiError("Too many reports. Please try again in a minute.", 429);
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return apiError("Account not found.", 404);
  }
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input. Please provide a subject and message.", 400);
  }
  const to =
    process.env.REPORT_ISSUE_EMAIL ||
    "Richard@richardleeweatherman.com";
  const categoryLabel = parsed.data.category || "General";
  const attachmentUrls = mergeReportIssueAttachmentUrls(
    parsed.data.attachmentUrls,
    parsed.data.screenshotUrl
  );
  const screenshotUrl = attachmentUrls[0] ?? null;
  const userProfile = await getUserProfile(user.email);
  const memberProfile = await getMemberProfileByUserId(user.id);
  const serverContext = {
    memberEmail: user.email,
    memberId: user.id,
    subscriptionTier: userProfile?.subscriptionTier ?? null,
    subscriptionStatus: userProfile?.subscriptionStatus ?? null,
    playsPerNight: userProfile?.playsPerNight ?? 2,
    goalCount: userProfile?.goalIds?.length ?? 0,
    firstName: memberProfile?.firstName ?? null,
    lastName: memberProfile?.lastName ?? null
  };
  const clientContext = parsed.data.clientContext as ClientDiagnosticContext | undefined;
  const messageWithContext = appendReportIssueContext(
    parsed.data.message,
    serverContext,
    clientContext
  );
  const contextBlock = formatReportIssueContextBlock(serverContext, clientContext);
  const subject = `[RFTS Report] ${parsed.data.subject}`;
  const attachmentHtml = attachmentUrls.length
    ? `<p><strong>Attachments:</strong></p><ul>${attachmentUrls
        .map(
          (url, index) =>
            `<li><a href="${url}">Attachment ${index + 1}</a></li>`
        )
        .join("")}</ul>`
    : "";
  const attachmentText = attachmentUrls.length
    ? `\nAttachments:\n${attachmentUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}`
    : "";
  const html = `
    <p><strong>Report from member:</strong> ${email}</p>
    <p><strong>Category:</strong> ${categoryLabel}</p>
    <p><strong>Subject:</strong> ${parsed.data.subject}</p>
    ${attachmentHtml}
    <hr />
    <p>${parsed.data.message.replace(/\n/g, "<br />")}</p>
    <hr />
    <pre style="font-size:12px;white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px;">${contextBlock.replace(/</g, "&lt;")}</pre>
  `;
  const text = `Report from: ${email}\nCategory: ${categoryLabel}\nSubject: ${parsed.data.subject}${attachmentText}\n\n${parsed.data.message}\n\n${contextBlock}`;
  const facilitators = await getFacilitatorsForMemberEmail(user.email);
  const facilitatorCc = facilitators[0]?.email ? [facilitators[0].email] : [];
  const { ok, error } = await sendEmail({ to, subject, html, text, cc: facilitatorCc });
  let storedInAdmin = false;
  if (ok) {
    storedInAdmin = await insertMemberIssueReport({
      userId: user.id,
      memberEmail: user.email,
      category: categoryLabel,
      subject: parsed.data.subject,
      message: messageWithContext,
      screenshotUrl,
      attachmentUrls
    });
    if (!storedInAdmin) {
      console.error(
        "[report-issue] Email sent but member_issue_reports insert failed — run db:schema on production DB"
      );
    }
  }
  if (!ok) {
    const isNotConfigured = error?.includes("RESEND_API_KEY");
    const message = isNotConfigured
      ? "We're temporarily unable to send your report by email. Please contact us at Richard@richardleeweatherman.com."
      : error || "Could not send report. Please try again or email us at Richard@richardleeweatherman.com.";
    return apiError(message, isNotConfigured ? 503 : 500);
  }
  // Send confirmation to the member
  const firstName = memberProfile?.firstName ?? null;
  const confirmation = getReportIssueConfirmationContent({
    firstName,
    subject: parsed.data.subject,
    categoryLabel,
    categoryValue: parsed.data.category
  });
  const confirmResult = await sendEmail({
    to: email,
    subject: confirmation.subject,
    html: confirmation.html,
    text: confirmation.text
  });
  if (!confirmResult.ok) {
    console.error("[report-issue] Confirmation email failed:", confirmResult.error);
  }
  return NextResponse.json({
    message: "Thank you. We received your report and will look into it.",
    storedInAdmin,
    ...(storedInAdmin
      ? {}
      : {
          warning:
            "Your message was emailed to our team, but the admin queue could not be updated. Ask support to run the latest database schema."
        })
  });
}
