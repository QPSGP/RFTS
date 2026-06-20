import type Stripe from "stripe";

/** Checkout payment methods for membership subscriptions (also enable in Stripe Dashboard). */
export const STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
  ["card", "paypal", "us_bank_account"];

/**
 * Shared Stripe Checkout payment settings: card, PayPal, and US bank (ACH).
 * Requires PayPal and ACH Direct Debit enabled under Stripe → Settings → Payment methods.
 */
export function stripeCheckoutPaymentMethodParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "payment_method_types" | "payment_method_options"
> {
  return {
    payment_method_types: [...STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES],
    payment_method_options: {
      us_bank_account: {
        financial_connections: {
          permissions: ["payment_method"]
        }
      }
    }
  };
}
