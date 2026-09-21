"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

/**
 * The server already emptied the cart when payment was confirmed. This only
 * pulls the fresh state so the header badge drops to zero without a reload.
 */
export function ClearCartOnMount() {
  const { refresh } = useCart();
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return null;
}
