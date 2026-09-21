import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductCard";
import { copy } from "@/content/copy";
import { listProducts } from "@/lib/products";
import { site } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${site.name} — slow-rise squishies, free shipping`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const products = await listProducts({ limit: 8 });

  return (
    <>
      <section className="container-page pt-14 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl text-plum-900">{copy.home.heroHeading}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{copy.home.heroBody}</p>
          <div className="mt-8">
            <ButtonLink href="/shop" size="lg">
              {copy.home.heroCta}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page pb-16 md:pb-24" aria-labelledby="in-stock">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="in-stock" className="rule-accent text-2xl text-plum-900">
            {copy.home.featuredHeading}
          </h2>
          {products.length > 0 && (
            <Link
              href="/shop"
              className="text-sm font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
            >
              {copy.home.featuredLink}
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <EmptyState
            heading={copy.shop.emptyHeading}
            body={copy.shop.emptyBody}
            action={
              <ButtonLink href="/contact" variant="secondary">
                Ask what is coming
              </ButtonLink>
            }
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </section>

      <section className="border-y border-border bg-surface">
        <div className="container-page grid gap-10 py-14 md:grid-cols-2 md:gap-16 md:py-20">
          <div>
            <h2 className="rule-accent text-2xl text-plum-900">
              {copy.home.aboutHeading}
            </h2>
            <p className="mt-5 text-muted">{copy.home.aboutBody}</p>
          </div>
          <div>
            <h2 className="rule-accent text-2xl text-plum-900">
              {copy.home.shippingHeading}
            </h2>
            <p className="mt-5 text-muted">{copy.home.shippingBody}</p>
            <Link
              href="/policies/shipping"
              className="mt-4 inline-block text-sm font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
            >
              Read the shipping policy
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
