import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { copy } from "@/content/copy";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { getProductBySlug, listProductSlugs } from "@/lib/products";
import { site } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listProductSlugs().catch(() => []);
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };

  const description =
    product.description?.slice(0, 155) ??
    `${product.name} from ${site.shortName}. ${formatMoney(product.priceCents)}, free shipping in the US.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — ${site.shortName}`,
      description,
      url: `${siteUrl()}/products/${product.slug}`,
      images: [{ url: product.imageUrl, alt: product.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ${site.shortName}`,
      description,
      images: [product.imageUrl],
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const soldOut = product.stock <= 0;
  const url = `${siteUrl()}/products/${product.slug}`;
  const images = [product.imageUrl, ...product.extraImages].slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description: product.description ?? undefined,
        image: images,
        sku: product.id,
        brand: { "@type": "Brand", name: site.shortName },
        offers: {
          "@type": "Offer",
          url,
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: "USD",
          availability: soldOut
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": `${siteUrl()}/#organization` },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "0.00",
              currency: "USD",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "US",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 1,
                maxValue: 3,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 10,
                maxValue: 20,
                unitCode: "DAY",
              },
            },
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
          { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl()}/shop` },
          { "@type": "ListItem", position: 3, name: product.name, item: url },
        ],
      },
    ],
  };

  return (
    <div className="container-page py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <li>
            <Link href="/" className="hover:text-plum-900">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/shop" className="hover:text-plum-900">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-plum-900">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[--radius-frame] border border-border bg-surface">
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 560px, 92vw"
              className="object-cover"
            />
          </div>
          {product.extraImages.length > 0 && (
            <ul className="mt-4 grid grid-cols-4 gap-3">
              {product.extraImages.slice(0, 4).map((src) => (
                <li
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-[--radius-card] border border-border bg-surface"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:pt-2">
          <h1 className="text-3xl text-plum-900">{product.name}</h1>

          <p className="font-display mt-4 text-2xl text-plum-900">
            {formatMoney(product.priceCents)}
          </p>

          <p className="mt-3 flex items-center gap-2 text-sm">
            {soldOut ? (
              <span className="font-medium text-danger-700">{copy.product.soldOut}</span>
            ) : product.stock <= 3 ? (
              <span className="font-medium text-pink-700">
                {copy.product.lowStock(product.stock)}
              </span>
            ) : (
              <span className="font-medium text-success-700">{copy.product.inStock}</span>
            )}
            <span aria-hidden="true" className="text-border">
              •
            </span>
            <span className="text-muted">{copy.common.freeShipping}</span>
          </p>

          <div className="mt-8">
            {soldOut ? (
              <div className="rounded-[--radius-card] border border-border bg-surface p-5">
                <p className="text-muted">{copy.product.soldOutBody}</p>
              </div>
            ) : (
              <AddToCart productId={product.id} stock={product.stock} name={product.name} />
            )}
          </div>

          <p className="mt-4 text-sm text-muted">{copy.product.shippingNote}</p>

          <div className="mt-10 border-t border-border pt-8">
            <h2 className="text-xl text-plum-900">{copy.product.descriptionHeading}</h2>
            <div className="mt-4 whitespace-pre-line text-muted">
              {product.description?.trim() || copy.product.noDescription}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
