import { timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { formatMoney } from "@/lib/money";
import { getOrderByNumber, markOrderPaid } from "@/lib/orders";
import { providerByName } from "@/lib/payments";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

function tokenMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function OrderPage(props: PageProps<"/orders/[number]">) {
  const [{ number }, { t }] = await Promise.all([props.params, props.searchParams]);
  const token = typeof t === "string" ? t : "";

  let order = await getOrderByNumber(decodeURIComponent(number));
  // Order numbers are sequential, so the token — not the number — is what
  // grants access.
  if (!order || !token || !tokenMatches(order.accessToken, token)) notFound();

  // The redirect back from the provider proves nothing. Ask the provider
  // directly, server to server, before showing this as paid.
  if (order.status === "PENDING" && order.providerRef) {
    try {
      const status = await providerByName(order.provider).confirmByRef(order.providerRef);
      if (status === "paid") {
        await markOrderPaid(order.provider, order.providerRef);
        order = (await getOrderByNumber(order.number)) ?? order;
      }
    } catch (err) {
      console.error("[order] confirmation check failed", err);
    }
  }

  const paid = order.status !== "PENDING" && order.status !== "CANCELLED";

  return (
    <div className="container-page py-12 md:py-16">
      {paid && <ClearCartOnMount />}

      <div className="container-prose">
        <header>
          <h1 className="rule-accent text-3xl text-plum-900">
            {paid ? copy.confirmation.heading : copy.confirmation.pendingHeading}
          </h1>
          <p className="mt-4 text-muted">
            {paid ? copy.confirmation.body : copy.confirmation.pendingBody}
          </p>
        </header>

        <section
          aria-label="Receipt"
          className="mt-10 rounded-[--radius-card] border border-border bg-surface p-6 md:p-8"
        >
          <dl className="flex flex-wrap justify-between gap-4 border-b border-border pb-5">
            <div>
              <dt className="text-sm text-muted">{copy.confirmation.orderNumber}</dt>
              <dd className="font-display mt-1 text-xl text-plum-900">{order.number}</dd>
            </div>
            <div className="text-right">
              <dt className="text-sm text-muted">{copy.confirmation.placed}</dt>
              <dd className="mt-1 text-sm">{dateFormat.format(order.createdAt)} UTC</dd>
            </div>
          </dl>

          <h2 className="mt-6 text-sm font-semibold tracking-wide uppercase">
            {copy.confirmation.items}
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[--radius-input] border border-border bg-surface">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-medium hover:underline hover:underline-offset-4"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted">
                    Qty {item.quantity} · {formatMoney(item.unitCents)} each
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">{formatMoney(item.lineCents)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{copy.cart.subtotal}</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{copy.cart.shipping}</dt>
              <dd className="tabular-nums">
                {order.shippingCents === 0
                  ? copy.cart.shippingFree
                  : formatMoney(order.shippingCents)}
              </dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-4 text-base">
              <dt className="font-medium">{copy.cart.total}</dt>
              <dd className="font-display text-xl tabular-nums">
                {formatMoney(order.totalCents)}
              </dd>
            </div>
          </dl>

          <h2 className="mt-8 text-sm font-semibold tracking-wide uppercase">
            {copy.confirmation.shipTo}
          </h2>
          <address className="mt-3 text-sm not-italic text-muted">
            {order.shippingName}
            <br />
            {order.shippingLine1}
            <br />
            {order.shippingLine2 && (
              <>
                {order.shippingLine2}
                <br />
              </>
            )}
            {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
          </address>

          <p className="mt-8 border-t border-border pt-5 text-sm text-muted">
            {copy.confirmation.support}
          </p>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href="/shop" variant="secondary">
            {copy.confirmation.continue}
          </ButtonLink>
          <a
            href={`mailto:${site.supportEmail}?subject=${encodeURIComponent(`Order ${order.number}`)}`}
            className="text-sm font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
          >
            Email about this order
          </a>
        </div>
      </div>
    </div>
  );
}
