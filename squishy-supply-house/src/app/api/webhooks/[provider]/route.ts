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

  try {
    switch (outcome.kind) {
      case "paid":
        await markOrderPaid(name, outcome.providerRef);
        break;
      case "failed":
        await markOrderFailed(name, outcome.providerRef);
        break;
      case "refunded":
        await markOrderRefunded(name, outcome.providerRef);
        break;
      case "ignored":
        break;
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
