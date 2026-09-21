import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const SESSION_COOKIE = "ssh_admin";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

export type AdminSession = { userId: string; email: string };

function sign(payload: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function createToken(userId: string): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts as [string, string, string];
  if (!safeEqual(signature, sign(`${userId}.${expires}`))) return null;
  if (Number.parseInt(expires, 10) < Date.now()) return null;
  return { userId };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function startSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function currentAdmin(): Promise<AdminSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const parsed = readToken(raw);
  if (!parsed) return null;

  const user = await db.adminUser.findUnique({
    where: { id: parsed.userId },
    select: { id: true, email: true },
  });
  return user ? { userId: user.id, email: user.email } : null;
}

export async function adminCount(): Promise<number> {
  return db.adminUser.count();
}

/**
 * Bearer auth for the admin HTTP API and the MCP server. Compared in constant
 * time so the token cannot be recovered by timing the response.
 */
export function checkApiToken(header: string | null): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();
  const expected = env().ADMIN_API_TOKEN;
  return safeEqual(provided, expected);
}

export function unauthorized(): Response {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "www-authenticate": "Bearer" } },
  );
}

export function newApiToken(): string {
  return randomBytes(24).toString("hex");
}
