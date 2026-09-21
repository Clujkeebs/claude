/**
 * Payment correctness harness.
 *
 * Exercises the money-handling paths against a running dev server and a real
 * Postgres database, without needing live Stripe or PayPal credentials:
 * webhook signature verification, replay protection, atomic stock decrement,
 * server-side total recalculation, and the out-of-stock paths.
 *
 *   npm run dev            # in one terminal
 *   npm run verify:payments
 *
 * Requires STRIPE_WEBHOOK_SECRET to be set to the same value the dev server
 * loaded, because the harness signs payloads with it exactly as Stripe would.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const db = new PrismaClient();

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(name: string) {
  console.log(`\n${name}`);
}

// --- fixtures --------------------------------------------------------------

const TAG = `verify-${randomBytes(4).toString("hex")}`;

async function makeProduct(priceCents: number, stock: number) {
  return db.product.create({
    data: {
      slug: `${TAG}-${randomBytes(3).toString("hex")}`,
      name: `${TAG} item`,
      priceCents,
      stock,
      imageUrl: "https://ae01.alicdn.com/placeholder.jpg",
      active: true,
    },
  });
}

async function cleanup() {
  await db.orderItem.deleteMany({ where: { name: { contains: TAG } } });
  await db.order.deleteMany({ where: { email: { contains: TAG } } });
  await db.product.deleteMany({ where: { slug: { startsWith: TAG } } });
  await db.webhookEvent.deleteMany({ where: { eventId: { startsWith: `evt_${TAG}` } } });
}

// --- cart over real HTTP ---------------------------------------------------

type CartResponse = {
  lines: { productId: string; quantity: number; unitCents: number }[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  adjusted: boolean;
};

class Session {
  private cookie = "";

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...(init.headers ?? {}),
      },
      redirect: "manual",
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const pair = setCookie.split(";")[0];
      if (pair) this.cookie = pair;
    }
    return res;
  }

  get cartToken(): string {
    return this.cookie.split("=")[1] ?? "";
  }

  async addToCart(productId: string, quantity: number): Promise<CartResponse> {
    const res = await this.request("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
    return (await res.json()) as CartResponse;
  }
}

// --- stripe webhook signing -------------------------------------------------

function stripeEvent(sessionId: string, type: string, eventId: string) {
  return {
    id: eventId,
    object: "event",
    type,
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_status: "paid",
        status: "complete",
      },
    },
  };
}

async function postStripeWebhook(
  payload: object,
  { secret = WEBHOOK_SECRET, corrupt = false } = {},
): Promise<Response> {
  const body = JSON.stringify(payload);
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return fetch(`${BASE}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": corrupt ? header.replace(/v1=[a-f0-9]+/, "v1=deadbeef") : header,
    },
    body,
  });
}

/** Mirrors createPendingOrder so the harness can attach a synthetic session. */
async function pendingOrder(
  cartToken: string,
  lines: { productId: string; name: string; slug: string; unitCents: number; quantity: number }[],
  providerRef: string,
) {
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  const created = await db.order.create({
    data: {
      number: "",
      accessToken: randomBytes(16).toString("hex"),
      cartToken,
      email: `${TAG}@example.com`,
      provider: "STRIPE",
      providerRef,
      subtotalCents,
      shippingCents: 0,
      totalCents: subtotalCents,
      shippingName: "Test Person",
      shippingLine1: "1 Test Street",
      shippingCity: "Testville",
      shippingState: "CA",
      shippingPostalCode: "90210",
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          slug: l.slug,
          imageUrl: "https://ae01.alicdn.com/placeholder.jpg",
          unitCents: l.unitCents,
          quantity: l.quantity,
          lineCents: l.unitCents * l.quantity,
        })),
      },
    },
    select: { id: true, seq: true },
  });
  return db.order.update({
    where: { id: created.id },
    data: { number: `SSH-${1000 + created.seq}` },
  });
}

// --- tests ------------------------------------------------------------------

async function main() {
  if (!WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set (any value) and match the dev server");
  }
  const ping = await fetch(`${BASE}/api/cart`).catch(() => null);
  if (!ping?.ok) throw new Error(`Dev server is not responding at ${BASE}`);

  section("Server-side pricing");
  {
    const product = await makeProduct(1999, 10);
    const s = new Session();

    // The API takes no price at all, so a tampered payload cannot change it.
    const res = await s.request("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId: product.id, quantity: 2, unitCents: 1, priceCents: 1 }),
    });
    const cart = (await res.json()) as CartResponse;

    check("cart price comes from the database", cart.lines[0]?.unitCents === 1999,
      `got ${cart.lines[0]?.unitCents}`);
    check("subtotal recomputed server-side", cart.subtotalCents === 3998,
      `got ${cart.subtotalCents}`);
    check("shipping is free", cart.shippingCents === 0);
    check("total matches subtotal plus shipping", cart.totalCents === 3998);
  }

  section("Stock clamping");
  {
    const product = await makeProduct(500, 2);
    const s = new Session();
    const cart = await s.addToCart(product.id, 5);
    check("quantity clamped to available stock", cart.lines[0]?.quantity === 2,
      `got ${cart.lines[0]?.quantity}`);

    await db.product.update({ where: { id: product.id }, data: { stock: 0 } });
    const after = (await (await s.request("/api/cart")).json()) as CartResponse;
    check("sold-out line drops out of the cart", after.lines.length === 0);
    check("cart reports that it was adjusted", after.adjusted === true);
  }

  section("Webhook signature verification");
  {
    const product = await makeProduct(1500, 5);
    const s = new Session();
    await s.addToCart(product.id, 1);
    const ref = `cs_test_${TAG}_sig`;
    await pendingOrder(s.cartToken, [
      { productId: product.id, name: `${TAG} item`, slug: product.slug, unitCents: 1500, quantity: 1 },
    ], ref);

    const bad = await postStripeWebhook(
      stripeEvent(ref, "checkout.session.completed", `evt_${TAG}_bad`),
      { corrupt: true },
    );
    check("forged signature is rejected", bad.status === 400, `got ${bad.status}`);

    const wrongSecret = await postStripeWebhook(
      stripeEvent(ref, "checkout.session.completed", `evt_${TAG}_wrong`),
      { secret: "whsec_not_the_real_secret" },
    );
    check("signature from the wrong secret is rejected", wrongSecret.status === 400,
      `got ${wrongSecret.status}`);

    const order = await db.order.findUnique({ where: { providerRef: ref } });
    check("rejected webhook leaves the order PENDING", order?.status === "PENDING",
      `got ${order?.status}`);
    const stock = await db.product.findUnique({ where: { id: product.id } });
    check("rejected webhook does not touch stock", stock?.stock === 5, `got ${stock?.stock}`);
  }

  section("Successful payment");
  {
    const product = await makeProduct(2500, 4);
    const s = new Session();
    await s.addToCart(product.id, 3);
    const ref = `cs_test_${TAG}_ok`;
    const order = await pendingOrder(s.cartToken, [
      { productId: product.id, name: `${TAG} item`, slug: product.slug, unitCents: 2500, quantity: 3 },
    ], ref);

    const res = await postStripeWebhook(
      stripeEvent(ref, "checkout.session.completed", `evt_${TAG}_ok`),
    );
    check("valid webhook is accepted", res.status === 200, `got ${res.status}`);

    const paid = await db.order.findUnique({ where: { id: order.id } });
    check("order becomes PAID", paid?.status === "PAID", `got ${paid?.status}`);
    check("paidAt is recorded", paid?.paidAt instanceof Date);

    const after = await db.product.findUnique({ where: { id: product.id } });
    check("stock decremented by the ordered quantity", after?.stock === 1, `got ${after?.stock}`);

    const cart = (await (await s.request("/api/cart")).json()) as CartResponse;
    check("cart emptied after payment", cart.lines.length === 0);

    check("order number is human readable", /^SSH-\d{4,}$/.test(paid?.number ?? ""),
      paid?.number);
  }

  section("Replayed webhook (idempotency)");
  {
    const product = await makeProduct(1000, 6);
    const s = new Session();
    await s.addToCart(product.id, 2);
    const ref = `cs_test_${TAG}_dup`;
    const order = await pendingOrder(s.cartToken, [
      { productId: product.id, name: `${TAG} item`, slug: product.slug, unitCents: 1000, quantity: 2 },
    ], ref);

    const eventId = `evt_${TAG}_dup`;
    const first = await postStripeWebhook(stripeEvent(ref, "checkout.session.completed", eventId));
    const second = await postStripeWebhook(stripeEvent(ref, "checkout.session.completed", eventId));
    const third = await postStripeWebhook(stripeEvent(ref, "checkout.session.completed", eventId));

    check("first delivery accepted", first.status === 200);
    check("replays accepted without error", second.status === 200 && third.status === 200);
    const body = (await second.json()) as { duplicate?: boolean };
    check("replay reported as duplicate", body.duplicate === true);

    const after = await db.product.findUnique({ where: { id: product.id } });
    check("stock decremented exactly once", after?.stock === 4, `got ${after?.stock}`);

    const paid = await db.order.findUnique({ where: { id: order.id } });
    check("order still PAID once", paid?.status === "PAID");

    const events = await db.webhookEvent.count({ where: { eventId } });
    check("event recorded once", events === 1, `got ${events}`);
  }

  section("Distinct events for the same order");
  {
    const product = await makeProduct(800, 5);
    const s = new Session();
    await s.addToCart(product.id, 1);
    const ref = `cs_test_${TAG}_two`;
    await pendingOrder(s.cartToken, [
      { productId: product.id, name: `${TAG} item`, slug: product.slug, unitCents: 800, quantity: 1 },
    ], ref);

    await postStripeWebhook(stripeEvent(ref, "checkout.session.completed", `evt_${TAG}_two_a`));
    // A different event id, same order: the status guard must still hold.
    await postStripeWebhook(stripeEvent(ref, "checkout.session.completed", `evt_${TAG}_two_b`));

    const after = await db.product.findUnique({ where: { id: product.id } });
    check("stock decremented once despite two distinct events", after?.stock === 4,
      `got ${after?.stock}`);
  }

  section("Overselling");
  {
    const product = await makeProduct(1200, 3);
    const s = new Session();
    await s.addToCart(product.id, 3);
    const ref = `cs_test_${TAG}_oversell`;
    const order = await pendingOrder(s.cartToken, [
      { productId: product.id, name: `${TAG} item`, slug: product.slug, unitCents: 1200, quantity: 3 },
    ], ref);

    // Stock disappears between checkout starting and the webhook landing.
    await db.product.update({ where: { id: product.id }, data: { stock: 1 } });

    const res = await postStripeWebhook(
      stripeEvent(ref, "checkout.session.completed", `evt_${TAG}_oversell`),
    );
    check("webhook still accepted", res.status === 200);

    const paid = await db.order.findUnique({ where: { id: order.id } });
    check("paid order is honoured, not silently dropped", paid?.status === "PAID");
    check("order flagged for manual handling", paid?.note?.includes("OVERSOLD") === true,
      paid?.note ?? "no note");

    const after = await db.product.findUnique({ where: { id: product.id } });
    check("stock never goes negative", (after?.stock ?? -1) >= 0, `got ${after?.stock}`);
  }

  section("Failed and expired payments");
  {
    const product = await makeProduct(900, 5);
    const s = new Session();
    await s.addToCart(product.id, 1);
    const ref = `cs_test_${TAG}_expired`;
    const order = await pendingOrder(s.cartToken, [
      { productId: product.id, name: `${TAG} item`, slug: product.slug, unitCents: 900, quantity: 1 },
    ], ref);

    await postStripeWebhook({
      ...stripeEvent(ref, "checkout.session.expired", `evt_${TAG}_expired`),
      data: { object: { id: ref, object: "checkout.session", status: "expired" } },
    });

    const cancelled = await db.order.findUnique({ where: { id: order.id } });
    check("expired checkout cancels the order", cancelled?.status === "CANCELLED",
      `got ${cancelled?.status}`);

    const after = await db.product.findUnique({ where: { id: product.id } });
    check("failed payment does not consume stock", after?.stock === 5, `got ${after?.stock}`);

    const cart = (await (await s.request("/api/cart")).json()) as CartResponse;
    check("cart survives a failed payment", cart.lines.length === 1, `got ${cart.lines.length}`);
  }

  section("Unknown and unsigned deliveries");
  {
    const unknown = await postStripeWebhook(
      stripeEvent(`cs_test_${TAG}_nonexistent`, "checkout.session.completed", `evt_${TAG}_unknown`),
    );
    check("unknown session is acknowledged, not retried forever", unknown.status === 200,
      `got ${unknown.status}`);

    const unsigned = await fetch(`${BASE}/api/webhooks/stripe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "evt_none", type: "checkout.session.completed" }),
    });
    check("missing signature header is rejected", unsigned.status === 400,
      `got ${unsigned.status}`);

    const paypalUnsigned = await fetch(`${BASE}/api/webhooks/paypal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: randomUUID(), event_type: "PAYMENT.CAPTURE.COMPLETED" }),
    });
    check("PayPal rejects unsigned deliveries", paypalUnsigned.status === 400,
      `got ${paypalUnsigned.status}`);

    const badProvider = await fetch(`${BASE}/api/webhooks/bitcoin`, {
      method: "POST",
      body: "{}",
    });
    check("unknown provider route is 404", badProvider.status === 404,
      `got ${badProvider.status}`);
  }

  section("Order privacy");
  {
    const order = await db.order.findFirst({
      where: { email: { contains: TAG } },
      select: { number: true, accessToken: true },
    });
    if (order) {
      const noToken = await fetch(`${BASE}/orders/${order.number}`);
      check("confirmation page needs the token", noToken.status === 404,
        `got ${noToken.status}`);

      const wrongToken = await fetch(`${BASE}/orders/${order.number}?t=${"0".repeat(32)}`);
      check("wrong token is refused", wrongToken.status === 404, `got ${wrongToken.status}`);

      const right = await fetch(`${BASE}/orders/${order.number}?t=${order.accessToken}`);
      check("correct token is accepted", right.status === 200, `got ${right.status}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await db.$disconnect();
  });
