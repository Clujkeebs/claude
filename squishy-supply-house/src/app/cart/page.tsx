import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { copy } from "@/content/copy";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review what is in your cart before checking out.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <h1 className="rule-accent text-3xl text-plum-900">{copy.cart.heading}</h1>
      <div className="mt-10">
        <CartView />
      </div>
    </div>
  );
}
