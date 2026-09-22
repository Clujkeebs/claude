import { z } from "zod";
import { parsePriceToCents } from "./money";

/**
 * Single source of truth for product and order shapes. The admin UI, the admin
 * HTTP API and the MCP server all validate against these — there is no second
 * copy to drift.
 */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/**
 * z.coerce.boolean() is Boolean(x), so the string "false" parses as true and
 * `?includeInactive=false` would do the opposite of what it says. Query strings
 * and form fields only ever carry strings, so they need a real parser.
 */
const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v, ctx) => {
    if (typeof v === "boolean") return v;
    const normalised = v.trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(normalised)) return true;
    if (["false", "0", "off", "no", ""].includes(normalised)) return false;
    ctx.addIssue({ code: "custom", message: "Expected true or false" });
    return z.NEVER;
  });

const priceField = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const cents = parsePriceToCents(v);
    if (cents === null || cents < 0) {
      ctx.addIssue({ code: "custom", message: "Price must be a number like 14 or 14.99" });
      return z.NEVER;
    }
    if (cents > 100_000_00) {
      ctx.addIssue({ code: "custom", message: "Price must be under $100,000" });
      return z.NEVER;
    }
    return cents;
  });

/**
 * Supplier cost is optional, and the edit form submits an empty string when it
 * is unset. Treating "" as null makes the field clearable and stops an empty
 * one failing price validation, which previously blocked saving any product
 * that had no cost recorded.
 */
const optionalPriceField = z
  .union([z.literal(""), z.string(), z.number(), z.null()])
  .transform((v, ctx) => {
    if (v === "" || v === null) return null;
    const cents = parsePriceToCents(v);
    if (cents === null || cents < 0) {
      ctx.addIssue({ code: "custom", message: "Cost must be a number like 4 or 4.99" });
      return z.NEVER;
    }
    return cents;
  });

const imageUrlField = z
  .string()
  .trim()
  .url("Image must be a full URL starting with https://")
  .refine((u) => u.startsWith("https://"), "Image URL must use https");

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(140),
  price: priceField,
  imageUrl: imageUrlField,
  slug: z.string().trim().max(72).optional(),
  description: z.string().trim().max(5000).optional(),
  imageAlt: z.string().trim().max(200).optional(),
  extraImages: z.array(imageUrlField).max(6).optional(),
  stock: z.coerce.number().int().min(0).max(100_000).optional(),
  active: booleanish.optional(),
  sortOrder: z.coerce.number().int().optional(),
  supplierUrl: z.string().trim().url().optional().or(z.literal("")),
  supplierCost: optionalPriceField.optional(),
  supplierNote: z.string().trim().max(2000).optional(),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  id: z.string().trim().min(1).optional(),
  slugRef: z.string().trim().min(1).optional(),
});

export const productDeleteSchema = z.object({
  id: z.string().trim().min(1).optional(),
  slugRef: z.string().trim().min(1).optional(),
});

export const productListSchema = z.object({
  search: z.string().trim().max(140).optional(),
  includeInactive: booleanish.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const stockUpdateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  slugRef: z.string().trim().min(1).optional(),
  stock: z.coerce.number().int().min(0).max(100_000),
});

export const orderListSchema = z.object({
  status: z.enum(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const orderStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"]),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(200),
});

const cartLineSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(0).max(99),
});

export const cartAddSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const cartUpdateSchema = cartLineSchema;

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  shippingName: z.string().trim().min(1, "Name is required").max(120),
  shippingLine1: z.string().trim().min(1, "Street address is required").max(200),
  shippingLine2: z.string().trim().max(200).optional(),
  shippingCity: z.string().trim().min(1, "City is required").max(100),
  shippingState: z
    .string()
    .trim()
    .min(2, "Use a two-letter state code")
    .max(2, "Use a two-letter state code")
    .toUpperCase(),
  shippingPostalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Enter a ZIP code like 90210"),
  note: z.string().trim().max(500).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  subject: z.string().trim().min(1, "Subject is required").max(160),
  message: z.string().trim().min(10, "Tell us a little more").max(4000),
  // Honeypot. Real people never fill this in. Deliberately permissive so a
  // filled one reaches the handler and can be answered with a fake success
  // rather than a 400 that names the trap.
  website: z.string().optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(200),
});

export const adminSetupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(200),
  setupToken: z.string().min(1, "Setup token is required"),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
