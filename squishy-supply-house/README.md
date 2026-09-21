# Squishy Supply House by Clujkeebs

A dropshipping storefront: Next.js 16, Postgres, Stripe and PayPal behind one
interface, and an MCP server so products can be listed by talking to Claude.

- Design system: [`DESIGN.md`](./DESIGN.md)
- Off-site SEO work: [`SEO.md`](./SEO.md)
- Values to fill in before launch: [`PLACEHOLDERS.md`](./PLACEHOLDERS.md)
- Pre-launch checklist: [`CHECKLIST.md`](./CHECKLIST.md)

---

## Quick start

```bash
npm install
cp .env.example .env          # then fill in the values below
npm run db:migrate            # creates the schema
npm run dev                   # http://localhost:3000
```

You need a Postgres database. Locally, anything works:

```bash
createdb squishy
# DATABASE_URL="postgresql://postgres@127.0.0.1:5432/squishy?schema=public"
```

Generate the three required secrets:

```bash
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 24   # ADMIN_API_TOKEN
openssl rand -hex 16   # ADMIN_SETUP_TOKEN
```

The catalogue starts empty by design. To click through the storefront with
sample data:

```bash
npm run seed:demo             # adds six obviously-fake "DEMO" products
npm run seed:demo -- --clear  # removes them again
```

The seed refuses to run when `NODE_ENV=production` or when `DATABASE_URL` does
not look local.

---

## Environment variables

Every variable is documented in [`.env.example`](./.env.example). The ones the
app will not start without:

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Postgres connection. Railway injects it automatically. |
| `SESSION_SECRET` | Signs the admin session cookie. 32+ chars. |
| `ADMIN_API_TOKEN` | Bearer token for the admin API and MCP server. 24+ chars. |
| `ADMIN_SETUP_TOKEN` | Required once, to create the first admin account. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin. No trailing slash. |

Everything else has a working default. Without `RESEND_API_KEY` the app logs
emails to the console instead of sending them, so nothing breaks in development.

---

## Creating your admin account

There are no default credentials anywhere in the code. The first account is
created once, in the browser:

1. Deploy the app and visit `/admin/setup`.
2. Enter your email, a password of at least 12 characters, and the
   `ADMIN_SETUP_TOKEN` value from your environment variables.
3. You are signed in and redirected to `/admin`.

After that first account exists, `/admin/setup` permanently redirects to the
sign-in page, so nobody else can claim the store. To add another administrator
later, insert a row in `AdminUser` with a bcrypt hash, or temporarily delete the
existing rows and re-run setup.

Passwords are hashed with bcrypt (cost 12). Sign-in is rate limited to 8
attempts per IP per 15 minutes, and a wrong email costs the same amount of time
as a wrong password so the response cannot be used to enumerate accounts.

---

## Adding products

**In the admin UI** — `/admin/products` has a four-field form at the top: image
URL, name, price, stock. The slug is generated from the name. Everything else
(description, alt text, supplier cost, extra images) is optional and lives on
the per-product edit page. Stock and visibility are editable inline; rows can be
reordered by dragging or with the arrow buttons.

**By talking to Claude** — see the MCP section below.

**Product images** are URLs, not uploads. Because supplier CDNs vary, the image
optimizer only accepts an allowlist of hosts. Common AliExpress and Cloudinary
hosts are allowed out of the box; add more with the `IMAGE_HOSTS` variable
(comma separated). An image URL that later dies renders a neutral placeholder
rather than a broken image.

---

## Payments

Both providers are implemented behind one interface
(`src/lib/payments/types.ts`). Switching is an environment change, not a code
change:

```bash
PAYMENT_PROVIDER=stripe   # or paypal
```

### Stripe

1. Get test keys from the Stripe dashboard (`sk_test_…`).
2. Set `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint pointing at `https://YOUR_DOMAIN/api/webhooks/stripe`
   and subscribe to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired` and
   `charge.refunded`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### PayPal

1. Create a sandbox app at developer.paypal.com.
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENV=sandbox`.
3. Add a webhook pointing at `https://YOUR_DOMAIN/api/webhooks/paypal`,
   subscribed to `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`,
   `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`.
4. Copy the webhook id into `PAYPAL_WEBHOOK_ID`.

### Going live

Swap the test keys for live ones, set `PAYPAL_ENV=live`, recreate the webhooks
against your production domain, and update `NEXT_PUBLIC_SITE_URL`. Nothing else
changes.

### How money is handled

- **Totals are recalculated server-side** from the database at checkout. The
  browser never sends a price, and the cart API has no price field to tamper
  with.
- **An order is only marked paid after a signature-verified webhook**, or after
  a server-to-server confirmation call to the provider. The redirect back from
  the payment page proves nothing and is never trusted.
- **Webhooks are idempotent.** Each provider event id is recorded before any
  effect is applied, so a replayed delivery is a no-op. If the handler throws,
  the record is removed so the provider's retry is not mistaken for a duplicate.
- **Stock is decremented conditionally** (`WHERE stock >= quantity`), so it can
  never go negative. If stock vanished between checkout and payment, the order
  is still honoured, flagged `OVERSOLD` in the admin, and you get an email
  telling you to refund or restock.
- **A failed or expired payment leaves the cart alone** so the customer can
  simply try again.

---

## MCP server

`mcp/` is a small stdio MCP server wrapping the admin API. Point your client at
it:

```json
{
  "mcpServers": {
    "squishy-supply-house": {
      "command": "node",
      "args": ["/absolute/path/to/squishy-supply-house/mcp/index.js"],
      "env": {
        "SQUISHY_API_URL": "https://YOUR_DOMAIN",
        "SQUISHY_ADMIN_TOKEN": "the same value as ADMIN_API_TOKEN"
      }
    }
  }
}
```

Run `npm install` inside `mcp/` once first.

Tools: `create_product`, `update_product`, `list_products`, `update_stock`,
`delete_product`, `list_orders`.

With that connected you can say things like *"add a pink axolotl squishy for $14
with this image URL, 8 in stock"* and it gets created. The server holds no
business logic — it calls the same endpoints the admin UI uses, which validate
against the same Zod schemas in `src/lib/validation.ts`.

---

## Deployment (Railway)

The app is already configured for Railway via [`railway.json`](./railway.json).

1. Create a project and add a Postgres database.
2. Create a service from this repository. **Set the service's root directory to
   `squishy-supply-house`** — the app lives in a subdirectory.
3. Set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}` so it tracks the database
   service.
4. Set the rest of the variables from `.env.example`.
5. Generate a domain and put it in `NEXT_PUBLIC_SITE_URL`.

Migrations run on start (`prisma migrate deploy`), so a deploy can never serve a
schema it does not have. The healthcheck at `/api/health` fails closed when
Postgres is unreachable, so a broken deploy will not replace a working one.

### Railway specifics worth knowing

Three things about Railway shaped how this app is configured. All three cost a
failed deploy to find.

**The private network is not available during builds.** `postgres.railway.internal`
only resolves at runtime, so nothing can query the database at build time. That
is why the home page and sitemap render per request and `generateStaticParams`
returns an empty array — product pages are still cached, just generated on first
request instead of during the build.

**`.next/cache` persists between builds.** Turbopack's build cache lives in
`.next/cache/turbopack`, which Railway mounts as a persistent volume. A cache
written by a failed build gets reused by the next one and keeps reporting the
old error long after the cause is fixed, so
`experimental.turbopackFileSystemCacheForBuild` is disabled.

**Setting `NODE_ENV=production` makes `npm ci` skip devDependencies**, which
removes the Tailwind PostCSS plugin and the Prisma CLI that the build and start
commands need. `NIXPACKS_INSTALL_CMD` is set to `npm ci --include=dev` so the
install is complete regardless.

Also set `NIXPACKS_NODE_VERSION=22`. Nixpacks otherwise defaults to Node 18,
which Next 16 refuses to build on; `engines.node` in package.json documents the
same requirement for every other builder.

### Backups

Railway Postgres does not back up automatically on every plan. In the Postgres
service, open the **Backups** tab and enable scheduled backups. Before any
migration that drops or rewrites data, take a manual backup first. To dump
locally:

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
```

### Measured performance

Lighthouse mobile, median of five runs against a production build
(`next start`, simulated Slow 4G):

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 98 | 100 | 100 | 100 | 2.35s | 0 | 32ms |
| Shop | 98 | 100 | 100 | 100 | 2.43s | 0 | 39ms |
| Product | 98 | 100 | 100 | 100 | 2.36s | 0 | 31ms |

LCP sits close to the 2.5s line and individual runs range 2.2–2.9s, so treat it
as met-but-tight rather than comfortable. Measured against a real throttled
device profile (1.6Mbps, 4× CPU) the same LCP element lands at roughly 670ms —
the Lighthouse figure is its simulated critical path, not local slowness.

Three findings from that work are baked into the config:

- **AVIF is off.** With `formats: ["image/avif", "image/webp"]` the optimizer
  stopped answering entirely for any request carrying `Accept: image/avif` —
  which every browser sends. WebP encodes in about 80ms and saves nearly as
  much.
- **The app icon was 210KB.** Palette-quantised to 16KB. It was the single
  largest asset on the page.
- **Fraunces loads only its `SOFT` axis and is not preloaded.** All three axes
  doubled the file to 118KB on the critical path, for a display face that
  `display: swap` renders in a fallback anyway.

Re-run any of this yourself with `npm run build && npx next start -p 3100`, then
Lighthouse against `http://localhost:3100`.

### Performance notes

Product and policy pages are statically prerendered and revalidated every five
minutes; admin, cart, checkout and order pages are dynamic. Adding or editing a
product revalidates the affected paths immediately, so the storefront never
serves a stale price. Keep at least one replica warm — cold starts are the main
thing that will cost you on Largest Contentful Paint.

---

## Analytics

Off by default, which is why the site needs no cookie banner. To enable a
cookie-free tool such as Umami or Plausible:

```bash
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_SRC=https://your-analytics-host/script.js
NEXT_PUBLIC_ANALYTICS_WEBSITE_ID=your-site-id
```

If you switch to a tool that sets cookies or profiles visitors, you must update
the privacy policy and add a consent banner. Neither is included.

---

## Verification

Two harnesses, both run against a real server and a real database.

```bash
npm run dev            # in one terminal
npm run verify         # in another
```

`npm run verify:payments` (38 checks) covers the money paths without needing
live credentials: it signs webhook payloads exactly as Stripe does and posts
them to the real endpoint. It asserts forged signatures are rejected, replays do
not double-decrement stock, overselling is flagged rather than silently
dropped, expired checkouts do not consume stock, and order pages cannot be read
without their access token. It needs `STRIPE_WEBHOOK_SECRET` set to any value
that matches the running server.

`npm run verify:ui` (48 checks) drives Chromium through the buying flow and the
admin flow, checks all seven target viewport widths for horizontal overflow,
and asserts the accessibility and SEO basics. Screenshots land in `.verify/`.

---

## Project layout

```
src/app/            routes; (dashboard) is the authenticated admin group
src/components/     UI; admin/ is admin-only
src/content/        all customer-facing copy, FAQ and policy text
src/lib/            db, cart, orders, auth, email, validation
src/lib/payments/   PaymentProvider interface and the two adapters
prisma/             schema and committed migrations
mcp/                MCP server (its own package)
scripts/            verification harnesses and asset generation
```

---

## Decisions

Things that were decided during the build and are worth knowing.

**The app lives in a subdirectory of an unrelated repository.** A standalone
repo was the intent, but the GitHub App available during the build could not
create repositories (403). The code is self-contained, so splitting it out later
is one command:

```bash
git subtree split --prefix=squishy-supply-house -b storefront
# then push that branch to a new empty repo and point Railway at it
```

**Order numbers are sequential (`SSH-1001`) and therefore guessable.** The
confirmation page is gated on a random per-order access token, not the number,
so one customer cannot read another's address by incrementing a URL.

**Forms that submit via Server Actions use controlled inputs.** React 19 resets
an action form once the action settles; with uncontrolled fields a failed save
blanked everything the user had typed. This was found by driving the real
browser, not by reading the code.

**Sales tax is not calculated.** Prices are inclusive and the terms say so. If
you reach an economic-nexus threshold in any state you will need a tax service
(Stripe Tax or similar) — this is the most likely thing to need adding.

**Refunds are issued in Stripe or PayPal directly.** Marking an order refunded
in the admin records the status but deliberately does not restock the item,
because a refunded dropshipped item usually is not coming back.

**Rate limiting is database-backed.** Volume is low enough that a row per hit is
cheap, and it holds across restarts and replicas, which an in-memory counter
would not.

**Stock is not reserved at checkout.** An abandoned checkout would otherwise
hold stock hostage. The trade-off is handled at payment time by the conditional
decrement and the `OVERSOLD` flag described above.
