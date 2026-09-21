/**
 * LOCAL DEVELOPMENT ONLY.
 *
 * Inserts obviously-fake sample products so the storefront can be clicked
 * through before any real inventory exists. Every name is prefixed "DEMO" and
 * every image is a locally generated placeholder, so this data can never be
 * mistaken for a real listing. Refuses to run against production.
 *
 *   npm run seed:demo          insert demo rows
 *   npm run seed:demo -- --clear   remove them again
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const db = new PrismaClient();

const DEMO_PREFIX = "DEMO ";

const demoProducts = [
  { key: "peach", name: "Peach Bun", price: 1200, stock: 12, tone: "#F6C6D4" },
  { key: "cloud", name: "Cloud Loaf", price: 1450, stock: 7, tone: "#CFE3F5" },
  { key: "taro", name: "Taro Mochi", price: 999, stock: 24, tone: "#DCCCF0" },
  { key: "melon", name: "Melon Pan", price: 1650, stock: 3, tone: "#D6E8C8" },
  { key: "plum", name: "Plum Pudding", price: 1350, stock: 0, tone: "#E0CCE8" },
  { key: "lemon", name: "Lemon Square", price: 1100, stock: 18, tone: "#F6E7BE" },
];

async function makePlaceholder(key: string, label: string, tone: string) {
  const dir = path.join(process.cwd(), "public", "demo");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${key}.png`);
  if (existsSync(file)) return `/demo/${key}.png`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="800" height="800" fill="${tone}"/>
    <circle cx="400" cy="360" r="190" fill="rgba(255,255,255,0.55)"/>
    <text x="400" y="380" text-anchor="middle" font-family="Georgia, serif"
      font-size="52" fill="#3B1D4F">${label}</text>
    <text x="400" y="700" text-anchor="middle" font-family="Helvetica, sans-serif"
      font-size="34" letter-spacing="6" fill="#3B1D4F" opacity="0.65">DEMO IMAGE</text>
  </svg>`;

  await writeFile(file, await sharp(Buffer.from(svg)).png().toBuffer());
  return `/demo/${key}.png`;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed:demo refuses to run with NODE_ENV=production");
  }
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url) && !process.argv.includes("--force")) {
    throw new Error(
      "DATABASE_URL does not look local. Re-run with --force only if you are certain.",
    );
  }

  if (process.argv.includes("--clear")) {
    const { count } = await db.product.deleteMany({
      where: { name: { startsWith: DEMO_PREFIX } },
    });
    console.log(`Removed ${count} demo products.`);
    return;
  }

  for (const [index, p] of demoProducts.entries()) {
    const imageUrl = await makePlaceholder(p.key, p.name, p.tone);
    const name = `${DEMO_PREFIX}${p.name}`;
    const slug = `demo-${p.key}`;
    await db.product.upsert({
      where: { slug },
      create: {
        slug,
        name,
        description:
          "Sample record created by seed:demo. Not a real product and not for sale.",
        priceCents: p.price,
        imageUrl,
        imageAlt: `Placeholder image for ${name}`,
        stock: p.stock,
        sortOrder: index,
        supplierNote: "Demo row — delete before launch.",
      },
      update: { priceCents: p.price, stock: p.stock, imageUrl, sortOrder: index },
    });
  }

  console.log(`Seeded ${demoProducts.length} demo products. Remove with: npm run seed:demo -- --clear`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
