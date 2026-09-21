import { copy } from "@/content/copy";

/**
 * A plain GET form, so search works with JavaScript disabled and the result
 * page stays shareable and cacheable.
 */
export function SearchField({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/shop" method="get" role="search" className="flex gap-2">
      <div className="flex-1">
        <label htmlFor="shop-search" className="sr-only">
          {copy.shop.searchLabel}
        </label>
        <input
          id="shop-search"
          name="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          defaultValue={defaultValue}
          placeholder={copy.shop.searchPlaceholder}
          className="min-h-11 w-full rounded-[--radius-input] border border-border bg-surface px-4 text-plum-900 placeholder:text-muted/70"
        />
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-[--radius-input] bg-plum-700 px-5 font-medium text-white transition-colors hover:bg-plum-900"
      >
        Search
      </button>
    </form>
  );
}
