import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env";
import {
  PaymentConfigError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentProvider,
  type WebhookOutcome,
} from "./types";

let client: Stripe | null = null;

function stripe(): Stripe {
  if (client) return client;
  const key = env().STRIPE_SECRET_KEY;
  if (!key) {
    throw new PaymentConfigError(
      "STRIPE_SECRET_KEY is not set. Add it to the environment to accept card payments.",
    );
  }
  client = new Stripe(key);
  return client;
}

export const stripeProvider: PaymentProvider = {
  name: "STRIPE",
  payLabel: "Pay with card",

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: req.email,
        client_reference_id: req.orderId,
        line_items: req.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.unitCents,
            product_data: {
              name: item.name,
              // Stripe rejects relative paths, so local demo images are dropped.
              images: item.imageUrl.startsWith("https://") ? [item.imageUrl] : undefined,
            },
          },
        })),
        shipping_options:
          req.shippingCents > 0
            ? [
                {
                  shipping_rate_data: {
                    type: "fixed_amount",
                    display_name: "Shipping",
                    fixed_amount: { amount: req.shippingCents, currency: "usd" },
                  },
                },
              ]
            : undefined,
        metadata: { orderId: req.orderId, orderNumber: req.orderNumber },
        payment_intent_data: {
          metadata: { orderId: req.orderId, orderNumber: req.orderNumber },
        },
        success_url: req.successUrl,
        cancel_url: req.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
      },
      // Replaying the same order never creates a second Stripe session.
      { idempotencyKey: `checkout_${req.orderId}` },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    return { providerRef: session.id, redirectUrl: session.url };
  },

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookOutcome> {
    const secret = env().STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new PaymentConfigError("STRIPE_WEBHOOK_SECRET is not set");

    const signature = headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    // Throws on a bad signature or a timestamp outside the tolerance window.
    const event = stripe().webhooks.constructEvent(rawBody, signature, secret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "paid") {
          return { kind: "ignored", eventId: event.id };
        }
        return {
          kind: "paid",
          eventId: event.id,
          providerRef: session.id,
          orderId: session.metadata?.orderId ?? session.client_reference_id ?? undefined,
        };
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        return {
          kind: "paid",
          eventId: event.id,
          providerRef: session.id,
          orderId: session.metadata?.orderId ?? session.client_reference_id ?? undefined,
        };
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object;
        return {
          kind: "failed",
          eventId: event.id,
          providerRef: session.id,
          orderId: session.metadata?.orderId ?? session.client_reference_id ?? undefined,
        };
      }
      case "charge.refunded": {
        const charge = event.data.object;
        // Fires for partial refunds too. Only a full refund makes the order
        // refunded; a partial one is a bookkeeping matter for the owner.
        if (charge.amount_refunded < charge.amount) {
          return { kind: "ignored", eventId: event.id };
        }
        const pi =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!pi) return { kind: "ignored", eventId: event.id };
        const sessions = await stripe().checkout.sessions.list({ payment_intent: pi, limit: 1 });
        const ref = sessions.data[0]?.id;
        if (!ref) return { kind: "ignored", eventId: event.id };
        return { kind: "refunded", eventId: event.id, providerRef: ref };
      }
      default:
        return { kind: "ignored", eventId: event.id };
    }
  },

  async confirmByRef(providerRef: string) {
    const session = await stripe().checkout.sessions.retrieve(providerRef);
    if (session.payment_status === "paid") return "paid";
    if (session.status === "expired") return "failed";
    return "pending";
  },

  async refund(providerRef: string, amountCents?: number) {
    const session = await stripe().checkout.sessions.retrieve(providerRef);
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!pi) throw new Error("No payment intent on that checkout session");
    await stripe().refunds.create({ payment_intent: pi, amount: amountCents });
  },
};
