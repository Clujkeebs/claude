import type { NextConfig } from "next";

/**
 * Product photography is dropshipped, so images live on supplier CDNs. The
 * optimizer is restricted to an explicit host allowlist rather than `https://**`
 * — an open pattern lets anyone route their own images through this deployment.
 * Add hosts with IMAGE_HOSTS (comma separated) as new suppliers come in.
 */
const defaultImageHosts = [
  "ae01.alicdn.com",
  "ae-pic-a1.aliexpress-media.com",
  "ae-pic-a2.aliexpress-media.com",
  "img.alicdn.com",
  "cbu01.alicdn.com",
  "res.cloudinary.com",
  "images.unsplash.com",
  "cdn.shopify.com",
  "i.imgur.com",
];

const extraHosts = (process.env.IMAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Railway mounts .next/cache as a persistent volume across builds. A cache
    // written by a failed build is reused by the next one and keeps failing, so
    // builds start cold here. Dev keeps its cache.
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    remotePatterns: [...new Set([...defaultImageHosts, ...extraHosts])].map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    /**
     * WebP only. AVIF saves perhaps another 15% of bytes but its encoder is
     * orders of magnitude slower, and on a small container it pins the CPU long
     * enough that the optimizer stops answering — every browser sends
     * `Accept: image/avif`, so that would hang the first load of every image.
     */
    formats: ["image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
