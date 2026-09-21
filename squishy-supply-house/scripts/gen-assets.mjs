import sharp from "sharp";
import fs from "node:fs/promises";

const src = "public/brand/logo.png";
const paper = { r: 253, g: 251, b: 247, alpha: 1 };

// Trim the uniform white border the generator left, so the mark fills its box.
const trimmed = await sharp(src).trim({ threshold: 6 }).toBuffer();
const meta = await sharp(trimmed).metadata();
console.log("trimmed:", meta.width, "x", meta.height);

// Header/inline logo, transparent-safe on paper.
await sharp(trimmed).resize({ width: 640 }).png({ quality: 90, compressionLevel: 9 })
  .toFile("public/brand/logo-640.png");

// App icons (Next app-router conventions).
await sharp(trimmed)
  .resize(512, 512, { fit: "contain", background: paper })
  .flatten({ background: paper })
  .png({ compressionLevel: 9 })
  .toFile("src/app/icon.png");

await sharp(trimmed)
  .resize(180, 180, { fit: "contain", background: paper })
  .flatten({ background: paper })
  .png({ compressionLevel: 9 })
  .toFile("src/app/apple-icon.png");

// Open Graph / Twitter card: logo centred on paper, 1200x630.
const ogLogo = await sharp(trimmed).resize({ height: 460, fit: "inside" }).toBuffer();
await sharp({
  create: { width: 1200, height: 630, channels: 4, background: paper },
})
  .composite([{ input: ogLogo, gravity: "centre" }])
  .png({ compressionLevel: 9 })
  .toFile("src/app/opengraph-image.png");

await fs.copyFile("src/app/opengraph-image.png", "src/app/twitter-image.png");

for (const f of ["public/brand/logo-640.png", "src/app/icon.png", "src/app/apple-icon.png", "src/app/opengraph-image.png"]) {
  const { size } = await fs.stat(f);
  const m = await sharp(f).metadata();
  console.log(f, `${m.width}x${m.height}`, `${(size / 1024).toFixed(0)}KB`);
}
