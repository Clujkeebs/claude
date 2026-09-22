import { NextRequest } from "next/server";
import {
  ensureCartToken,
  getOrCreateCartId,
  readCartToken,
  summarizeCart,
} from "@/lib/cart";
import { db } from "@/lib/db";
import { cartAddSchema, cartUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await summarizeCart(await readCartToken()));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = cartAddSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, stock: true, active: true },
  });
  if (!product || !product.active || product.stock <= 0) {
    return Response.json({ error: "That item is not available" }, { status: 409 });
  }

  const token = await ensureCartToken();
  const cartId = await getOrCreateCartId(token);

  // Incremented in the database rather than read-then-written, so two rapid
  // adds cannot read the same starting quantity and lose one of them.
  // summarizeCart clamps the result back to live stock and persists the clamp.
  await db.cartItem.upsert({
    where: { cartId_productId: { cartId, productId: product.id } },
    create: {
      cartId,
      productId: product.id,
      quantity: Math.min(parsed.data.quantity, product.stock),
    },
    update: { quantity: { increment: parsed.data.quantity } },
  });
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });

  return Response.json(await summarizeCart(token));
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = cartUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = await readCartToken();
  if (!token) return Response.json(await summarizeCart(null));

  const cart = await db.cart.findUnique({ where: { token }, select: { id: true } });
  if (!cart) return Response.json(await summarizeCart(null));

  const { productId, quantity } = parsed.data;

  if (quantity === 0) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return Response.json(await summarizeCart(token));
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { stock: true, active: true },
  });
  if (!product || !product.active || product.stock <= 0) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return Response.json(await summarizeCart(token));
  }

  await db.cartItem.updateMany({
    where: { cartId: cart.id, productId },
    data: { quantity: Math.min(quantity, product.stock) },
  });

  return Response.json(await summarizeCart(token));
}
