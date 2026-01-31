import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export const getStripe = () => {
  if (cachedStripe) {
    return cachedStripe;
  }
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  cachedStripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20"
  });
  return cachedStripe;
};
