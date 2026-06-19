import { NextResponse } from "next/server";

function stripeSecretKeyKind(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  if (!key || key === "sk_test_replace") return "missing";
  if (key.startsWith("sk_live_")) return "sk_live";
  if (key.startsWith("sk_test_")) return "sk_test";
  if (key.startsWith("rk_live_")) return "rk_live";
  if (key.startsWith("rk_test_")) return "rk_test";
  return "other";
}

export async function GET() {
  const stripeEnvKeys = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes("STRIPE") || k.includes("DEMO_SKIP"))
    .sort();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
    stripe: {
      secretKeyKind: stripeSecretKeyKind(),
      secretKeyDefined: process.env.STRIPE_SECRET_KEY !== undefined,
      secretKeyLength: (process.env.STRIPE_SECRET_KEY ?? "").trim().length,
      webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET?.trim(),
      stripeMode: process.env.STRIPE_MODE?.trim() || null,
      publicStripeMode: process.env.NEXT_PUBLIC_STRIPE_MODE?.trim() || null,
      demoSkipStripe: process.env.DEMO_SKIP_STRIPE === "true",
      /** Names only — shows which STRIPE* keys the server actually received from Vercel */
      envKeysPresent: stripeEnvKeys,
      postgresConfigured: !!process.env.POSTGRES_URL?.trim()
    }
  });
}
