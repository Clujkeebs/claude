import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

/** Trimmed logo is 1128x1008; keep that ratio wherever it appears. */
const RATIO = 1128 / 1008;

export function Logo({ height = 44, priority = false }: { height?: number; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo-640.png"
      alt={site.name}
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      sizes={`${Math.round(height * RATIO)}px`}
      className="h-auto w-auto"
      style={{ height, width: "auto" }}
    />
  );
}

export function LogoLink({ height = 44, priority = false }: { height?: number; priority?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center rounded-[--radius-input]"
      aria-label={`${site.name} — home`}
    >
      <Logo height={height} priority={priority} />
    </Link>
  );
}
