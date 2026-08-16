import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  applyLeadDefaults,
  eventLeadSubmitSchema
} from "@/lib/event-leads";
import {
  createEventLead,
  findEventLeadByEmailAndEvent,
  markEventLeadAutoReplied
} from "@/lib/event-leads-db";
import { sendEmail } from "@/lib/email";
import {
  getEventLeadConsumerAutoReplyContent,
  getEventLeadPracticeAutoReplyContent
} from "@/lib/email-templates";

const LEAD_SUBMIT_MAX_PER_MINUTE = 5;

/**
 * Public event lead card submit (practice survey or consumer).
 * Not linked from site nav; callers use /lead/practice or /lead/consumer.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`lead-submit:${ip}`, LEAD_SUBMIT_MAX_PER_MINUTE)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a minute." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = eventLeadSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form and try again." },
      { status: 400 }
    );
  }

  const input = applyLeadDefaults(parsed.data);
  const email = input.email;

  if (email && input.eventKey) {
    const existing = await findEventLeadByEmailAndEvent(email, input.eventKey);
    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadySubmitted: true,
        message: "We already have your info for this event. Thank you!"
      });
    }
  }

  const lead = await createEventLead(input, { createdByEmail: null });

  const wantAutoReply = input.autoReply !== false && Boolean(lead.email);
  let autoReplySent = false;
  if (wantAutoReply && lead.email) {
    const content =
      lead.formType === "consumer_lead"
        ? getEventLeadConsumerAutoReplyContent({
            firstName: lead.firstName,
            eventName: lead.eventName
          })
        : getEventLeadPracticeAutoReplyContent({
            firstName: lead.firstName,
            eventName: lead.eventName
          });
    const { ok } = await sendEmail({
      to: lead.email,
      subject: content.subject,
      html: content.html,
      text: content.text
    });
    if (ok) {
      autoReplySent = true;
      await markEventLeadAutoReplied(lead.id);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadySubmitted: false,
    autoReplySent,
    message: autoReplySent
      ? "Thanks! Check your email for next steps."
      : "Thanks! Your information was received."
  });
}
