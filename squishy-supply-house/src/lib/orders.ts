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
    const created = await tx.order.create({
      data: {
        number: "",
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
      select: { id: true, seq: true },
    });

    // seq is assigned by the database, so the human-readable number is set once
    // the row exists.
    return tx.order.update({
      where: { id: created.id },
      data: { number: orderNumberFor(created.seq) },
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
export async function markOrderPaid(
  provider: PaymentProviderName,
  providerRef: string,
): Promise<"applied" | "already" | "unknown"> {
  const order = await db.order.findUnique({
    where: { providerRef },
    select: { id: true, status: true, provider: true },
  });
  if (!order || order.provider !== provider) return "unknown";
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
      await tx.order.update({
        where: { id: order.id },
        data: {
          note: `OVERSOLD — could not reserve: ${shortfalls.join(", ")}. Refund or restock manually.`,
        },
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
  providerRef: string,
): Promise<void> {
  // Only abandons an order that never got paid; a PAID order is never reverted.
  await db.order.updateMany({
    where: { providerRef, provider, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

export async function markOrderRefunded(
  provider: PaymentProviderName,
  providerRef: string,
): Promise<void> {
  await db.order.updateMany({
    where: { providerRef, provider, status: { in: ["PAID", "FULFILLED"] } },
    data: { status: "REFUNDED" },
  });
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
