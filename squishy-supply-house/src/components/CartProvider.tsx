"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  unitCents: number;
  quantity: number;
  stock: number;
  lineCents: number;
};

export type CartSummary = {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  adjusted: boolean;
};

const emptyCart: CartSummary = {
  lines: [],
  count: 0,
  subtotalCents: 0,
  shippingCents: 0,
  totalCents: 0,
  adjusted: false,
};

type CartContextValue = {
  cart: CartSummary;
  /** True until the first fetch resolves, so the header can render a placeholder. */
  hydrated: boolean;
  pending: boolean;
  /**
   * Increments on every add. The header badge keys off it to replay its
   * animation, which keeps that effect out of render.
   */
  addCount: number;
  add: (productId: string, quantity?: number) => Promise<boolean>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

async function readCart(res: Response): Promise<CartSummary> {
  if (!res.ok) throw new Error(`Cart request failed: ${res.status}`);
  return (await res.json()) as CartSummary;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartSummary>(emptyCart);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [addCount, setAddCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCart(await readCart(await fetch("/api/cart", { cache: "no-store" })));
    } catch {
      // Leave the last known cart in place; the cart page surfaces real errors.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Loads the server's cart once the page is interactive. Keeping this on the
  // client is what lets the catalogue pages stay statically rendered.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<CartSummary>) : null))
      .then((data) => {
        if (!cancelled && data) setCart(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = useCallback(
    async (method: string, body: unknown): Promise<boolean> => {
      setPending(true);
      try {
        const res = await fetch("/api/cart", {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return false;
        setCart(await readCart(res));
        return true;
      } catch {
        return false;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const add = useCallback(
    async (productId: string, quantity = 1) => {
      // Optimistic count bump so the header badge reacts on the same frame.
      setCart((c) => ({ ...c, count: c.count + quantity }));
      setAddCount((n) => n + 1);
      const ok = await mutate("POST", { productId, quantity });
      if (!ok) await refresh();
      return ok;
    },
    [mutate, refresh],
  );

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const ok = await mutate("PATCH", { productId, quantity });
      if (!ok) await refresh();
    },
    [mutate, refresh],
  );

  const remove = useCallback(
    async (productId: string) => {
      await setQuantity(productId, 0);
    },
    [setQuantity],
  );

  const value = useMemo(
    () => ({ cart, hydrated, pending, addCount, add, setQuantity, remove, refresh }),
    [cart, hydrated, pending, addCount, add, setQuantity, remove, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
