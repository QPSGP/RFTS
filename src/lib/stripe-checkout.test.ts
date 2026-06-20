import {
  STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES,
  stripeCheckoutPaymentMethodParams
} from "./stripe-checkout";

describe("stripe-checkout", () => {
  it("requests card, PayPal, and US bank ACH", () => {
    expect(STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES).toEqual(["card", "paypal", "us_bank_account"]);
    const params = stripeCheckoutPaymentMethodParams();
    expect(params.payment_method_types).toEqual(["card", "paypal", "us_bank_account"]);
    expect(params.payment_method_options?.us_bank_account?.financial_connections?.permissions).toEqual(
      ["payment_method"]
    );
  });
});
