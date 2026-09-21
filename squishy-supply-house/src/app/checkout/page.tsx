import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { copy } from "@/content/copy";
import { activeProvider } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const { cancelled } = await props.searchParams;
  const provider = activeProvider();

  return (
    <div className="container-page py-12 md:py-16">
      <h1 className="rule-accent text-3xl text-plum-900">{copy.checkout.heading}</h1>
      <div className="mt-10">
        <CheckoutForm payLabel={provider.payLabel} cancelled={Boolean(cancelled)} />
      </div>
    </div>
  );
}
