import { NextRequest } from "next/server";
import { readCartToken } from "@/lib/cart";
import { siteUrl } from "@/lib/env";
import {
  attachProviderRef,
  createPendingOrder,
} from "@/lib/orders";
import { activeProvider, PaymentConfigError } from "@/lib/payments";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limit = await rateLimit(`checkout:${await clientIp()}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "Check the highlighted fields.",
        fields: Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      },
      { status: 400 },
    );
  }

  const cartToken = await readCartToken();
  if (!cartToken) {
    return Response.json({ error: "Your cart is empty." }, { status: 409 });
  }

  const provider = activeProvider();
  const created = await createPendingOrder(cartToken, parsed.data, provider.name);

  if (!created.ok) {
    return Response.json(
      {
        error:
          created.reason === "empty"
            ? "Your cart is empty."
            : "Stock changed while you were checking out. Your cart has been updated.",
        reason: created.reason,
      },
      { status: 409 },
    );
  }

  const { order } = created;

  try {
    const session = await provider.createCheckout({
      orderId: order.id,
      orderNumber: order.number,
      email: order.email,
      items: order.items,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      successUrl: `${siteUrl()}/orders/${order.number}?t=${order.accessToken}`,
      cancelUrl: `${siteUrl()}/checkout?cancelled=1`,
    });

    await attachProviderRef(order.id, session.providerRef);
    return Response.json({ redirectUrl: session.redirectUrl });
  } catch (err) {
    // The order stays PENDING and the cart is untouched, so the customer can
    // simply try again.
    console.error("[checkout] provider failed", err);
    const message =
      err instanceof PaymentConfigError
        ? "Payments are not configured yet. Email us and we will take the order manually."
        : "Payment could not be started. Your cart is untouched — try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
