"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderStatusAction, type ActionState } from "@/app/admin/actions";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

type AdminOrder = {
  id: string;
  number: string;
  status: string;
  provider: string;
  email: string;
  placedAt: string;
  totalCents: number;
  note: string | null;
  shipTo: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
  };
  items: { id: string; name: string; quantity: number; unitCents: number; lineCents: number }[];
};

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"];

const statusStyles: Record<string, string> = {
  PENDING: "bg-plum-100 text-plum-900",
  PAID: "bg-success-700/10 text-success-700",
  FULFILLED: "bg-blue-500/15 text-blue-700",
  CANCELLED: "bg-plum-100 text-muted",
  REFUNDED: "bg-danger-700/10 text-danger-700",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function OrdersAdmin({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <p className="rounded-[--radius-card] border border-dashed border-border bg-surface px-5 py-12 text-center text-muted">
        No orders here yet.
      </p>
    );
  }

  function changeStatus(id: string, status: string) {
    startTransition(async () => {
      const result = await setOrderStatusAction(id, status);
      setNotice(result);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-[--radius-card] border px-4 py-3 text-sm",
            notice.error
              ? "border-danger-700/30 bg-danger-700/5 text-danger-700"
              : "border-success-700/30 bg-success-700/5 text-success-700",
          )}
        >
          {notice.error ?? notice.success}
        </p>
      )}

      <ul
        className={cn(
          "divide-y divide-border rounded-[--radius-card] border border-border bg-surface",
          pending && "opacity-70",
        )}
      >
        {orders.map((order) => {
          const open = expanded === order.id;
          const flagged = order.note?.includes("OVERSOLD");
          return (
            <li key={order.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : order.id)}
                  aria-expanded={open}
                  className="font-medium text-plum-900 underline-offset-4 hover:underline"
                >
                  {order.number}
                </button>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    statusStyles[order.status] ?? "bg-plum-100",
                  )}
                >
                  {order.status}
                </span>

                <span className="text-sm text-muted">{order.provider}</span>

                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {order.email}
                </span>

                <span className="text-sm text-muted">
                  {dateFormat.format(new Date(order.placedAt))}
                </span>

                <span className="tabular-nums">{formatMoney(order.totalCents)}</span>

                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">Status for {order.number}</span>
                  <select
                    value={order.status}
                    disabled={pending}
                    onChange={(e) => changeStatus(order.id, e.target.value)}
                    className="min-h-11 rounded-[--radius-input] border border-border bg-surface px-3 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {flagged && (
                <p className="mt-3 rounded-[--radius-input] border border-danger-700/30 bg-danger-700/5 px-3 py-2 text-sm text-danger-700">
                  {order.note}
                </p>
              )}

              {open && (
                <div className="mt-4 grid gap-6 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold">Items</h3>
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4">
                          <span>
                            {item.quantity} × {item.name}
                          </span>
                          <span className="tabular-nums">
                            {formatMoney(item.lineCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Ship to</h3>
                    <address className="mt-2 text-sm not-italic text-muted">
                      {order.shipTo.name}
                      <br />
                      {order.shipTo.line1}
                      <br />
                      {order.shipTo.line2 && (
                        <>
                          {order.shipTo.line2}
                          <br />
                        </>
                      )}
                      {order.shipTo.city}, {order.shipTo.state} {order.shipTo.postalCode}
                    </address>
                    <p className="mt-3 text-sm">
                      <a
                        href={`mailto:${order.email}?subject=${encodeURIComponent(`Order ${order.number}`)}`}
                        className="text-plum-700 underline underline-offset-4"
                      >
                        Email customer
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-muted">
        Refunds are issued in Stripe or PayPal directly. Marking an order refunded here
        records it but does not restock the item — adjust stock on the product if you
        want it back on sale.
      </p>
    </div>
  );
}
