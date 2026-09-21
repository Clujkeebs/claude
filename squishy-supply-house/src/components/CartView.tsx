"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart, type CartLine } from "@/components/CartProvider";
import { EmptyState } from "@/components/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { formatMoney } from "@/lib/money";

export function CartView() {
  const { cart, hydrated, pending, setQuantity, remove, add } = useCart();
  const [undo, setUndo] = useState<{ line: CartLine } | null>(null);

  if (!hydrated) return <CartSkeleton />;

  if (cart.lines.length === 0) {
    return (
      <>
        {undo && <UndoBar line={undo.line} onUndo={async () => {
          await add(undo.line.productId, undo.line.quantity);
          setUndo(null);
        }} onDismiss={() => setUndo(null)} />}
        <EmptyState
          heading={copy.cart.emptyHeading}
          body={copy.cart.emptyBody}
          action={<ButtonLink href="/shop">{copy.cart.emptyCta}</ButtonLink>}
        />
      </>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
      <div>
        {cart.adjusted && (
          <p
            role="status"
            className="mb-6 rounded-[--radius-card] border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-700"
          >
            {copy.cart.adjusted}
          </p>
        )}

        {undo && (
          <UndoBar
            line={undo.line}
            onUndo={async () => {
              await add(undo.line.productId, undo.line.quantity);
              setUndo(null);
            }}
            onDismiss={() => setUndo(null)}
          />
        )}

        <ul className="divide-y divide-border border-y border-border">
          {cart.lines.map((line) => (
            <li key={line.productId} className="flex gap-4 py-6">
              <Link
                href={`/products/${line.slug}`}
                className="relative size-24 shrink-0 overflow-hidden rounded-[--radius-card] border border-border bg-surface sm:size-28"
              >
                <Image
                  src={line.imageUrl}
                  alt={line.imageAlt}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.slug}`}
                    className="font-medium text-plum-900 hover:underline hover:underline-offset-4"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatMoney(line.unitCents)} each
                  </p>
                  {line.quantity >= line.stock && (
                    <p className="mt-1 text-sm text-pink-700">
                      {copy.product.lowStock(line.stock)}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-4">
                    <QuantitySelect
                      line={line}
                      disabled={pending}
                      onChange={(q) => setQuantity(line.productId, q)}
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={async () => {
                        setUndo({ line });
                        await remove(line.productId);
                      }}
                      className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-danger-700 disabled:opacity-50"
                    >
                      {copy.cart.remove}
                    </button>
                  </div>
                </div>

                <p className="font-display shrink-0 text-lg text-plum-900 tabular-nums">
                  {formatMoney(line.lineCents)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[--radius-card] border border-border bg-surface p-6">
          <h2 className="text-xl text-plum-900">Summary</h2>
          <dl className="mt-5 flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{copy.cart.subtotal}</dt>
              <dd className="tabular-nums">{formatMoney(cart.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{copy.cart.shipping}</dt>
              <dd className="tabular-nums">
                {cart.shippingCents === 0
                  ? copy.cart.shippingFree
                  : formatMoney(cart.shippingCents)}
              </dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-4 text-base">
              <dt className="font-medium">{copy.cart.total}</dt>
              <dd className="font-display text-xl tabular-nums">
                {formatMoney(cart.totalCents)}
              </dd>
            </div>
          </dl>

          <ButtonLink href="/checkout" size="lg" fullWidth className="mt-6">
            {copy.cart.checkout}
          </ButtonLink>

          <p className="mt-4 text-xs text-muted">{copy.cart.taxNote}</p>
        </div>
      </aside>
    </div>
  );
}

function QuantitySelect({
  line,
  disabled,
  onChange,
}: {
  line: CartLine;
  disabled: boolean;
  onChange: (quantity: number) => void;
}) {
  const options = Array.from({ length: Math.min(line.stock, 20) }, (_, i) => i + 1);
  const id = `qty-${line.productId}`;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {copy.cart.quantityLabel(line.name)}
      </label>
      <select
        id={id}
        value={line.quantity}
        disabled={disabled}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
        className="min-h-11 rounded-[--radius-input] border border-border bg-surface px-3 text-base disabled:opacity-50"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

function UndoBar({
  line,
  onUndo,
  onDismiss,
}: {
  line: CartLine;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="mb-6 flex items-center justify-between gap-4 rounded-[--radius-card] border border-border bg-plum-100 px-4 py-3 text-sm"
    >
      <span className="min-w-0 truncate">
        {copy.cart.removed}: {line.name}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onUndo}
          className="font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
        >
          {copy.cart.undo}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted hover:text-plum-900"
          aria-label="Dismiss"
        >
          ×
        </button>
      </span>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
      <div className="border-y border-border">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4 py-6">
            <div className="size-24 shrink-0 animate-pulse rounded-[--radius-card] bg-plum-100 sm:size-28" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 w-2/5 animate-pulse rounded bg-plum-100" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-plum-100" />
              <div className="h-11 w-24 animate-pulse rounded-[--radius-input] bg-plum-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[--radius-card] bg-plum-100" />
      <span className="sr-only">{copy.common.loading}</span>
    </div>
  );
}
