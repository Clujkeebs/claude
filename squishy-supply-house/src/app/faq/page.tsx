import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/copy";
import { faqs } from "@/content/legal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ — shipping, returns and squishy care",
  description:
    "Answers about shipping times, free delivery, returns and refunds, payment methods, materials and safety for Squishy Supply House by Clujkeebs.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="container-page py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-prose">
        <h1 className="rule-accent text-3xl text-plum-900">{copy.faq.heading}</h1>
        <p className="mt-4 text-muted">{copy.faq.intro}</p>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-1">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-lg font-medium text-plum-900 marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl text-plum-500 transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-muted">
          Still stuck?{" "}
          <Link
            href="/contact"
            className="font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
          >
            Send us a message
          </Link>{" "}
          or email{" "}
          <a
            href={`mailto:${site.supportEmail}`}
            className="font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
          >
            {site.supportEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
