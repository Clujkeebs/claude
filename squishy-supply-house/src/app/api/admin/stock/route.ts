import { NextRequest } from "next/server";
import { NotFoundError, setStock } from "@/lib/admin-products";
import { checkApiToken, unauthorized } from "@/lib/auth";
import { stockUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!checkApiToken(req.headers.get("authorization"))) return unauthorized();

  const parsed = stockUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }

  try {
    const product = await setStock(parsed.data);
    return Response.json({
      product: { id: product.id, name: product.name, stock: product.stock },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
