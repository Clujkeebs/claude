import type { MetadataRoute } from "next";
import { policies } from "@/content/legal";
import { siteUrl } from "@/lib/env";
import { listProductSlugs } from "@/lib/products";

// Built per request: the database is unreachable during a Railway build,
// and a sitemap missing every product is worse than one extra query.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  const policyRoutes: MetadataRoute.Sitemap = policies.map((p) => ({
    url: `${base}/policies/${p.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // A database outage must not take the sitemap down with it.
  const products = await listProductSlugs().catch(() => []);
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...policyRoutes, ...productRoutes];
}
