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

function shouldFallbackCheckoutToCardOnly(message: string): boolean {
  return /payment method type|payment_method_types|paypal|us_bank_account|not enabled|invalid/i.test(
    message
  );
}

/**
 * Creates a subscription Checkout session with PayPal + ACH when Stripe allows it;
 * falls back to card-only so signup never breaks when extra methods are not activated.
 */
export async function createMembershipCheckoutSession(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams
): Promise<Stripe.Checkout.Session> {
  const extended: Stripe.Checkout.SessionCreateParams = {
    ...params,
    ...stripeCheckoutPaymentMethodParams()
  };
  try {
    return await stripe.checkout.sessions.create(extended);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!shouldFallbackCheckoutToCardOnly(msg)) {
      throw err;
    }
    console.warn("[stripe-checkout] Falling back to card-only Checkout:", msg);
    const { payment_method_types: _t, payment_method_options: _o, ...rest } = extended;
    return await stripe.checkout.sessions.create({
      ...rest,
      payment_method_types: ["card"]
    });
  }
}
