import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const CART_COOKIE = "ssh_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  unitCents: number;
  quantity: number;
  stock: number;
  lineCents: number;
};

export type CartSummary = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  adjusted: boolean;
};

export const emptyCart: CartSummary = {
  lines: [],
  count: 0,
  subtotalCents: 0,
  shippingCents: 0,
  totalCents: 0,
  adjusted: false,
};

export function shippingFor(subtotalCents: number): number {
  const { SHIPPING_FLAT_CENTS, FREE_SHIPPING_THRESHOLD_CENTS } = env();
  if (SHIPPING_FLAT_CENTS === 0) return 0;
  if (FREE_SHIPPING_THRESHOLD_CENTS > 0 && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
    return 0;
  }
  return SHIPPING_FLAT_CENTS;
}

export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Only callable from a Route Handler or Server Action — it writes a cookie. */
export async function ensureCartToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const token = randomBytes(24).toString("hex");
  store.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_MAX_AGE,
  });
  return token;
}

async function getCartIdByToken(token: string): Promise<string | null> {
  const cart = await db.cart.findUnique({ where: { token }, select: { id: true } });
  return cart?.id ?? null;
}

export async function getOrCreateCartId(token: string): Promise<string> {
  const cart = await db.cart.upsert({
    where: { token },
    create: { token },
    update: {},
    select: { id: true },
  });
  return cart.id;
}

/**
 * Builds the cart from the database every time. Quantities are clamped to live
 * stock and the clamp is persisted, so the totals shown are the totals charged.
 */
export async function summarizeCart(token: string | null): Promise<CartSummary> {
  if (!token) return emptyCart;
  const cartId = await getCartIdByToken(token);
  if (!cartId) return emptyCart;

  const items = await db.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          imageUrl: true,
          imageAlt: true,
          priceCents: true,
          stock: true,
          active: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const lines: CartLine[] = [];
  const removeIds: string[] = [];
  const clamps: { id: string; quantity: number }[] = [];
  let adjusted = false;

  for (const item of items) {
    const p = item.product;
    if (!p.active || p.stock <= 0) {
      removeIds.push(item.id);
      adjusted = true;
      continue;
    }
    const quantity = Math.min(item.quantity, p.stock);
    if (quantity !== item.quantity) {
      clamps.push({ id: item.id, quantity });
      adjusted = true;
    }
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: p.imageUrl,
      imageAlt: p.imageAlt ?? p.name,
      unitCents: p.priceCents,
      quantity,
      stock: p.stock,
      lineCents: p.priceCents * quantity,
    });
  }

  if (removeIds.length > 0) {
    await db.cartItem.deleteMany({ where: { id: { in: removeIds } } });
  }
  for (const c of clamps) {
    await db.cartItem.update({ where: { id: c.id }, data: { quantity: c.quantity } });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineCents, 0);
  const shippingCents = shippingFor(subtotalCents);

  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    adjusted,
  };
}

export async function clearCart(token: string): Promise<void> {
  const cartId = await getCartIdByToken(token);
  if (cartId) await db.cartItem.deleteMany({ where: { cartId } });
}
