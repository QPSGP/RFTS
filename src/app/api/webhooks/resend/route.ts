import { NextResponse } from "next/server";
import { Resend } from "resend";
import { processResendEmailWebhook } from "@/lib/resend-webhook";

/**
 * Resend delivery webhooks (Svix-signed).
 * Configure in Resend → Webhooks → URL:
 *   https://reachforthestars.today/api/webhooks/resend
 * Events: email.bounced, email.complained
 * Env: RESEND_WEBHOOK_SECRET (signing secret from Resend webhook details)
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[resend webhook] RESEND_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix signature headers." }, { status: 400 });
  }

  let envelope: { type?: string; created_at?: string; data?: Record<string, unknown> };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "re_webhook_verify");
    envelope = resend.webhooks.verify({
      payload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature
      },
      webhookSecret
    }) as unknown as typeof envelope;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[resend webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const result = await processResendEmailWebhook({
      envelope,
      svixId
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[resend webhook] Processing failed:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
