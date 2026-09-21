"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { EmptyState } from "@/components/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { checkoutSchema } from "@/lib/validation";
import { ProductImage } from "@/components/ProductImage";

type Fields = {
  email: string;
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  note: string;
};

const initial: Fields = {
  email: "",
  shippingName: "",
  shippingLine1: "",
  shippingLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingPostalCode: "",
  note: "",
};

export function CheckoutForm({
  payLabel,
  cancelled,
}: {
  payLabel: string;
  cancelled: boolean;
}) {
  const { cart, hydrated, refresh } = useCart();
  const [values, setValues] = useState<Fields>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof Fields>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateField(key: keyof Fields) {
    const result = checkoutSchema.safeParse(values);
    if (result.success) {
      setErrors((e) => ({ ...e, [key]: undefined }));
      return;
    }
    const issue = result.error.issues.find((i) => i.path[0] === key);
    setErrors((e) => ({ ...e, [key]: issue?.message }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = checkoutSchema.safeParse(values);
    if (!result.success) {
      const next: Partial<Record<keyof Fields, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Fields;
        next[key] ??= issue.message;
      }
      setErrors(next);
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const json = (await res.json()) as {
        redirectUrl?: string;
        error?: string;
        reason?: string;
      };

      if (res.ok && json.redirectUrl) {
        window.location.assign(json.redirectUrl);
        return;
      }

      if (json.reason === "stock") {
        await refresh();
        setFormError(copy.checkout.outOfStock);
      } else {
        setFormError(json.error ?? copy.checkout.failed);
      }
    } catch {
      setFormError(copy.checkout.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-[--radius-card] bg-plum-100" />;
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        heading={copy.cart.emptyHeading}
        body={copy.cart.emptyBody}
        action={<ButtonLink href="/shop">{copy.cart.emptyCta}</ButtonLink>}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14"
    >
      <div className="flex flex-col gap-10">
        {cancelled && (
          <p
            role="status"
            className="rounded-[--radius-card] border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-700"
          >
            Payment was cancelled. Nothing was charged and your cart is as you left it.
          </p>
        )}

        {formError && (
          <p
            role="alert"
            className="rounded-[--radius-card] border border-danger-700/30 bg-danger-700/5 px-4 py-3 text-sm text-danger-700"
          >
            {formError}
          </p>
        )}

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-xl text-plum-900">
            {copy.checkout.contactHeading}
          </legend>
          <Field
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            error={errors.email}
            onChange={(v) => set("email", v)}
            onBlur={() => validateField("email")}
            hint="The receipt goes here."
            required
          />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-xl text-plum-900">
            {copy.checkout.shippingHeading}
          </legend>

          <Field
            label="Full name"
            name="shippingName"
            autoComplete="name"
            value={values.shippingName}
            error={errors.shippingName}
            onChange={(v) => set("shippingName", v)}
            onBlur={() => validateField("shippingName")}
            required
          />
          <Field
            label="Street address"
            name="shippingLine1"
            autoComplete="address-line1"
            value={values.shippingLine1}
            error={errors.shippingLine1}
            onChange={(v) => set("shippingLine1", v)}
            onBlur={() => validateField("shippingLine1")}
            required
          />
          <Field
            label="Apartment, suite (optional)"
            name="shippingLine2"
            autoComplete="address-line2"
            value={values.shippingLine2}
            error={errors.shippingLine2}
            onChange={(v) => set("shippingLine2", v)}
          />

          <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
            <Field
              label="City"
              name="shippingCity"
              autoComplete="address-level2"
              value={values.shippingCity}
              error={errors.shippingCity}
              onChange={(v) => set("shippingCity", v)}
              onBlur={() => validateField("shippingCity")}
              required
            />
            <Field
              label="State"
              name="shippingState"
              autoComplete="address-level1"
              maxLength={2}
              placeholder="CA"
              value={values.shippingState}
              error={errors.shippingState}
              onChange={(v) => set("shippingState", v.toUpperCase())}
              onBlur={() => validateField("shippingState")}
              className="uppercase"
              required
            />
            <Field
              label="ZIP code"
              name="shippingPostalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="90210"
              value={values.shippingPostalCode}
              error={errors.shippingPostalCode}
              onChange={(v) => set("shippingPostalCode", v)}
              onBlur={() => validateField("shippingPostalCode")}
              required
            />
          </div>

          <p className="text-sm text-muted">{copy.checkout.usOnly}</p>

          <Field
            label={copy.checkout.note}
            name="note"
            placeholder={copy.checkout.notePlaceholder}
            value={values.note}
            error={errors.note}
            onChange={(v) => set("note", v)}
          />
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[--radius-card] border border-border bg-surface p-6">
          <h2 className="text-xl text-plum-900">{copy.checkout.summaryHeading}</h2>

          <ul className="mt-5 flex flex-col gap-4">
            {cart.lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[--radius-input] border border-border bg-surface">
                  <ProductImage
                    src={line.imageUrl}
                    alt={line.imageAlt}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-sm text-muted">Qty {line.quantity}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums">
                  {formatMoney(line.lineCents)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-sm">
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
            <div className="mt-1 flex justify-between border-t border-border pt-4 text-base">
              <dt className="font-medium">{copy.cart.total}</dt>
              <dd className="font-display text-xl tabular-nums">
                {formatMoney(cart.totalCents)}
              </dd>
            </div>
          </dl>

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="mt-6"
            loading={submitting}
            loadingLabel={copy.checkout.submitting}
          >
            {payLabel}
          </Button>

          <p className="mt-4 text-xs text-muted">{copy.checkout.securityNote}</p>
          <p className="mt-2 text-xs text-muted">
            <Link href="/policies/terms" className="underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/policies/returns" className="underline underline-offset-2">
              returns policy
            </Link>{" "}
            apply.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  className,
  ...rest
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "onBlur" | "value" | "name" | "className"
>) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-plum-900">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-pink-700">
            *
          </span>
        )}
      </label>
      <input
        {...rest}
        id={id}
        name={name}
        value={value}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "min-h-12 w-full rounded-[--radius-input] border bg-surface px-4 text-plum-900 transition-colors duration-150 placeholder:text-muted/60",
          error ? "border-danger-700" : "border-border focus:border-plum-500",
          className,
        )}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
