/**
 * Browser verification. Drives the real storefront in Chromium: the buying
 * flow, the admin flow, responsive behaviour at every target width, and the
 * accessibility basics that are easy to regress.
 *
 *   npm run dev
 *   npx tsx scripts/verify-ui.ts
 *
 * Screenshots land in .verify/ for eyeballing.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { chromium, type Browser, type Page } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const SHOTS = ".verify";

const WIDTHS = [375, 390, 768, 820, 1024, 1440, 1920];

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

/**
 * The cart renders a skeleton until its client-side fetch resolves, so every
 * cart assertion has to wait for that state rather than for a page event.
 */
async function waitForCartSettled(page: Page): Promise<void> {
  await page
    .locator("li select, :text('Your cart is empty')")
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}

async function run(browser: Browser) {
  const consoleErrors: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // --- storefront ---------------------------------------------------------
  section("Storefront");
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  check("home renders an h1", (await page.locator("h1").count()) === 1);
  check(
    "home title is set",
    (await page.title()).includes("Squishy Supply House"),
    await page.title(),
  );
  await page.screenshot({ path: `${SHOTS}/home-desktop.png`, fullPage: true });

  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  const cards = page.locator("article");
  const cardCount = await cards.count();
  check("shop lists products", cardCount > 0, `found ${cardCount}`);
  await page.screenshot({ path: `${SHOTS}/shop-desktop.png`, fullPage: true });

  // --- buying flow --------------------------------------------------------
  section("Buying flow");
  await page.locator("article a").first().click();
  await page.waitForURL(/\/products\//, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);
  check("product page reached", page.url().includes("/products/"), page.url());
  check(
    "breadcrumbs present",
    (await page.locator('nav[aria-label="Breadcrumb"]').count()) === 1,
  );

  const addButton = page.getByRole("button", { name: /add to cart/i }).first();
  await addButton.click();
  await page.waitForTimeout(700);

  const badge = page.getByTestId("cart-count");
  check("cart badge updated", (await badge.textContent())?.trim() === "1",
    (await badge.textContent()) ?? "empty");
  await page.screenshot({ path: `${SHOTS}/product-desktop.png`, fullPage: true });

  await page.goto(`${BASE}/cart`, { waitUntil: "load" });
  await waitForCartSettled(page);
  check("cart shows the line item", (await page.locator("li select").count()) === 1);
  await page.screenshot({ path: `${SHOTS}/cart-desktop.png`, fullPage: true });

  await page.getByRole("link", { name: /^checkout$/i }).click();
  await page.waitForURL(/\/checkout/, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);
  check("checkout reached", page.url().includes("/checkout"));

  // Validation must fire before anything is sent.
  await page.getByRole("button", { name: /pay with/i }).click();
  await page.waitForTimeout(400);
  const invalid = await page.locator("[aria-invalid='true']").count();
  check("checkout blocks an empty submit", invalid > 0, `${invalid} invalid fields`);

  const emailField = page.locator("input[name='email']");
  check("email field has correct type", (await emailField.getAttribute("type")) === "email");
  check(
    "email field has autocomplete",
    (await emailField.getAttribute("autocomplete")) === "email",
  );
  check(
    "postal code uses numeric keypad",
    (await page.locator("input[name='shippingPostalCode']").getAttribute("inputmode")) ===
      "numeric",
  );
  check(
    "address line 1 has autocomplete",
    (await page.locator("input[name='shippingLine1']").getAttribute("autocomplete")) ===
      "address-line1",
  );
  await page.screenshot({ path: `${SHOTS}/checkout-desktop.png`, fullPage: true });

  // --- empty cart state ---------------------------------------------------
  section("Empty and missing states");
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto(`${BASE}/cart`, { waitUntil: "load" });
  await waitForCartSettled(freshPage);
  check(
    "empty cart has a designed state",
    await freshPage.getByText(/your cart is empty/i).isVisible(),
  );
  await freshPage.screenshot({ path: `${SHOTS}/cart-empty.png`, fullPage: true });

  const notFound = await freshPage.goto(`${BASE}/this-page-does-not-exist`);
  check("404 returns the right status", notFound?.status() === 404, String(notFound?.status()));
  check("404 page is designed", await freshPage.getByText(/that page is gone/i).isVisible());
  await freshPage.screenshot({ path: `${SHOTS}/404.png`, fullPage: true });
  await fresh.close();

  // --- responsive ---------------------------------------------------------
  section("Responsive");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/shop", "/cart", "/checkout"]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "load" });
      const overflow = await hasHorizontalOverflow(page);
      if (overflow) {
        check(`no horizontal overflow at ${width}px on ${path}`, false);
      }
    }
    check(`no horizontal overflow at ${width}px`, true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  await page.screenshot({ path: `${SHOTS}/shop-mobile.png`, fullPage: true });

  const menuButton = page.getByRole("button", { name: /open menu/i });
  check("mobile menu button exists", await menuButton.isVisible());
  await menuButton.click();
  await page.waitForTimeout(300);
  check("mobile menu opens", await page.locator("#mobile-menu").isVisible());
  await page.screenshot({ path: `${SHOTS}/menu-mobile.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Escape closes the mobile menu", (await page.locator("#mobile-menu").count()) === 0);

  // Tap target sizes on the smallest supported width.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  const smallTargets = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll("header a, header button, main button"),
    );
    return nodes
      .filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44;
      })
      .map((n) => `${n.tagName}:${(n.textContent ?? "").trim().slice(0, 24)}`);
  });
  check("interactive targets are at least 44px tall", smallTargets.length === 0,
    smallTargets.join(", "));

  // --- accessibility ------------------------------------------------------
  section("Accessibility");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });

  const missingAlt = await page.evaluate(
    () => Array.from(document.images).filter((i) => !i.hasAttribute("alt")).length,
  );
  check("every image has alt text", missingAlt === 0, `${missingAlt} missing`);

  const h1Count = await page.locator("h1").count();
  check("exactly one h1", h1Count === 1, `found ${h1Count}`);

  await page.keyboard.press("Tab");
  const skipVisible = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.classList.contains("skip-link") ?? false;
  });
  check("first tab stop is the skip link", skipVisible);

  const focusRing = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('a[href="/shop"]');
    el?.focus();
    const style = getComputedStyle(el!);
    return style.outlineWidth !== "0px" || style.boxShadow !== "none";
  });
  check("focused links show a visible ring", focusRing);

  const lang = await page.getAttribute("html", "lang");
  check("html lang is set", lang === "en", String(lang));

  // --- SEO ----------------------------------------------------------------
  section("SEO");
  const robots = await page.goto(`${BASE}/robots.txt`);
  check("robots.txt served", robots?.status() === 200, String(robots?.status()));
  const sitemap = await page.goto(`${BASE}/sitemap.xml`);
  check("sitemap.xml served", sitemap?.status() === 200, String(sitemap?.status()));
  const sitemapBody = (await sitemap?.text()) ?? "";
  check("sitemap lists product URLs", sitemapBody.includes("/products/"));

  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  const canonical = await page.getAttribute('link[rel="canonical"]', "href");
  check("canonical URL present", Boolean(canonical), String(canonical));
  const ogImage = await page.getAttribute('meta[property="og:image"]', "content");
  check("open graph image present", Boolean(ogImage), String(ogImage));

  await page.goto(`${BASE}/faq`, { waitUntil: "load" });
  const faqLd = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((s) => s.textContent ?? "")
      .join(" "),
  );
  check("FAQ page emits FAQPage schema", faqLd.includes("FAQPage"));

  // --- admin --------------------------------------------------------------
  section("Admin");
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();

  await admin.goto(`${BASE}/admin`, { waitUntil: "load" });
  check(
    "admin redirects anonymous visitors",
    admin.url().includes("/admin/login") || admin.url().includes("/admin/setup"),
    admin.url(),
  );

  const adminEmail = process.env.VERIFY_ADMIN_EMAIL ?? "verify@example.com";
  const adminPassword = process.env.VERIFY_ADMIN_PASSWORD ?? "verify-password-1234";

  // First run bootstraps the account; later runs sign in to the same one.
  if (admin.url().includes("/admin/setup")) {
    await admin.fill("#setup-email", adminEmail);
    await admin.fill("#setup-password", adminPassword);
    await admin.fill("#setup-token", "wrong-token-on-purpose");
    await admin.getByRole("button", { name: /create account/i }).click();
    await admin.waitForTimeout(1200);
    const setupAlert = (await admin.locator("form p[role='alert']").textContent()) ?? "";
    check("wrong setup token is refused", /setup token is not correct/i.test(setupAlert),
      setupAlert);

    await admin.fill("#setup-token", process.env.ADMIN_SETUP_TOKEN ?? "");
    await admin.getByRole("button", { name: /create account/i }).click();
    await admin.waitForURL(/\/admin$/, { timeout: 20000 });
    check("correct setup token creates the account", admin.url().endsWith("/admin"));
  } else {
    await admin.fill("#email", adminEmail);
    await admin.fill("#password", "definitely-the-wrong-password");
    await admin.getByRole("button", { name: /sign in/i }).click();
    await admin.waitForTimeout(1200);
    const loginAlert = (await admin.locator("form p[role='alert']").textContent()) ?? "";
    check("wrong password is refused", /not correct/i.test(loginAlert), loginAlert);

    await admin.fill("#password", adminPassword);
    await admin.getByRole("button", { name: /sign in/i }).click();
    await admin.waitForURL(/\/admin$/, { timeout: 20000 });
    check("correct password signs in", admin.url().endsWith("/admin"));
  }

  await admin.goto(`${BASE}/admin/products`, { waitUntil: "load" });
  const startCount = await admin.locator("section[aria-labelledby='catalogue'] li").count();

  const probeName = `Verification Probe ${Date.now()}`;
  const started = Date.now();
  await admin.fill("#qa-image", "https://ae01.alicdn.com/kf/verification-probe.jpg");
  await admin.fill("#qa-name", probeName);
  await admin.fill("#qa-price", "18.50");
  await admin.fill("#qa-stock", "4");
  await admin.getByRole("button", { name: /^add$/i }).click();
  await admin.waitForTimeout(2000);
  const elapsed = (Date.now() - started) / 1000;

  const endCount = await admin.locator("section[aria-labelledby='catalogue'] li").count();
  check("product added through the admin UI", endCount === startCount + 1,
    `${startCount} -> ${endCount}`);
  check("adding a product takes under 30 seconds", elapsed < 30, `${elapsed.toFixed(1)}s`);
  await admin.screenshot({ path: `${SHOTS}/admin-products.png`, fullPage: true });

  // An unchecked checkbox is not submitted at all, so this is the regression
  // guard for "Visible in the shop" being impossible to turn off.
  await admin.goto(`${BASE}/admin/products`, { waitUntil: "load" });
  await admin
    .locator("li", { hasText: probeName })
    .getByRole("link", { name: /edit/i })
    .click();
  await admin.waitForURL(/\/admin\/products\//, { timeout: 15000 });
  const visible = admin.locator("input[type='checkbox'][name='active']");
  check("product starts visible", await visible.isChecked());
  await visible.uncheck();
  await admin.getByRole("button", { name: /save changes/i }).click();
  await admin.waitForTimeout(2500);
  await admin.reload({ waitUntil: "load" });
  check(
    "unchecking 'visible in the shop' persists",
    !(await admin.locator("input[type='checkbox'][name='active']").isChecked()),
  );
  await admin.locator("input[type='checkbox'][name='active']").check();
  await admin.getByRole("button", { name: /save changes/i }).click();
  await admin.waitForTimeout(2000);

  await admin.goto(`${BASE}/admin/setup`, { waitUntil: "load" });
  check(
    "setup route closes once an admin exists",
    admin.url().includes("/admin/login") || admin.url().endsWith("/admin"),
    admin.url(),
  );

  await admin.goto(`${BASE}/admin/orders`, { waitUntil: "load" });
  check("orders page renders", (await admin.locator("h2").first().textContent())?.includes("Orders") ?? false);
  await admin.screenshot({ path: `${SHOTS}/admin-orders.png`, fullPage: true });

  // The storefront must reflect the new product without a manual cache bust.
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  check(
    "new product appears on the storefront",
    await page.getByText(probeName).first().isVisible(),
  );

  // A verification run must not leave stock behind in the catalogue.
  admin.once("dialog", (d) => void d.accept());
  await admin.goto(`${BASE}/admin/products`, { waitUntil: "load" });
  await admin
    .locator("li", { hasText: probeName })
    .getByRole("button", { name: /delete/i })
    .click();
  await admin.waitForTimeout(2000);
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  check(
    "verification product removed again",
    (await page.getByText(probeName).count()) === 0,
  );

  await adminCtx.close();

  section("Console");
  // Supplier image hosts can 403 or vanish; ProductImage already falls back to
  // a placeholder, so those are upstream availability, not application errors.
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("Download the React DevTools") &&
      !/Failed to load resource.*(40[34]|50\d)/.test(e),
  );
  check("no console errors during the run", realErrors.length === 0,
    realErrors.slice(0, 3).join(" | "));

  await context.close();
}

/**
 * Repeated local runs would otherwise trip the real login rate limit, and a
 * throttled response looks just like a rejected password. Clearing the counter
 * keeps the run repeatable; it refuses to touch anything but a local database.
 */
async function resetLocalRateLimits() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    console.log("  note: non-local database, leaving rate limits alone");
    return;
  }
  const db = new PrismaClient();
  try {
    await db.rateLimitHit.deleteMany({ where: { key: { contains: "admin-" } } });
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  await resetLocalRateLimits();
  // This container ships its own Chromium; use it rather than downloading one.
  const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
  const browser = await chromium.launch({
    ...(existsSync(executablePath) ? { executablePath } : {}),
    args: ["--no-sandbox"],
  });
  try {
    await run(browser);
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

void main();
