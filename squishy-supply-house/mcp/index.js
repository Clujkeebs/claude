#!/usr/bin/env node
/**
 * MCP server for Squishy Supply House.
 *
 * Wraps the store's admin HTTP API so products can be listed and edited in
 * conversation. It holds no business logic of its own — every call goes through
 * the same bearer-authenticated endpoints the admin UI uses, which means the
 * Zod schemas in src/lib/validation.ts are the single source of truth.
 *
 * Environment:
 *   SQUISHY_API_URL      base URL of the store (default http://localhost:3000)
 *   SQUISHY_ADMIN_TOKEN  same value as ADMIN_API_TOKEN in the store's env
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.SQUISHY_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = process.env.SQUISHY_ADMIN_TOKEN ?? "";

if (!TOKEN) {
  console.error("SQUISHY_ADMIN_TOKEN is not set. Set it to the store's ADMIN_API_TOKEN.");
  process.exit(1);
}

async function call(path, { method = "GET", body, query } = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Store returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    const detail = Array.isArray(json.details) ? ` — ${json.details.join("; ")}` : "";
    throw new Error(`${json.error ?? `Request failed (${res.status})`}${detail}`);
  }
  return json;
}

const ok = (text) => ({ content: [{ type: "text", text }] });
const fail = (err) => ({
  isError: true,
  content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
});

const money = (cents) =>
  typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "n/a";

function describeProduct(p) {
  const flags = [
    p.active ? null : "inactive",
    p.stock === 0 ? "sold out" : `${p.stock} in stock`,
  ].filter(Boolean);
  return `${p.name} (${p.slug}) — ${money(p.priceCents)} — ${flags.join(", ")} — id ${p.id}`;
}

const server = new McpServer({
  name: "squishy-supply-house",
  version: "1.0.0",
});

/** A product reference: either the cuid or the URL slug. */
const ref = {
  id: z.string().optional().describe("Product id. Use this or slug."),
  slug: z.string().optional().describe("Product slug, e.g. pink-axolotl. Use this or id."),
};

server.registerTool(
  "create_product",
  {
    title: "Create a product",
    description:
      "Add a product to the store. Only name, price and imageUrl are required; " +
      "the slug is generated from the name. Stock defaults to 0, which lists the " +
      "product as sold out, so pass stock to make it buyable.",
    inputSchema: {
      name: z.string().describe('Product name, e.g. "Pink Axolotl Squishy"'),
      price: z
        .union([z.string(), z.number()])
        .describe('Price in dollars, e.g. 14 or "14.99"'),
      imageUrl: z.string().describe("Full https image URL, usually the supplier's CDN"),
      description: z.string().optional(),
      stock: z.number().int().min(0).optional().describe("Units available. Defaults to 0."),
      imageAlt: z.string().optional().describe("Alt text. Defaults to the product name."),
      extraImages: z.array(z.string()).optional().describe("Up to 6 more https image URLs"),
      active: z.boolean().optional().describe("Visible in the shop. Defaults to true."),
      supplierUrl: z.string().optional().describe("Private: where this is sourced from"),
      supplierCost: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Private: unit cost in dollars"),
      supplierNote: z.string().optional().describe("Private: internal note"),
    },
  },
  async (args) => {
    try {
      const { product } = await call("/api/admin/products", { method: "POST", body: args });
      return ok(
        `Created ${describeProduct(product)}\nLive at ${BASE}/products/${product.slug}`,
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "update_product",
  {
    title: "Update a product",
    description:
      "Change any field on an existing product. Identify it by id or slug. " +
      "Only the fields you pass are changed.",
    inputSchema: {
      ...ref,
      name: z.string().optional(),
      price: z.union([z.string(), z.number()]).optional(),
      imageUrl: z.string().optional(),
      description: z.string().optional(),
      stock: z.number().int().min(0).optional(),
      imageAlt: z.string().optional(),
      extraImages: z.array(z.string()).optional(),
      active: z.boolean().optional().describe("Set false to hide without deleting"),
      newSlug: z.string().optional().describe("Change the URL slug"),
      supplierUrl: z.string().optional(),
      supplierCost: z.union([z.string(), z.number()]).optional(),
      supplierNote: z.string().optional(),
    },
  },
  async ({ id, slug, newSlug, ...rest }) => {
    try {
      const { product } = await call("/api/admin/products", {
        method: "PATCH",
        body: { id, slugRef: slug, ...(newSlug ? { slug: newSlug } : {}), ...rest },
      });
      return ok(`Updated ${describeProduct(product)}`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "list_products",
  {
    title: "List products",
    description:
      "List products in the store, newest sort order first. Includes stock levels " +
      "and ids you can pass to the other tools.",
    inputSchema: {
      search: z.string().optional().describe("Filter by name or slug"),
      includeInactive: z.boolean().optional().describe("Include hidden products"),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ search, includeInactive, limit }) => {
    try {
      const { products, total } = await call("/api/admin/products", {
        query: { search, includeInactive, limit },
      });
      if (products.length === 0) return ok("No products match.");
      return ok(
        `${products.length} of ${total} product(s):\n` +
          products.map((p) => `- ${describeProduct(p)}`).join("\n"),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "update_stock",
  {
    title: "Set stock level",
    description: "Set a product's stock to an exact number. Setting 0 marks it sold out.",
    inputSchema: { ...ref, stock: z.number().int().min(0) },
  },
  async ({ id, slug, stock }) => {
    try {
      const { product } = await call("/api/admin/stock", {
        method: "POST",
        body: { id, slugRef: slug, stock },
      });
      return ok(`${product.name} stock is now ${product.stock}.`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "delete_product",
  {
    title: "Delete a product",
    description:
      "Permanently remove a product. Past orders keep their own copy of the name " +
      "and price, so order history is unaffected. To hide a product instead, use " +
      "update_product with active false.",
    inputSchema: ref,
  },
  async ({ id, slug }) => {
    try {
      const { deleted } = await call("/api/admin/products", {
        method: "DELETE",
        body: { id, slugRef: slug },
      });
      return ok(`Deleted ${deleted.name}.`);
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "list_orders",
  {
    title: "List orders",
    description:
      "Recent orders with status, payment provider, customer email and totals. " +
      "PAID orders are awaiting fulfilment; PENDING ones were never completed.",
    inputSchema: {
      status: z
        .enum(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"])
        .optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ status, limit }) => {
    try {
      const { orders, total } = await call("/api/admin/orders", {
        query: { status, limit },
      });
      if (orders.length === 0) return ok("No orders match.");
      return ok(
        `${orders.length} of ${total} order(s):\n` +
          orders
            .map((o) => {
              const items = o.items
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(", ");
              const flag = o.note?.includes("OVERSOLD") ? "  [NEEDS ATTENTION]" : "";
              return (
                `- ${o.number} — ${o.status} via ${o.provider} — ${money(o.totalCents)} — ` +
                `${o.email} — ${items}${flag}`
              );
            })
            .join("\n"),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

await server.connect(new StdioServerTransport());
