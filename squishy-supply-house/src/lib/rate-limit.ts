import "server-only";

import { headers } from "next/headers";
import { db } from "@/lib/db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Database-backed so limits survive restarts and hold across Railway replicas.
 * Volume is tiny (login, contact, checkout only), so a row per hit is fine.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs);

  const hits = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (hits >= limit) {
    const oldest = await db.rateLimitHit.findFirst({
      where: { key, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const resetAt = (oldest?.createdAt.getTime() ?? Date.now()) + windowMs;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    };
  }

  await db.rateLimitHit.create({ data: { key } });

  // Opportunistic cleanup; cheap because the index is on (key, createdAt).
  if (Math.random() < 0.02) {
    await db.rateLimitHit.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Try again shortly." },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
  );
}
