"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import {
  createProductAction,
  deleteProductAction,
  reorderAction,
  setStockAction,
  toggleActiveAction,
  type ActionState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "@/components/ProductImage";

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  supplierUrl: string | null;
  supplierCostCents: number | null;
};

export function ProductsAdmin({
  products,
  search,
}: {
  products: AdminProduct[];
  search: string;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  // Only held while a drag is in flight; otherwise the server order wins.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const dragFrom = useRef<number | null>(null);

  const rows = dragOrder
    ? dragOrder
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is AdminProduct => Boolean(p))
    : products;

  function run(fn: () => Promise<ActionState>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result);
      router.refresh();
    });
  }

  function commitOrder(next: AdminProduct[]) {
    setDragOrder(next.map((p) => p.id));
    startTransition(async () => {
      const result = await reorderAction(next.map((p) => p.id));
      setNotice(result);
      router.refresh();
      setDragOrder(null);
    });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    commitOrder(next);
  }

  return (
    <div className="flex flex-col gap-8">
      <QuickAdd onDone={(state) => { setNotice(state); router.refresh(); }} />

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

      <section aria-labelledby="catalogue">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 id="catalogue" className="text-xl text-plum-900">
            Catalogue
          </h2>
          <form action="/admin/products" method="get" role="search" className="flex gap-2">
            <label htmlFor="admin-search" className="sr-only">
              Search products
            </label>
            <input
              id="admin-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Search"
              className="min-h-11 rounded-[--radius-input] border border-border bg-surface px-4"
            />
            <button
              type="submit"
              className="min-h-11 rounded-[--radius-input] border border-border bg-surface px-4 text-sm font-medium hover:border-plum-500"
            >
              Search
            </button>
          </form>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-[--radius-card] border border-dashed border-border bg-surface px-5 py-10 text-center text-muted">
            {search ? "No products match that search." : "No products yet. Add one above."}
          </p>
        ) : (
          <ul
            className={cn(
              "divide-y divide-border rounded-[--radius-card] border border-border bg-surface",
              pending && "opacity-70",
            )}
          >
            {rows.map((product, index) => (
              <li
                key={product.id}
                draggable
                onDragStart={() => {
                  dragFrom.current = index;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragFrom.current;
                  dragFrom.current = null;
                  if (from === null || from === index) return;
                  const next = [...rows];
                  const [moved] = next.splice(from, 1);
                  next.splice(index, 0, moved!);
                  commitOrder(next);
                }}
                className="flex flex-wrap items-center gap-4 px-4 py-4"
              >
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    className="inline-flex size-6 items-center justify-center rounded text-muted hover:bg-plum-100 hover:text-plum-900 disabled:opacity-30"
                  >
                    <span className="sr-only">Move {product.name} up</span>
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1 || pending}
                    className="inline-flex size-6 items-center justify-center rounded text-muted hover:bg-plum-100 hover:text-plum-900 disabled:opacity-30"
                  >
                    <span className="sr-only">Move {product.name} down</span>
                    <span aria-hidden="true">↓</span>
                  </button>
                </div>

                <div className="relative size-14 shrink-0 overflow-hidden rounded-[--radius-input] border border-border">
                  <ProductImage
                    src={product.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-[10rem] flex-1">
                  <Link
                    href={`/products/${product.slug}`}
                    className="font-medium hover:underline hover:underline-offset-4"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatMoney(product.priceCents)}
                    {product.supplierCostCents !== null && (
                      <> · cost {formatMoney(product.supplierCostCents)}</>
                    )}
                    {product.supplierUrl && (
                      <>
                        {" · "}
                        <a
                          href={product.supplierUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline underline-offset-2"
                        >
                          supplier
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <StockField
                  product={product}
                  disabled={pending}
                  onCommit={(stock) => run(() => setStockAction(product.id, stock))}
                />

                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={product.active}
                    disabled={pending}
                    onChange={(e) =>
                      run(() => toggleActiveAction(product.id, e.target.checked))
                    }
                    className="size-4 accent-[--color-plum-700]"
                  />
                  Visible
                </label>

                <Link
                  href={`/admin/products/${product.id}`}
                  className="shrink-0 text-sm text-plum-700 underline underline-offset-4 hover:text-plum-900"
                >
                  Edit
                </Link>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete ${product.name}? This cannot be undone.`)) return;
                    run(() => deleteProductAction(product.id));
                  }}
                  className="shrink-0 text-sm text-danger-700 underline underline-offset-4 disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StockField({
  product,
  disabled,
  onCommit,
}: {
  product: AdminProduct;
  disabled: boolean;
  onCommit: (stock: number) => void;
}) {
  const id = `stock-${product.id}`;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted">
        Stock
      </label>
      <input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        defaultValue={product.stock}
        disabled={disabled}
        onBlur={(e) => {
          const value = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(value) || value < 0 || value === product.stock) {
            e.target.value = String(product.stock);
            return;
          }
          onCommit(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={cn(
          "min-h-11 w-20 rounded-[--radius-input] border bg-surface px-3 text-center tabular-nums",
          product.stock === 0 ? "border-danger-700/40" : "border-border",
        )}
      />
    </div>
  );
}

const emptyDraft = { imageUrl: "", name: "", price: "", stock: "1" };

function QuickAdd({ onDone }: { onDone: (state: ActionState) => void }) {
  // Controlled because React 19 clears an action form once the action settles,
  // which would otherwise throw away a typed-out product on a validation error.
  const [draft, setDraft] = useState(emptyDraft);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createProductAction(prev, formData);
      if (result?.success) setDraft(emptyDraft);
      onDone(result);
      return result;
    },
    null,
  );

  const set = (key: keyof typeof emptyDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const field =
    "min-h-12 w-full rounded-[--radius-input] border border-border bg-surface px-4 focus:border-plum-500";

  return (
    <section aria-labelledby="quick-add">
      <h2 id="quick-add" className="text-xl text-plum-900">
        Add a product
      </h2>
      <p className="mt-1 text-sm text-muted">
        Image URL, name and price are all that is required. The slug is generated from
        the name.
      </p>

      <form
        action={action}
        className="mt-5 grid gap-4 rounded-[--radius-card] border border-border bg-surface p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_7rem_6rem_auto] md:items-end"
      >
        <div>
          <label htmlFor="qa-image" className="mb-1.5 block text-sm font-medium">
            Image URL
          </label>
          <input
            id="qa-image"
            value={draft.imageUrl}
            onChange={set("imageUrl")}
            name="imageUrl"
            type="url"
            inputMode="url"
            required
            placeholder="https://ae01.alicdn.com/..."
            className={field}
          />
        </div>
        <div>
          <label htmlFor="qa-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <input id="qa-name"
            value={draft.name}
            onChange={set("name")} name="name" required className={field} />
        </div>
        <div>
          <label htmlFor="qa-price" className="mb-1.5 block text-sm font-medium">
            Price
          </label>
          <input
            id="qa-price"
            value={draft.price}
            onChange={set("price")}
            name="price"
            inputMode="decimal"
            required
            placeholder="14.00"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="qa-stock" className="mb-1.5 block text-sm font-medium">
            Stock
          </label>
          <input
            id="qa-stock"
            value={draft.stock}
            onChange={set("stock")}
            name="stock"
            type="number"
            min={0}
            inputMode="numeric"
            className={field}
          />
        </div>
        <Button type="submit" loading={pending} loadingLabel="Adding" className="md:h-12">
          Add
        </Button>

        {state?.error && (
          <p role="alert" className="text-sm text-danger-700 md:col-span-5">
            {state.error}
          </p>
        )}
      </form>
    </section>
  );
}
