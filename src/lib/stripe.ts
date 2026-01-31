import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export const getStripeMode = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  const detectedMode = stripeSecretKey.startsWith("sk_test") ? "demo" : "live";
  const configured = (process.env.STRIPE_MODE || "").toLowerCase();
  if (configured === "demo" || configured === "live") {
    if (configured === "demo" && detectedMode === "live") {
      throw new Error("STRIPE_MODE=demo but STRIPE_SECRET_KEY is live.");
    }
    return configured as "demo" | "live";
  }
  return detectedMode as "demo" | "live";
};

export const getStripe = () => {
  if (cachedStripe) {
    return cachedStripe;
  }
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  getStripeMode();
  cachedStripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20"
  });
  return cachedStripe;
};
