export type ProviderName = "STRIPE" | "PAYPAL";

export type CheckoutItem = {
  name: string;
  unitCents: number;
  quantity: number;
  imageUrl: string;
};

export type CheckoutRequest = {
  orderId: string;
  orderNumber: string;
  email: string;
  items: CheckoutItem[];
  shippingCents: number;
  totalCents: number;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  /** The provider's identifier for this attempt. Stored on the order. */
  providerRef: string;
  /** Where the browser is sent to pay. */
  redirectUrl: string;
};

/**
 * Every webhook resolves to one of these. `eventId` is what makes replay
 * handling possible — it is recorded before the effect is applied.
 */
export type OrderRef = {
  /** The provider's identifier for the attempt. May not be stored yet. */
  providerRef?: string;
  /** Our own order id, echoed back through provider metadata. */
  orderId?: string;
};

export type WebhookOutcome =
  | ({ kind: "paid"; eventId: string } & OrderRef)
  | ({ kind: "failed"; eventId: string } & OrderRef)
  | ({ kind: "refunded"; eventId: string } & OrderRef)
  | { kind: "ignored"; eventId: string };

export interface PaymentProvider {
  readonly name: ProviderName;
  /** Human label for the pay button. */
  readonly payLabel: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Throws if the signature does not verify. Never returns on bad input. */
  verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookOutcome>;
  /**
   * Confirms payment server-to-server after the buyer returns. Used instead of
   * trusting redirect query parameters, and safe to call more than once.
   */
  confirmByRef(providerRef: string): Promise<"paid" | "pending" | "failed">;
  refund(providerRef: string, amountCents?: number): Promise<void>;
}

export class PaymentConfigError extends Error {}
