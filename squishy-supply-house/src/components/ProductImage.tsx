"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export const FALLBACK_IMAGE = "/brand/image-unavailable.png";

/**
 * Product photography is hosted by suppliers, and supplier URLs rot without
 * warning. A dead link would otherwise render as a broken image icon on the
 * storefront, so it falls back to a neutral placeholder instead.
 */
export function ProductImage({ src, alt, ...rest }: ImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Image
      {...rest}
      src={failed ? FALLBACK_IMAGE : src}
      alt={alt}
      onError={() => setFailed(true)}
      unoptimized={failed || undefined}
    />
  );
}
