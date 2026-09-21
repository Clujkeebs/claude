import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import Script from "next/script";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { siteUrl } from "@/lib/env";
import { site } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const karla = Karla({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-karla",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${site.name} — slow-rise squishies, free shipping`,
    template: `%s — ${site.shortName}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — slow-rise squishies, free shipping`,
    description: site.description,
    url: siteUrl(),
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — slow-rise squishies, free shipping`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false },
};

export const viewport = {
  themeColor: "#fdfbf7",
  colorScheme: "light",
};

function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl()}/#organization`,
        name: site.name,
        alternateName: site.shortName,
        url: siteUrl(),
        logo: `${siteUrl()}/brand/logo-640.png`,
        email: site.supportEmail,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: site.supportEmail,
            availableLanguage: ["English"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        url: siteUrl(),
        name: site.name,
        description: site.description,
        publisher: { "@id": `${siteUrl()}/#organization` },
        inLanguage: "en-US",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl()}/shop?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static, developer-authored JSON. No user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

function Analytics() {
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
  const websiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;
  if (!enabled || !src || !websiteId) return null;
  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" defer />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <StructuredData />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <CartProvider>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
