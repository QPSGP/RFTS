import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-utils";
import { getUserSessionEmail } from "@/lib/user-auth";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  category: z.string().max(100).optional().default("")
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
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input. Please provide a subject and message.", 400);
  }
  const to =
    process.env.REPORT_ISSUE_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "customerservice@reachforthestars.today";
  const categoryLabel = parsed.data.category || "General";
  const subject = `[RFTS Report] ${parsed.data.subject}`;
  const html = `
    <p><strong>Report from member:</strong> ${email}</p>
    <p><strong>Category:</strong> ${categoryLabel}</p>
    <p><strong>Subject:</strong> ${parsed.data.subject}</p>
    <hr />
    <p>${parsed.data.message.replace(/\n/g, "<br />")}</p>
  `;
  const text = `Report from: ${email}\nCategory: ${categoryLabel}\nSubject: ${parsed.data.subject}\n\n${parsed.data.message}`;
  const { ok, error } = await sendEmail({ to, subject, html, text });
  if (!ok) {
    return apiError(error || "Could not send report. Please try again or email us directly.", 500);
  }
  return NextResponse.json({ message: "Thank you. We received your report and will look into it." });
}
