"use server";

import { redirect } from "next/navigation";
import {
  createProduct,
  deleteProduct,
  NotFoundError,
  reorderProducts,
  setOrderStatus,
  setStock,
  updateProduct,
} from "@/lib/admin-products";
import {
  adminCount,
  currentAdmin,
  endSession,
  hashPassword,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  adminLoginSchema,
  adminSetupSchema,
  orderStatusSchema,
  productCreateSchema,
  productUpdateSchema,
  stockUpdateSchema,
} from "@/lib/validation";

/**
 * Server Actions are same-origin checked by Next, which is what protects these
 * mutations from CSRF. Each one re-checks the session rather than trusting the
 * layout that rendered the form.
 */

export type ActionState = { error?: string; success?: string } | null;

async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function issuesToMessage(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues.map((i) => i.message).join(". ");
}

export async function setupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Bootstrapping is only possible while no administrator exists.
  if ((await adminCount()) > 0) {
    return { error: "An administrator already exists. Sign in instead." };
  }

  const limit = await rateLimit(`admin-setup:${await clientIp()}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts. Try again shortly." };

  const parsed = adminSetupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    setupToken: formData.get("setupToken"),
  });
  if (!parsed.success) return { error: issuesToMessage(parsed.error.issues) };

  if (parsed.data.setupToken !== env().ADMIN_SETUP_TOKEN) {
    return { error: "That setup token is not correct." };
  }

  const user = await db.adminUser.create({
    data: {
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await startSession(user.id);
  redirect("/admin");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clientIp();
  const limit = await rateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` };
  }

  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const user = await db.adminUser.findUnique({ where: { email: parsed.data.email } });

  // Hash even when the account is unknown, so response time does not reveal
  // whether the email exists.
  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");

  if (!user || !valid) return { error: "Email or password is not correct." };

  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = productCreateSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    imageUrl: formData.get("imageUrl"),
    stock: formData.get("stock") || undefined,
    description: formData.get("description") || undefined,
    supplierUrl: formData.get("supplierUrl") || undefined,
    supplierCost: formData.get("supplierCost") || undefined,
  });
  if (!parsed.success) return { error: issuesToMessage(parsed.error.issues) };

  const product = await createProduct(parsed.data);
  return { success: `Added ${product.name}.` };
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const raw: Record<string, unknown> = { id: formData.get("id") };
  for (const key of [
    "name",
    "price",
    "imageUrl",
    "description",
    "imageAlt",
    "supplierUrl",
    "supplierCost",
    "supplierNote",
  ]) {
    const value = formData.get(key);
    if (value !== null) raw[key] = value;
  }
  const stock = formData.get("stock");
  if (stock !== null) raw.stock = stock;
  // The form sends a hidden "false" plus "on" when checked, so both states
  // arrive. getAll keeps them; get would only ever see the hidden one.
  const activeValues = formData.getAll("active");
  if (activeValues.length > 0) raw.active = activeValues.includes("on");

  const parsed = productUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: issuesToMessage(parsed.error.issues) };

  try {
    const product = await updateProduct(parsed.data);
    return { success: `Saved ${product.name}.` };
  } catch (err) {
    if (err instanceof NotFoundError) return { error: err.message };
    throw err;
  }
}

export async function setStockAction(id: string, stock: number): Promise<ActionState> {
  await requireAdmin();
  const parsed = stockUpdateSchema.safeParse({ id, stock });
  if (!parsed.success) return { error: issuesToMessage(parsed.error.issues) };

  try {
    await setStock(parsed.data);
    return { success: "Stock updated." };
  } catch (err) {
    if (err instanceof NotFoundError) return { error: err.message };
    throw err;
  }
}

export async function toggleActiveAction(id: string, active: boolean): Promise<ActionState> {
  await requireAdmin();
  try {
    await updateProduct({ id, active });
    return { success: active ? "Product is visible." : "Product is hidden." };
  } catch (err) {
    if (err instanceof NotFoundError) return { error: err.message };
    throw err;
  }
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  await requireAdmin();
  try {
    const product = await deleteProduct({ id });
    return { success: `Deleted ${product.name}.` };
  } catch (err) {
    if (err instanceof NotFoundError) return { error: err.message };
    throw err;
  }
}

export async function reorderAction(ids: string[]): Promise<ActionState> {
  await requireAdmin();
  if (ids.length === 0 || ids.length > 200) return { error: "Nothing to reorder." };
  await reorderProducts(ids);
  return { success: "Order saved." };
}

export async function setOrderStatusAction(
  id: string,
  status: string,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = orderStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { error: issuesToMessage(parsed.error.issues) };

  const order = await setOrderStatus(parsed.data);
  return { success: `${order.number} is now ${order.status.toLowerCase()}.` };
}
