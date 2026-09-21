import "server-only";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendShippedNotice } from "@/lib/email";
import {
  slugify,
  type ProductCreateInput,
  type ProductUpdateInput,
} from "@/lib/validation";
import type { z } from "zod";
import type {
  orderListSchema,
  orderStatusSchema,
  productListSchema,
  stockUpdateSchema,
} from "@/lib/validation";

/**
 * The only place products and orders are written. The admin UI, the bearer-token
 * HTTP API and the MCP server all call through here, so validation and cache
 * invalidation cannot drift between them.
 */

export class NotFoundError extends Error {
  constructor(message = "Product not found") {
    super(message);
  }
}

function refreshStorefront(slug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  if (slug) revalidatePath(`/products/${slug}`);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "item";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const existing = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function resolveId(ref: { id?: string; slugRef?: string }): Promise<string> {
  if (ref.id) {
    const byId = await db.product.findUnique({ where: { id: ref.id }, select: { id: true } });
    if (byId) return byId.id;
  }
  if (ref.slugRef) {
    const bySlug = await db.product.findUnique({
      where: { slug: ref.slugRef },
      select: { id: true },
    });
    if (bySlug) return bySlug.id;
  }
  throw new NotFoundError();
}

export async function createProduct(input: ProductCreateInput) {
  const slug = await uniqueSlug(input.slug || input.name);
  const last = await db.product.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const product = await db.product.create({
    data: {
      slug,
      name: input.name,
      priceCents: input.price,
      imageUrl: input.imageUrl,
      description: input.description || null,
      imageAlt: input.imageAlt || null,
      extraImages: input.extraImages ?? [],
      stock: input.stock ?? 0,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? (last?.sortOrder ?? 0) + 1,
      supplierUrl: input.supplierUrl || null,
      supplierCostCents: input.supplierCost ?? null,
      supplierNote: input.supplierNote || null,
    },
  });

  refreshStorefront(product.slug);
  return product;
}

export async function updateProduct(input: ProductUpdateInput) {
  const id = await resolveId(input);
  const existing = await db.product.findUniqueOrThrow({ where: { id } });

  const slug =
    input.slug !== undefined && input.slug !== existing.slug
      ? await uniqueSlug(input.slug, id)
      : existing.slug;

  const product = await db.product.update({
    where: { id },
    data: {
      slug,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { priceCents: input.price } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.imageAlt !== undefined ? { imageAlt: input.imageAlt || null } : {}),
      ...(input.extraImages !== undefined ? { extraImages: input.extraImages } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.supplierUrl !== undefined ? { supplierUrl: input.supplierUrl || null } : {}),
      ...(input.supplierCost !== undefined ? { supplierCostCents: input.supplierCost } : {}),
      ...(input.supplierNote !== undefined ? { supplierNote: input.supplierNote || null } : {}),
    },
  });

  refreshStorefront(product.slug);
  if (existing.slug !== product.slug) refreshStorefront(existing.slug);
  return product;
}

export async function deleteProduct(ref: { id?: string; slugRef?: string }) {
  const id = await resolveId(ref);
  const product = await db.product.delete({ where: { id } });
  refreshStorefront(product.slug);
  return product;
}

export async function setStock(input: z.infer<typeof stockUpdateSchema>) {
  const id = await resolveId(input);
  const product = await db.product.update({
    where: { id },
    data: { stock: input.stock },
  });
  refreshStorefront(product.slug);
  return product;
}

export async function reorderProducts(ids: string[]) {
  await db.$transaction(
    ids.map((id, index) =>
      db.product.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  refreshStorefront();
}

export async function listProductsAdmin(options: z.infer<typeof productListSchema>) {
  const where = {
    ...(options.includeInactive ? {} : { active: true }),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" as const } },
            { slug: { contains: options.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: options.limit,
      skip: options.offset,
    }),
    db.product.count({ where }),
  ]);

  return { items, total };
}

export async function listOrdersAdmin(options: z.infer<typeof orderListSchema>) {
  const where = options.status ? { status: options.status } : {};
  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit,
      skip: options.offset,
      include: {
        items: {
          select: { id: true, name: true, quantity: true, unitCents: true, lineCents: true },
        },
      },
    }),
    db.order.count({ where }),
  ]);
  return { items, total };
}

export async function setOrderStatus(input: z.infer<typeof orderStatusSchema>) {
  const order = await db.order.update({
    where: { id: input.id },
    data: {
      status: input.status,
      ...(input.status === "FULFILLED" ? { fulfilledAt: new Date() } : {}),
    },
    select: {
      number: true,
      accessToken: true,
      email: true,
      createdAt: true,
      status: true,
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

  // Marking an order fulfilled is the trigger for the shipped notice.
  if (input.status === "FULFILLED") {
    await sendShippedNotice(order).catch((err) =>
      console.error("[admin] shipped notice failed", err),
    );
  }

  revalidatePath("/admin/orders");
  return order;
}
