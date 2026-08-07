import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import {
  getEventLeadConsumerAutoReplyContent,
  getEventLeadPracticeAutoReplyContent
} from "@/lib/email-templates";
import {
  applyLeadDefaults,
  eventLeadSubmitSchema,
  normalizeLeadEmail
} from "@/lib/event-leads";
import {
  createEventLead,
  findEventLeadByEmailAndEvent,
  markEventLeadAutoReplied
} from "@/lib/event-leads-db";

/**
 * Public QR / link submit for digital lead cards.
 * Not linked from site nav; callers use /lead/practice or /lead/consumer.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = eventLeadSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form and try again." },
      { status: 400 }
    );
  }

  const input = applyLeadDefaults(parsed.data);
  const email = normalizeLeadEmail(input.email ?? null);

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
