import "server-only";

import { env } from "@/lib/env";
import {
  PaymentConfigError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentProvider,
  type WebhookOutcome,
} from "./types";

function apiBase(): string {
  return env().PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function credentials(): { id: string; secret: string } {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = env();
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new PaymentConfigError(
      "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set to accept PayPal payments.",
    );
  }
  return { id: PAYPAL_CLIENT_ID, secret: PAYPAL_CLIENT_SECRET };
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const { id, secret } = credentials();
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

async function paypalFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${apiBase()}${path}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {}),
      ...(rest.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal ${path} failed: ${res.status} ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

const money = (cents: number) => (cents / 100).toFixed(2);

type PayPalOrder = {
  id: string;
  status: string;
  links?: { href: string; rel: string; method: string }[];
  purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
};

export const paypalProvider: PaymentProvider = {
  name: "PAYPAL",
  payLabel: "Pay with PayPal",

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const itemTotal = req.items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0);

    const order = await paypalFetch<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      idempotencyKey: `order_${req.orderId}`,
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: req.orderId,
            invoice_id: req.orderNumber,
            description: `Order ${req.orderNumber}`,
            amount: {
              currency_code: "USD",
              value: money(req.totalCents),
              breakdown: {
                item_total: { currency_code: "USD", value: money(itemTotal) },
                shipping: { currency_code: "USD", value: money(req.shippingCents) },
              },
            },
            items: req.items.map((item) => ({
              name: item.name.slice(0, 127),
              quantity: String(item.quantity),
              unit_amount: { currency_code: "USD", value: money(item.unitCents) },
              category: "PHYSICAL_GOODS",
            })),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: req.successUrl,
              cancel_url: req.cancelUrl,
            },
          },
        },
      }),
    });

    const approve = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approve) throw new Error("PayPal did not return an approval link");

    return { providerRef: order.id, redirectUrl: approve.href };
  },

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookOutcome> {
    const webhookId = env().PAYPAL_WEBHOOK_ID;
    if (!webhookId) throw new PaymentConfigError("PAYPAL_WEBHOOK_ID is not set");

    const required = [
      "paypal-auth-algo",
      "paypal-cert-url",
      "paypal-transmission-id",
      "paypal-transmission-sig",
      "paypal-transmission-time",
    ] as const;
    for (const h of required) {
      if (!headers.get(h)) throw new Error(`Missing ${h} header`);
    }

    const verification = await paypalFetch<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: headers.get("paypal-auth-algo"),
          cert_url: headers.get("paypal-cert-url"),
          transmission_id: headers.get("paypal-transmission-id"),
          transmission_sig: headers.get("paypal-transmission-sig"),
          transmission_time: headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      },
    );

    if (verification.verification_status !== "SUCCESS") {
      throw new Error("PayPal webhook signature did not verify");
    }

    const event = JSON.parse(rawBody) as {
      id: string;
      event_type: string;
      resource?: {
        id?: string;
        custom_id?: string;
        supplementary_data?: { related_ids?: { order_id?: string } };
        purchase_units?: { custom_id?: string }[];
      };
    };

    // Captures report their own id, so walk back to the order id we stored.
    const relatedOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
    const orderRef = relatedOrderId ?? event.resource?.id;
    // custom_id is our own order id, set on the purchase unit at checkout.
    const ourOrderId =
      event.resource?.custom_id ?? event.resource?.purchase_units?.[0]?.custom_id;

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        if (!orderRef) return { kind: "ignored", eventId: event.id };
        // Approval is not money. Capture, then report the real outcome.
        const status = await capture(orderRef);
        return status === "paid"
          ? { kind: "paid", eventId: event.id, providerRef: orderRef, orderId: ourOrderId }
          : { kind: "ignored", eventId: event.id };
      }
      case "PAYMENT.CAPTURE.COMPLETED":
        if (!orderRef && !ourOrderId) return { kind: "ignored", eventId: event.id };
        return { kind: "paid", eventId: event.id, providerRef: orderRef, orderId: ourOrderId };
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
        if (!orderRef && !ourOrderId) return { kind: "ignored", eventId: event.id };
        return { kind: "failed", eventId: event.id, providerRef: orderRef, orderId: ourOrderId };
      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        // resource.id here is the refund, not the order, so it is never a
        // usable fallback. Only the related order id or our own custom_id are.
        if (!relatedOrderId && !ourOrderId) {
          console.warn(`[paypal] refund event ${event.id} carried no order reference`);
          return { kind: "ignored", eventId: event.id };
        }
        return {
          kind: "refunded",
          eventId: event.id,
          providerRef: relatedOrderId,
          orderId: ourOrderId,
        };
      }
      default:
        return { kind: "ignored", eventId: event.id };
    }
  },

  async confirmByRef(providerRef: string) {
    const order = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${providerRef}`);
    if (order.status === "COMPLETED") return "paid";
    if (order.status === "APPROVED") return capture(providerRef);
    if (order.status === "VOIDED") return "failed";
    return "pending";
  },

  async refund(providerRef: string, amountCents?: number) {
    const order = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${providerRef}`);
    const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    if (!captureId) throw new Error("No capture found for that PayPal order");

    await paypalFetch(`/v2/payments/captures/${captureId}/refund`, {
      method: "POST",
      idempotencyKey: `refund_${captureId}_${amountCents ?? "full"}`,
      body: JSON.stringify(
        amountCents === undefined
          ? {}
          : { amount: { currency_code: "USD", value: money(amountCents) } },
      ),
    });
  },
};

/** Capturing twice returns ORDER_ALREADY_CAPTURED, which we treat as success. */
async function capture(orderRef: string): Promise<"paid" | "pending" | "failed"> {
  try {
    const result = await paypalFetch<PayPalOrder>(
      `/v2/checkout/orders/${orderRef}/capture`,
      { method: "POST", idempotencyKey: `capture_${orderRef}`, body: "{}" },
    );
    return result.status === "COMPLETED" ? "paid" : "pending";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ORDER_ALREADY_CAPTURED")) return "paid";
    if (message.includes("ORDER_NOT_APPROVED")) return "pending";
    throw err;
  }
}
