import "server-only";

import { db } from "@/lib/db";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  imageAlt: string;
  stock: number;
};

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  priceCents: true,
  imageUrl: true,
  imageAlt: true,
  stock: true,
} as const;

function toCard(p: {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  imageAlt: string | null;
  stock: number;
}): ProductCardData {
  return { ...p, imageAlt: p.imageAlt ?? p.name };
}

export async function listProducts(options?: {
  search?: string;
  limit?: number;
}): Promise<ProductCardData[]> {
  const search = options?.search?.trim();
  const rows = await db.product.findMany({
    where: {
      active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    // Sold-out items sink to the bottom without disappearing.
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: options?.limit,
    select: cardSelect,
  });
  return rows.map(toCard).sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
}

export async function countActiveProducts(): Promise<number> {
  return db.product.count({ where: { active: true } });
}

export async function getProductBySlug(slug: string) {
  const p = await db.product.findFirst({
    where: { slug, active: true },
    select: {
      ...cardSelect,
      description: true,
      extraImages: true,
      updatedAt: true,
    },
  });
  return p ? { ...toCard(p), description: p.description, extraImages: p.extraImages, updatedAt: p.updatedAt } : null;
}

export async function listProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.product.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
