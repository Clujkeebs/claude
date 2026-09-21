import { z } from "zod";

const boolish = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  PAYMENT_PROVIDER: z.enum(["stripe", "paypal"]).default("stripe"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ADMIN_API_TOKEN: z.string().min(24, "ADMIN_API_TOKEN must be at least 24 characters"),
  ADMIN_SETUP_TOKEN: z.string().min(16, "ADMIN_SETUP_TOKEN must be at least 16 characters"),

  SHIPPING_FLAT_CENTS: z.coerce.number().int().min(0).default(0),
  FREE_SHIPPING_THRESHOLD_CENTS: z.coerce.number().int().min(0).default(0),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Squishy Supply House <onboarding@resend.dev>"),
  OWNER_EMAIL: z.string().email().default("clujkeebs@gmail.com"),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),

  NEXT_PUBLIC_ANALYTICS_ENABLED: boolish,
  NEXT_PUBLIC_ANALYTICS_SRC: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_WEBSITE_ID: z.string().optional(),
});

export type Env = z.infer<typeof baseSchema>;

let cached: Env | null = null;

/**
 * Validation is deferred to first use so `next build` can prerender static
 * pages in images that have no runtime secrets attached yet.
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
