import {
  STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES,
  createMembershipCheckoutSession,
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

  it("falls back to card-only when extended payment methods are rejected", async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error("The payment method type paypal is invalid"))
      .mockResolvedValueOnce({ id: "cs_test", url: "https://checkout.stripe.com/test" });
    const stripe = { checkout: { sessions: { create } } } as unknown as import("stripe").default;

    const session = await createMembershipCheckoutSession(stripe, {
      mode: "subscription",
      line_items: [{ price: "price_test", quantity: 1 }],
      success_url: "https://example.com/ok",
      cancel_url: "https://example.com/cancel"
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].payment_method_types).toEqual(["card"]);
    expect(session.url).toBe("https://checkout.stripe.com/test");
  });
});
