import type { PaymentProviderName } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
  recordWebhookEvent,
} from "@/lib/orders";
import { providerByName } from "@/lib/payments";

export const dynamic = "force-dynamic";

const NAMES: Record<string, PaymentProviderName> = {
  stripe: "STRIPE",
  paypal: "PAYPAL",
};

/**
 * Both providers post here. Signatures are verified before anything is read as
 * meaningful, and the event id is claimed before any effect is applied, so a
 * replayed delivery is a no-op.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/webhooks/[provider]">) {
  const { provider: slug } = await ctx.params;
  const name = NAMES[slug];
  if (!name) return new Response("Unknown provider", { status: 404 });

  // Must be the exact bytes the provider signed.
  const rawBody = await req.text();

  let outcome;
  try {
    outcome = await providerByName(name).verifyWebhook(req.headers, rawBody);
  } catch (err) {
    console.error(`[webhook:${slug}] verification failed`, err);
    return new Response("Invalid signature", { status: 400 });
  }

  const fresh = await recordWebhookEvent(name, outcome.eventId);
  if (!fresh) {
    return Response.json({ received: true, duplicate: true });
  }

  if (outcome.kind === "ignored") {
    return Response.json({ received: true, ignored: true });
  }

  const ref = { providerRef: outcome.providerRef, orderId: outcome.orderId };

  try {
    const result =
      outcome.kind === "paid"
        ? await markOrderPaid(name, ref)
        : outcome.kind === "failed"
          ? await markOrderFailed(name, ref)
          : await markOrderRefunded(name, ref);

    // Acknowledged either way — retrying an event for an order this store has
    // never seen would loop for days — but it is logged loudly, because on a
    // live store it means a real payment with no order attached to it.
    if (result === "unknown") {
      console.error(
        `[webhook:${slug}] ${outcome.kind} event ${outcome.eventId} matched no order ` +
          `(providerRef=${ref.providerRef ?? "none"} orderId=${ref.orderId ?? "none"})`,
      );
    }
  } catch (err) {
    console.error(`[webhook:${slug}] handling failed`, err);
    // 500 asks the provider to retry. The recorded event id is removed so the
    // retry is not mistaken for a duplicate.
    const { db } = await import("@/lib/db");
    await db.webhookEvent
      .deleteMany({ where: { provider: name, eventId: outcome.eventId } })
      .catch(() => {});
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
