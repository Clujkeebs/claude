import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPolicy, LAST_UPDATED, LEGAL_DISCLAIMER, policies } from "@/content/legal";
import { siteUrl } from "@/lib/env";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  props: PageProps<"/policies/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const policy = getPolicy(slug);
  if (!policy) return { title: "Not found" };

  return {
    title: policy.title,
    description: policy.summary,
    alternates: { canonical: `/policies/${policy.slug}` },
    openGraph: {
      title: `${policy.title} — ${site.shortName}`,
      description: policy.summary,
      url: `${siteUrl()}/policies/${policy.slug}`,
    },
  };
}

export default async function PolicyPage(props: PageProps<"/policies/[slug]">) {
  const { slug } = await props.params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: policy.title,
        item: `${siteUrl()}/policies/${policy.slug}`,
      },
    ],
  };

  return (
    <div className="container-page py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-prose">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-plum-900">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page" className="text-plum-900">
                {policy.title}
              </span>
            </li>
          </ol>
        </nav>

        <h1 className="rule-accent text-3xl text-plum-900">{policy.title}</h1>
        <p className="mt-4 text-lg text-muted">{policy.summary}</p>
        <p className="mt-2 text-sm text-muted">Last reviewed: {LAST_UPDATED}</p>

        <p className="mt-8 rounded-[--radius-card] border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-700">
          {LEGAL_DISCLAIMER}
        </p>

        <div className="mt-10 flex flex-col gap-9">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl text-plum-900">{section.heading}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav aria-label="Other policies" className="mt-14 border-t border-border pt-8">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Other policies</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {policies
              .filter((p) => p.slug !== policy.slug)
              .map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/policies/${p.slug}`}
                    className="text-sm text-plum-700 underline underline-offset-4 hover:text-plum-900"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
