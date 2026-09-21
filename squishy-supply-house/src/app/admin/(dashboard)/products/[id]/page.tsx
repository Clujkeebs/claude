import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditForm } from "@/components/admin/ProductEditForm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">,
) {
  const { id } = await props.params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div className="container-prose">
      <Link
        href="/admin/products"
        className="text-sm text-muted underline underline-offset-4 hover:text-plum-900"
      >
        Back to products
      </Link>
      <h2 className="mt-4 text-2xl text-plum-900">{product.name}</h2>
      <p className="mt-1 text-sm text-muted">
        <Link
          href={`/products/${product.slug}`}
          className="underline underline-offset-4 hover:text-plum-900"
        >
          /products/{product.slug}
        </Link>
      </p>

      <div className="mt-8">
        <ProductEditForm
          product={{
            id: product.id,
            name: product.name,
            priceCents: product.priceCents,
            imageUrl: product.imageUrl,
            imageAlt: product.imageAlt,
            description: product.description,
            stock: product.stock,
            active: product.active,
            supplierUrl: product.supplierUrl,
            supplierCostCents: product.supplierCostCents,
            supplierNote: product.supplierNote,
          }}
        />
      </div>
    </div>
  );
}
