import "server-only";

import { Resend } from "resend";
import { env, siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";

export type OrderEmailData = {
  number: string;
  accessToken: string;
  email: string;
  createdAt: Date;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  items: { name: string; quantity: number; unitCents: number; lineCents: number }[];
};

type Message = { to: string; subject: string; text: string; html: string };

let resend: Resend | null = null;

async function send(message: Message): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();

  if (!RESEND_API_KEY) {
    // Without a key the app stays functional and the email is inspectable.
    console.info(
      `[email] RESEND_API_KEY not set — skipping send.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
    );
    return;
  }

  resend ??= new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  // A failed receipt must never fail a paid order.
  if (error) console.error(`[email] send failed: ${error.message}`);
}

function orderUrl(o: OrderEmailData): string {
  return `${siteUrl()}/orders/${encodeURIComponent(o.number)}?t=${o.accessToken}`;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

function addressLines(o: OrderEmailData): string[] {
  return [
    o.shippingName,
    o.shippingLine1,
    ...(o.shippingLine2 ? [o.shippingLine2] : []),
    `${o.shippingCity}, ${o.shippingState} ${o.shippingPostalCode}`,
  ];
}

function receiptText(o: OrderEmailData): string {
  const lines = o.items.map(
    (i) => `  ${i.quantity} x ${i.name}  ${formatMoney(i.lineCents)}`,
  );
  return [
    `Order ${o.number}`,
    `Placed ${dateFormat.format(o.createdAt)}`,
    "",
    "Items",
    ...lines,
    "",
    `Subtotal  ${formatMoney(o.subtotalCents)}`,
    `Shipping  ${o.shippingCents === 0 ? "Free" : formatMoney(o.shippingCents)}`,
    `Total     ${formatMoney(o.totalCents)}`,
    "",
    "Ship to",
    ...addressLines(o).map((l) => `  ${l}`),
    "",
    "Orders ship from our supplier and usually arrive in 10 to 20 business days.",
    "",
    `View this order: ${orderUrl(o)}`,
    `Questions: ${site.supportEmail}`,
    "",
    site.name,
  ].join("\n");
}

function receiptHtml(o: OrderEmailData, heading: string, intro: string): string {
  const rows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e6dfea">
          ${escapeHtml(i.name)}<br>
          <span style="color:#6b5b75;font-size:13px">Qty ${i.quantity} &middot; ${formatMoney(i.unitCents)} each</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e6dfea;text-align:right;white-space:nowrap">
          ${formatMoney(i.lineCents)}
        </td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false) => `<tr>
      <td style="padding:6px 0;${strong ? "font-weight:600" : "color:#6b5b75"}">${label}</td>
      <td style="padding:6px 0;text-align:right;${strong ? "font-weight:600;font-size:17px" : "color:#6b5b75"}">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#fdfbf7;font-family:Helvetica,Arial,sans-serif;color:#2a1338;line-height:1.6">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6dfea;border-radius:14px;padding:32px">
    <h1 style="margin:0 0 8px;font-size:22px;color:#2a1338">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 24px;color:#6b5b75">${escapeHtml(intro)}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      <tr>
        <td style="padding:0 0 4px;color:#6b5b75;font-size:13px">Order number</td>
        <td style="padding:0 0 4px;text-align:right;font-weight:600">${escapeHtml(o.number)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 16px;color:#6b5b75;font-size:13px">Placed</td>
        <td style="padding:0 0 16px;text-align:right;color:#6b5b75;font-size:13px">${dateFormat.format(o.createdAt)}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse">${rows}</table>

    <table style="width:100%;border-collapse:collapse;margin-top:14px">
      ${totalRow("Subtotal", formatMoney(o.subtotalCents))}
      ${totalRow("Shipping", o.shippingCents === 0 ? "Free" : formatMoney(o.shippingCents))}
      ${totalRow("Total", formatMoney(o.totalCents), true)}
    </table>

    <h2 style="margin:28px 0 8px;font-size:15px">Ship to</h2>
    <p style="margin:0;color:#6b5b75">${addressLines(o).map(escapeHtml).join("<br>")}</p>

    <p style="margin:24px 0 0;color:#6b5b75;font-size:14px">
      Orders ship from our supplier and usually arrive in 10 to 20 business days.
    </p>

    <p style="margin:24px 0 0;font-size:14px">
      <a href="${orderUrl(o)}" style="color:#3b1d4f">View this order</a>
    </p>

    <hr style="margin:28px 0 16px;border:none;border-top:1px solid #e6dfea">
    <p style="margin:0;color:#6b5b75;font-size:13px">
      Questions? Email <a href="mailto:${site.supportEmail}" style="color:#3b1d4f">${site.supportEmail}</a> and include the order number.<br>
      ${escapeHtml(site.name)}
    </p>
  </div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendOrderConfirmation(o: OrderEmailData): Promise<void> {
  await send({
    to: o.email,
    subject: `Order ${o.number} confirmed — ${site.shortName}`,
    text: receiptText(o),
    html: receiptHtml(
      o,
      "Order confirmed",
      "Thanks for your order. Here is your receipt.",
    ),
  });
}

export async function sendOwnerNotification(
  o: OrderEmailData,
  warning?: string,
): Promise<void> {
  const { OWNER_EMAIL } = env();
  await send({
    to: OWNER_EMAIL,
    subject: `${warning ? "ACTION NEEDED — " : ""}New order ${o.number} — ${formatMoney(o.totalCents)}`,
    text: [
      warning ? `WARNING: ${warning}\n` : "",
      `Customer: ${o.email}`,
      receiptText(o),
      "",
      `Admin: ${siteUrl()}/admin/orders`,
    ].join("\n"),
    html: receiptHtml(
      o,
      warning ? "New order — action needed" : "New order",
      warning ? warning : `Placed by ${o.email}.`,
    ),
  });
}

export async function sendShippedNotice(o: OrderEmailData): Promise<void> {
  await send({
    to: o.email,
    subject: `Order ${o.number} has shipped — ${site.shortName}`,
    text: receiptText(o).replace("Order " + o.number, `Order ${o.number} has shipped`),
    html: receiptHtml(
      o,
      "Your order has shipped",
      "It is on its way. Delivery usually takes 10 to 20 business days from dispatch.",
    ),
  });
}

export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const { OWNER_EMAIL } = env();
  await send({
    to: OWNER_EMAIL,
    subject: `Contact form: ${input.subject}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    html: `<!doctype html><html lang="en"><body style="font-family:Helvetica,Arial,sans-serif;color:#2a1338">
      <p><strong>${escapeHtml(input.name)}</strong> &lt;${escapeHtml(input.email)}&gt;</p>
      <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
    </body></html>`,
  });
}
