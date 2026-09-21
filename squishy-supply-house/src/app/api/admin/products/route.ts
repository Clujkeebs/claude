import { NextRequest } from "next/server";
import { checkApiToken, unauthorized } from "@/lib/auth";
import {
  createProduct,
  deleteProduct,
  listProductsAdmin,
  NotFoundError,
  updateProduct,
} from "@/lib/admin-products";
import {
  productCreateSchema,
  productDeleteSchema,
  productListSchema,
  productUpdateSchema,
} from "@/lib/validation";
import type { ZodType } from "zod";

export const dynamic = "force-dynamic";

function badRequest(issues: { path: (string | number | symbol)[]; message: string }[]) {
  return Response.json(
    {
      error: "Validation failed",
      details: issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
    },
    { status: 400 },
  );
}

async function parseBody<T>(req: NextRequest, schema: ZodType<T>) {
  const body = await req.json().catch(() => null);
  return schema.safeParse(body);
}

export async function GET(req: NextRequest) {
  if (!checkApiToken(req.headers.get("authorization"))) return unauthorized();

  const parsed = productListSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) return badRequest(parsed.error.issues);

  const { items, total } = await listProductsAdmin(parsed.data);
  return Response.json({ total, products: items });
}

export async function POST(req: NextRequest) {
  if (!checkApiToken(req.headers.get("authorization"))) return unauthorized();

  const parsed = await parseBody(req, productCreateSchema);
  if (!parsed.success) return badRequest(parsed.error.issues);

  const product = await createProduct(parsed.data);
  return Response.json({ product }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!checkApiToken(req.headers.get("authorization"))) return unauthorized();

  const parsed = await parseBody(req, productUpdateSchema);
  if (!parsed.success) return badRequest(parsed.error.issues);

  try {
    return Response.json({ product: await updateProduct(parsed.data) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkApiToken(req.headers.get("authorization"))) return unauthorized();

  const parsed = await parseBody(req, productDeleteSchema);
  if (!parsed.success) return badRequest(parsed.error.issues);

  try {
    const product = await deleteProduct(parsed.data);
    return Response.json({ deleted: { id: product.id, name: product.name } });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
