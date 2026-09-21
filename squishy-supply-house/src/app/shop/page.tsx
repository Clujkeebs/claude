import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductCard";
import { SearchField } from "@/components/SearchField";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { countActiveProducts, listProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop all squishies",
  description:
    "Every squishy currently in stock at Squishy Supply House by Clujkeebs. Free shipping on every order in the United States.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage(props: PageProps<"/shop">) {
  const { q } = await props.searchParams;
  const search = typeof q === "string" ? q.trim() : "";

  const [products, total] = await Promise.all([
    listProducts({ search: search || undefined }),
    countActiveProducts(),
  ]);

  // Search only earns its place once the catalogue is big enough to need it.
  const showSearch = total > 12 || search.length > 0;

  return (
    <div className="container-page py-12 md:py-16">
      <header className="mb-10 md:mb-12">
        <h1 className="rule-accent text-3xl text-plum-900">{copy.shop.heading}</h1>
        <p className="mt-4 max-w-xl text-muted">{copy.shop.intro}</p>
      </header>

      {showSearch && (
        <div className="mb-10 max-w-md">
          <SearchField defaultValue={search} />
          {search && (
            <p aria-live="polite" className="mt-3 text-sm text-muted">
              {copy.shop.resultCount(products.length, search)}
            </p>
          )}
        </div>
      )}

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : search ? (
        <EmptyState
          heading={copy.shop.noResultsHeading}
          body={copy.shop.noResultsBody}
          action={
            <ButtonLink href="/shop" variant="secondary">
              {copy.shop.clearSearch}
            </ButtonLink>
          }
        />
      ) : (
        <EmptyState
          heading={copy.shop.emptyHeading}
          body={copy.shop.emptyBody}
          action={
            <ButtonLink href="/contact" variant="secondary">
              Ask what is coming
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}
