"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

export function AddToCart({
  productId,
  stock,
  name,
}: {
  productId: string;
  stock: number;
  name: string;
}) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry!.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (state !== "added") return;
    const t = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(t);
  }, [state]);

  async function handleAdd() {
    setState("adding");
    const ok = await add(productId, quantity);
    setState(ok ? "added" : "error");
  }

  const max = Math.min(stock, 99);

  return (
    <>
      <div ref={anchorRef} className="flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={quantity}
          max={max}
          onChange={setQuantity}
          label={`${copy.product.quantity} for ${name}`}
        />
        <Button
          onClick={handleAdd}
          loading={state === "adding"}
          loadingLabel={copy.product.adding}
          size="lg"
          className="min-w-48 flex-1 sm:flex-none"
        >
          {state === "added" ? (
            <>
              <CheckIcon />
              {copy.product.added}
            </>
          ) : (
            copy.product.addToCart
          )}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {state === "added"
          ? `${name} added to cart`
          : state === "error"
            ? "Could not add to cart"
            : ""}
      </p>

      {state === "error" && (
        <p className="mt-3 text-sm text-danger-700">
          That did not go through. {copy.common.tryAgain}.
        </p>
      )}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-paper/97 backdrop-blur-sm transition-transform duration-200 lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="container-page flex items-center gap-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <QuantityStepper
            value={quantity}
            max={max}
            onChange={setQuantity}
            label={`${copy.product.quantity} for ${name}`}
            compact
          />
          <Button
            onClick={handleAdd}
            loading={state === "adding"}
            loadingLabel={copy.product.adding}
            fullWidth
            tabIndex={showSticky ? 0 : -1}
            aria-hidden={!showSticky}
          >
            {state === "added" ? copy.product.added : copy.product.addToCart}
          </Button>
        </div>
      </div>
    </>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
  label,
  compact = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
  compact?: boolean;
}) {
  const clamp = (n: number) => Math.min(Math.max(n, 1), Math.max(max, 1));

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[--radius-input] border border-border bg-surface",
        compact ? "h-11" : "h-12",
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 1}
        className="inline-flex size-11 items-center justify-center rounded-l-[--radius-input] text-plum-900 transition-colors hover:bg-plum-100 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <span className="sr-only">Decrease quantity</span>
        <span aria-hidden="true" className="text-lg leading-none">
          −
        </span>
      </button>
      <label className="sr-only" htmlFor={`qty-${label}`}>
        {label}
      </label>
      <input
        id={`qty-${label}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number.parseInt(e.target.value, 10) || 1))}
        className="h-full w-12 border-x border-border bg-transparent text-center text-base font-medium tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="inline-flex size-11 items-center justify-center rounded-r-[--radius-input] text-plum-900 transition-colors hover:bg-plum-100 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <span className="sr-only">Increase quantity</span>
        <span aria-hidden="true" className="text-lg leading-none">
          +
        </span>
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        d="M3 8.5l3.2 3.2L13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
