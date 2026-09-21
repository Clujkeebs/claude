import { NextRequest } from "next/server";
import { listOrdersAdmin } from "@/lib/admin-products";
import { checkApiToken, unauthorized } from "@/lib/auth";
import { orderListSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkApiToken(req.headers.get("authorization"))) return unauthorized();

  const parsed = orderListSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }

  const { items, total } = await listOrdersAdmin(parsed.data);

  return Response.json({
    total,
    orders: items.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      provider: o.provider,
      email: o.email,
      placedAt: o.createdAt,
      totalCents: o.totalCents,
      note: o.note,
      shipTo: {
        name: o.shippingName,
        line1: o.shippingLine1,
        line2: o.shippingLine2,
        city: o.shippingCity,
        state: o.shippingState,
        postalCode: o.shippingPostalCode,
      },
      items: o.items,
    })),
  });
}
