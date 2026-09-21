"use client";

import { useActionState, useState } from "react";
import { updateProductAction, type ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type EditableProduct = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  imageAlt: string | null;
  description: string | null;
  stock: number;
  active: boolean;
  supplierUrl: string | null;
  supplierCostCents: number | null;
  supplierNote: string | null;
};

const field =
  "min-h-12 w-full rounded-[--radius-input] border border-border bg-surface px-4 focus:border-plum-500";

export function ProductEditForm({ product }: { product: EditableProduct }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProductAction,
    null,
  );

  // React 19 resets an action form after the action settles. Uncontrolled
  // fields would therefore blank out whenever a save failed validation.
  const [values, setValues] = useState({
    name: product.name,
    price: (product.priceCents / 100).toFixed(2),
    stock: String(product.stock),
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt ?? "",
    description: product.description ?? "",
    supplierUrl: product.supplierUrl ?? "",
    supplierCost:
      product.supplierCostCents !== null
        ? (product.supplierCostCents / 100).toFixed(2)
        : "",
    supplierNote: product.supplierNote ?? "",
  });
  const [active, setActive] = useState(product.active);

  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product.id} />

      {state && (
        <p
          role="status"
          className={cn(
            "rounded-[--radius-card] border px-4 py-3 text-sm",
            state.error
              ? "border-danger-700/30 bg-danger-700/5 text-danger-700"
              : "border-success-700/30 bg-success-700/5 text-success-700",
          )}
        >
          {state.error ?? state.success}
        </p>
      )}

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" value={values.name} onChange={set("name")} className={field} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="mb-1.5 block text-sm font-medium">
            Price
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            value={values.price}
            onChange={set("price")}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="stock" className="mb-1.5 block text-sm font-medium">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.stock}
            onChange={set("stock")}
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="imageUrl" className="mb-1.5 block text-sm font-medium">
          Image URL
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          inputMode="url"
          value={values.imageUrl}
          onChange={set("imageUrl")}
          className={field}
        />
        <p className="mt-1.5 text-sm text-muted">
          Must be https and on an allowed host. Add new hosts with the IMAGE_HOSTS
          environment variable.
        </p>
      </div>

      <div>
        <label htmlFor="imageAlt" className="mb-1.5 block text-sm font-medium">
          Image alt text
        </label>
        <input
          id="imageAlt"
          name="imageAlt"
          value={values.imageAlt}
          onChange={set("imageAlt")}
          placeholder={product.name}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          value={values.description}
          onChange={set("description")}
          className="w-full rounded-[--radius-input] border border-border bg-surface p-4 focus:border-plum-500"
        />
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-[--color-plum-700]"
        />
        Visible in the shop
      </label>

      <fieldset className="rounded-[--radius-card] border border-border p-5">
        <legend className="px-2 text-sm font-medium">
          Supplier (private, never shown to customers)
        </legend>
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="supplierUrl" className="mb-1.5 block text-sm font-medium">
              Supplier URL
            </label>
            <input
              id="supplierUrl"
              name="supplierUrl"
              type="url"
              inputMode="url"
              value={values.supplierUrl}
              onChange={set("supplierUrl")}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="supplierCost" className="mb-1.5 block text-sm font-medium">
              Unit cost
            </label>
            <input
              id="supplierCost"
              name="supplierCost"
              inputMode="decimal"
              value={values.supplierCost}
              onChange={set("supplierCost")}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="supplierNote" className="mb-1.5 block text-sm font-medium">
              Note
            </label>
            <textarea
              id="supplierNote"
              name="supplierNote"
              rows={3}
              value={values.supplierNote}
              onChange={set("supplierNote")}
              className="w-full rounded-[--radius-input] border border-border bg-surface p-4 focus:border-plum-500"
            />
          </div>
        </div>
      </fieldset>

      <div>
        <Button type="submit" size="lg" loading={pending} loadingLabel="Saving">
          Save changes
        </Button>
      </div>
    </form>
  );
}
