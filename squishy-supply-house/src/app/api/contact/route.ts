import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendContactMessage } from "@/lib/email";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { contactSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limit = await rateLimit(`contact:${await clientIp()}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = contactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "Check the highlighted fields.",
        fields: Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      },
      { status: 400 },
    );
  }

  const { website, ...message } = parsed.data;
  // A filled honeypot is a bot. Answer as if it worked so it stops retrying.
  if (website) return Response.json({ ok: true });

  await db.contactMessage.create({ data: message });
  await sendContactMessage(message).catch((err) =>
    console.error("[contact] notification failed", err),
  );

  return Response.json({ ok: true });
}
