import Link from "next/link";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { ProductCardData } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";

const LOW_STOCK_AT = 3;

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const soldOut = product.stock <= 0;
  const low = !soldOut && product.stock <= LOW_STOCK_AT;

  return (
    <article className="group">
      <Link
        href={`/products/${product.slug}`}
        className="block rounded-[--radius-frame] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-700"
      >
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-[--radius-frame] border border-border bg-surface",
            "transition-[border-color,box-shadow] duration-150 group-hover:border-plum-500",
          )}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 276px, (min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw"
            className={cn(
              "object-cover transition-[filter,transform] duration-200",
              soldOut && "opacity-60 saturate-50",
            )}
          />
          {soldOut && (
            <span className="absolute top-3 left-3 rounded-full bg-plum-900/85 px-2.5 py-1 text-xs font-medium text-white">
              {copy.product.soldOut}
            </span>
          )}
          {low && (
            <span className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-pink-700 shadow-[--shadow-card]">
              {copy.product.lowStock(product.stock)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h3 className="text-base leading-snug font-medium text-plum-900 group-hover:underline group-hover:decoration-plum-500 group-hover:underline-offset-4">
            {product.name}
          </h3>
          <p className="font-display shrink-0 text-lg text-plum-900">
            {formatMoney(product.priceCents)}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
