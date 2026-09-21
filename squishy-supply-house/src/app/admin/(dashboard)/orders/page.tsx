import Link from "next/link";
import { OrdersAdmin } from "@/components/admin/OrdersAdmin";
import { listOrdersAdmin } from "@/lib/admin-products";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"] as const;

function isStatus(value: unknown): value is (typeof STATUSES)[number] {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const { status } = await props.searchParams;
  const active = isStatus(status) ? status : undefined;

  const { items, total } = await listOrdersAdmin({
    status: active,
    limit: 50,
    offset: 0,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl text-plum-900">
          Orders <span className="text-base font-normal text-muted">({total})</span>
        </h2>
        <nav aria-label="Filter by status">
          <ul className="flex flex-wrap gap-1">
            <li>
              <FilterLink href="/admin/orders" label="All" active={!active} />
            </li>
            {STATUSES.map((s) => (
              <li key={s}>
                <FilterLink
                  href={`/admin/orders?status=${s}`}
                  label={s.charAt(0) + s.slice(1).toLowerCase()}
                  active={active === s}
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <OrdersAdmin
        orders={items.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          provider: o.provider,
          email: o.email,
          placedAt: o.createdAt.toISOString(),
          totalCents: o.totalCents,
          note: o.note,
          shipTo: {
            name: o.shippingName,
            line1: o.shippingLine1,
            line2: o.shippingLine2,
            city: o.shippingCity,
            state: o.shippingState,
            postalCode: o.shippingPostalCode,
          },
          items: o.items,
        }))}
      />
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex min-h-11 items-center rounded-[--radius-input] bg-plum-700 px-4 text-sm font-medium text-white"
          : "inline-flex min-h-11 items-center rounded-[--radius-input] px-4 text-sm text-muted hover:bg-plum-100 hover:text-plum-900"
      }
    >
      {label}
    </Link>
  );
}
