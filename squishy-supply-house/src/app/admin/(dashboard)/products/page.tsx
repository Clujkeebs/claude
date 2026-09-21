import { ProductsAdmin } from "@/components/admin/ProductsAdmin";
import { listProductsAdmin } from "@/lib/admin-products";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage(
  props: PageProps<"/admin/products">,
) {
  const { q } = await props.searchParams;
  const search = typeof q === "string" ? q : "";

  const { items } = await listProductsAdmin({
    search: search || undefined,
    includeInactive: true,
    limit: 100,
    offset: 0,
  });

  return (
    <ProductsAdmin
      search={search}
      products={items.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        stock: p.stock,
        active: p.active,
        supplierUrl: p.supplierUrl,
        supplierCostCents: p.supplierCostCents,
      }))}
    />
  );
}
