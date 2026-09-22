import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma, type PaymentProviderName } from "@prisma/client";
import { clearCart, shippingFor, summarizeCart } from "@/lib/cart";
import { db } from "@/lib/db";
import {
  sendOrderConfirmation,
  sendOwnerNotification,
  type OrderEmailData,
} from "@/lib/email";
import type { CheckoutInput } from "@/lib/validation";

const ORDER_NUMBER_BASE = 1000;

export function orderNumberFor(seq: number): string {
  return `SSH-${ORDER_NUMBER_BASE + seq}`;
}

export type CreateOrderResult =
  | { ok: true; order: { id: string; number: string; accessToken: string; totalCents: number; subtotalCents: number; shippingCents: number; email: string; items: { name: string; unitCents: number; quantity: number; imageUrl: string }[] } }
  | { ok: false; reason: "empty" | "stock" };

/**
 * Creates the PENDING order that a payment attempt is attached to. Totals are
 * recomputed from the database here — nothing the browser sent is trusted.
 */
export async function createPendingOrder(
  cartToken: string,
  input: CheckoutInput,
  provider: PaymentProviderName,
): Promise<CreateOrderResult> {
  const cart = await summarizeCart(cartToken);
  if (cart.lines.length === 0) return { ok: false, reason: "empty" };
  // summarizeCart clamps to live stock; a clamp mid-checkout means the basket
  // the customer reviewed is no longer the basket they would be charged for.
  if (cart.adjusted) return { ok: false, reason: "stock" };

  const subtotalCents = cart.lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  const shippingCents = shippingFor(subtotalCents);
  const totalCents = subtotalCents + shippingCents;

  const order = await db.$transaction(async (tx) => {
    // Reserving the sequence value up front means the row is inserted once,
    // already carrying its final number. Inserting a placeholder into a unique
    // column first would make every concurrent checkout queue on one key.
    const [{ seq }] = await tx.$queryRaw<{ seq: bigint }[]>`
      SELECT nextval(pg_get_serial_sequence('"Order"', 'seq')) AS seq
    `;
    const seqNumber = Number(seq);

    return tx.order.create({
      data: {
        seq: seqNumber,
        number: orderNumberFor(seqNumber),
        accessToken: randomBytes(16).toString("hex"),
        cartToken,
        email: input.email,
        provider,
        subtotalCents,
        shippingCents,
        totalCents,
        shippingName: input.shippingName,
        shippingLine1: input.shippingLine1,
        shippingLine2: input.shippingLine2 || null,
        shippingCity: input.shippingCity,
        shippingState: input.shippingState,
        shippingPostalCode: input.shippingPostalCode,
        shippingCountry: "US",
        note: input.note || null,
        items: {
          create: cart.lines.map((l) => ({
            productId: l.productId,
            name: l.name,
            slug: l.slug,
            imageUrl: l.imageUrl,
            unitCents: l.unitCents,
            quantity: l.quantity,
            lineCents: l.unitCents * l.quantity,
          })),
        },
      },
      select: {
        id: true,
        number: true,
        accessToken: true,
        email: true,
        subtotalCents: true,
        shippingCents: true,
        totalCents: true,
        items: {
          select: { name: true, unitCents: true, quantity: true, imageUrl: true },
        },
      },
    });
  });

  return { ok: true, order };
}

export async function attachProviderRef(orderId: string, providerRef: string) {
  await db.order.update({ where: { id: orderId }, data: { providerRef } });
}

/**
 * Records the event id before any effect runs. A duplicate delivery hits the
 * unique index and returns false, so the effect never applies twice.
 */
export async function recordWebhookEvent(
  provider: PaymentProviderName,
  eventId: string,
): Promise<boolean> {
  try {
    await db.webhookEvent.create({ data: { provider, eventId } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

function toEmailData(order: {
  number: string;
  accessToken: string;
  email: string;
  createdAt: Date;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  items: { name: string; quantity: number; unitCents: number; lineCents: number }[];
}): OrderEmailData {
  return order;
}

/**
 * Idempotent. Only a PENDING order transitions, so replayed webhooks and the
 * post-redirect confirmation call cannot double-decrement stock or double-send
 * the receipt.
 */
export type OrderLookup = { providerRef?: string; orderId?: string };

/**
 * A webhook can arrive before the provider reference has been stored, so the
 * order is also findable by the id we hand the provider as metadata. Without
 * this, a payment landing inside that window would never be recorded.
 */
async function findOrderFor(provider: PaymentProviderName, ref: OrderLookup) {
  const order = await db.order.findFirst({
    where: {
      provider,
      OR: [
        ...(ref.providerRef ? [{ providerRef: ref.providerRef }] : []),
        ...(ref.orderId ? [{ id: ref.orderId }] : []),
      ],
    },
    select: { id: true, status: true, provider: true, providerRef: true },
  });
  if (!order) return null;

  // Backfill the reference so later events and refunds resolve directly.
  if (ref.providerRef && order.providerRef !== ref.providerRef) {
    await db.order
      .update({ where: { id: order.id }, data: { providerRef: ref.providerRef } })
      .catch(() => {});
  }
  return order;
}

export async function markOrderPaid(
  provider: PaymentProviderName,
  ref: OrderLookup,
): Promise<"applied" | "already" | "unknown"> {
  const order = await findOrderFor(provider, ref);
  if (!order) return "unknown";
  if (order.status !== "PENDING") return "already";

  const result = await db.$transaction(async (tx) => {
    // Claim the transition first. If another worker already moved it, stop.
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claimed.count === 0) return null;

    const items = await tx.orderItem.findMany({
      where: { orderId: order.id },
      select: { productId: true, name: true, quantity: true },
    });

    const shortfalls: string[] = [];
    for (const item of items) {
      if (!item.productId) continue;
      // Conditional decrement: the row only changes when stock can cover it.
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) shortfalls.push(`${item.name} x${item.quantity}`);
    }

    if (shortfalls.length > 0) {
      // Appended, never assigned: `note` also holds what the customer typed at
      // checkout, which is often the delivery instructions.
      const existing = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        select: { note: true },
      });
      const flag = `OVERSOLD — could not reserve: ${shortfalls.join(", ")}. Refund or restock manually.`;
      await tx.order.update({
        where: { id: order.id },
        data: { note: existing.note ? `${flag}\n\nCustomer note: ${existing.note}` : flag },
      });
    }

    // The basket is now an order; emptying it stops a duplicate purchase.
    const { cartToken } = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { cartToken: true },
    });
    if (cartToken) {
      const cart = await tx.cart.findUnique({
        where: { token: cartToken },
        select: { id: true },
      });
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    const full = await tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: {
        number: true,
        accessToken: true,
        email: true,
        createdAt: true,
        subtotalCents: true,
        shippingCents: true,
        totalCents: true,
        shippingName: true,
        shippingLine1: true,
        shippingLine2: true,
        shippingCity: true,
        shippingState: true,
        shippingPostalCode: true,
        items: {
          select: { name: true, quantity: true, unitCents: true, lineCents: true },
        },
      },
    });

    return { full, shortfalls };
  });

  if (!result) return "already";

  const data = toEmailData(result.full);
  // Email and cart cleanup are best-effort; the payment is already recorded.
  await Promise.allSettled([
    sendOrderConfirmation(data),
    sendOwnerNotification(
      data,
      result.shortfalls.length > 0
        ? `Stock could not be reserved for: ${result.shortfalls.join(", ")}. Refund or restock manually.`
        : undefined,
    ),
  ]);

  return "applied";
}

export async function markOrderFailed(
  provider: PaymentProviderName,
  ref: OrderLookup,
): Promise<"applied" | "already" | "unknown"> {
  const order = await findOrderFor(provider, ref);
  if (!order) return "unknown";
  // Only abandons an order that never got paid; a PAID order is never reverted.
  const result = await db.order.updateMany({
    where: { id: order.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  return result.count > 0 ? "applied" : "already";
}

export async function markOrderRefunded(
  provider: PaymentProviderName,
  ref: OrderLookup,
): Promise<"applied" | "already" | "unknown"> {
  const order = await findOrderFor(provider, ref);
  if (!order) return "unknown";
  const result = await db.order.updateMany({
    where: { id: order.id, status: { in: ["PAID", "FULFILLED"] } },
    data: { status: "REFUNDED" },
  });
  return result.count > 0 ? "applied" : "already";
}

export async function clearCartForOrder(cartToken: string | null): Promise<void> {
  if (cartToken) await clearCart(cartToken);
}

export async function getOrderByNumber(number: string) {
  return db.order.findUnique({
    where: { number },
    select: {
      id: true,
      number: true,
      accessToken: true,
      email: true,
      status: true,
      provider: true,
      providerRef: true,
      createdAt: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      shippingName: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingState: true,
      shippingPostalCode: true,
      items: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          quantity: true,
          unitCents: true,
          lineCents: true,
        },
      },
    },
  });
}
