export const site = {
  name: "Squishy Supply House by Clujkeebs",
  shortName: "Squishy Supply House",
  tagline: "Squishies, shipped free.",
  supportEmail: "clujkeebs@gmail.com",
  description:
    "Squishy Supply House by Clujkeebs sells slow-rise squishies and soft toys. Free shipping on every order in the United States.",
} as const;

export const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerLinks = {
  shop: [
    { href: "/shop", label: "All squishies" },
    { href: "/cart", label: "Cart" },
  ],
  help: [
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
    { href: "/policies/shipping", label: "Shipping" },
    { href: "/policies/returns", label: "Returns and refunds" },
  ],
  legal: [
    { href: "/policies/privacy", label: "Privacy policy" },
    { href: "/policies/terms", label: "Terms of service" },
  ],
} as const;
