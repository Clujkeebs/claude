import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { copy } from "@/content/copy";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Questions about an order, a product, or bulk buying? Email ${site.supportEmail} or use the contact form.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="container-prose">
        <h1 className="rule-accent text-3xl text-plum-900">{copy.contact.heading}</h1>
        <p className="mt-4 text-muted">{copy.contact.intro}</p>
        <p className="mt-2 text-sm text-muted">{copy.contact.orderNote}</p>

        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
