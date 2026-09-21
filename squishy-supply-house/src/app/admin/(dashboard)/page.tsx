import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [products, soldOut, hidden, paid, pending, needsAttention, revenue, recent] =
    await Promise.all([
      db.product.count(),
      db.product.count({ where: { stock: 0, active: true } }),
      db.product.count({ where: { active: false } }),
      db.order.count({ where: { status: "PAID" } }),
      db.order.count({ where: { status: "PENDING" } }),
      db.order.count({ where: { note: { contains: "OVERSOLD" } } }),
      db.order.aggregate({
        where: { status: { in: ["PAID", "FULFILLED"] } },
        _sum: { totalCents: true },
      }),
      db.order.findMany({
        where: { status: { in: ["PAID", "FULFILLED"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, email: true, totalCents: true, status: true },
      }),
    ]);

  const stats = [
    { label: "Products", value: String(products), href: "/admin/products" },
    { label: "Sold out", value: String(soldOut), href: "/admin/products" },
    { label: "Hidden", value: String(hidden), href: "/admin/products" },
    { label: "Awaiting fulfilment", value: String(paid), href: "/admin/orders?status=PAID" },
    {
      label: "Abandoned checkouts",
      value: String(pending),
      href: "/admin/orders?status=PENDING",
    },
    {
      label: "Revenue",
      value: formatMoney(revenue._sum.totalCents ?? 0),
      href: "/admin/orders",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      {needsAttention > 0 && (
        <p className="rounded-[--radius-card] border border-danger-700/30 bg-danger-700/5 px-4 py-3 text-sm text-danger-700">
          {needsAttention} order{needsAttention === 1 ? "" : "s"} could not reserve stock
          and need a refund or a restock.{" "}
          <Link href="/admin/orders" className="underline underline-offset-4">
            Review orders
          </Link>
        </p>
      )}

      <section aria-labelledby="stats">
        <h2 id="stats" className="sr-only">
          Store summary
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((stat) => (
            <li key={stat.label}>
              <Link
                href={stat.href}
                className="block rounded-[--radius-card] border border-border bg-surface p-5 transition-colors hover:border-plum-500"
              >
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="font-display mt-2 text-2xl text-plum-900 tabular-nums">
                  {stat.value}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent" className="text-xl text-plum-900">
          Recent paid orders
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 rounded-[--radius-card] border border-dashed border-border bg-surface px-5 py-8 text-center text-muted">
            No paid orders yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-[--radius-card] border border-border bg-surface">
            {recent.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <span className="font-medium">{order.number}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {order.email}
                </span>
                <span className="text-sm text-muted">{order.status}</span>
                <span className="tabular-nums">{formatMoney(order.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
