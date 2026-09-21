"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { LogoLink } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { nav } from "@/lib/site";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-paper/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
        <LogoLink height={40} priority />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-[--radius-input] px-4 text-base transition-colors duration-150",
                    isActive(item.href)
                      ? "bg-plum-100 font-medium text-plum-900"
                      : "text-muted hover:bg-plum-100 hover:text-plum-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <CartLink />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex size-11 items-center justify-center rounded-[--radius-input] text-plum-900 transition-colors hover:bg-plum-100 md:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-plum-900/25"
          />
          <div
            ref={panelRef}
            id="mobile-menu"
            className="fixed inset-x-0 top-16 z-50 border-b border-border bg-paper shadow-[0_8px_24px_rgb(42_19_56/0.08)]"
          >
            <nav aria-label="Mobile" className="container-page py-2">
              <ul className="flex flex-col">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 items-center border-b border-border text-lg last:border-b-0",
                        isActive(item.href)
                          ? "font-medium text-plum-900"
                          : "text-plum-900/80",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function CartLink() {
  const { cart, hydrated, addCount } = useCart();

  return (
    <Link
      href="/cart"
      className="inline-flex min-h-11 items-center gap-2 rounded-[--radius-input] px-3 text-plum-900 transition-colors hover:bg-plum-100"
    >
      <CartIcon />
      <span className="hidden sm:inline">Cart</span>
      <span
        key={addCount}
        aria-hidden="true"
        className={cn(
          "inline-flex min-w-6 items-center justify-center rounded-full bg-plum-700 px-1.5 py-0.5 text-xs font-medium text-white",
          addCount > 0 && "animate-cart-bump",
          !hydrated && "opacity-0",
        )}
      >
        {cart.count}
      </span>
      <span className="sr-only">
        {hydrated
          ? `Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`
          : "Cart"}
      </span>
    </Link>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
      <path
        d="M2.5 3h1.9l1.2 9.2a1.4 1.4 0 0 0 1.4 1.2h7.1a1.4 1.4 0 0 0 1.4-1.1l1.1-5.6H5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="16.5" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="16.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
