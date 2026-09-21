import { site } from "@/lib/site";

/**
 * Every word the storefront shows lives here so it can be reviewed and edited
 * without touching components. Keep it plain and specific.
 */
export const copy = {
  home: {
    heroHeading: "Squishies worth the wait.",
    heroBody:
      "A small catalogue of slow-rise squishies, picked one at a time. Free shipping on every order in the US.",
    heroCta: "See what's in stock",
    aboutHeading: "How this shop works",
    aboutBody:
      "Squishy Supply House is run by one person. Stock is small on purpose — each squishy is ordered from a supplier I have actually bought from myself, and listed only once I have handled it. That keeps the catalogue short and the duds out of it.",
    shippingHeading: "Shipping is free, and it is slow",
    shippingBody:
      "Orders ship directly from the supplier, which keeps prices down and makes free shipping possible. It also means delivery takes longer than a warehouse would. Most orders arrive in 10 to 20 business days.",
    featuredHeading: "In stock now",
    featuredLink: "View all squishies",
  },

  shop: {
    heading: "All squishies",
    intro: "Everything currently in stock. Free shipping on every order.",
    searchLabel: "Search squishies",
    searchPlaceholder: "Search by name",
    emptyHeading: "Nothing listed yet",
    emptyBody:
      "The catalogue is empty while the first batch is being checked over. Nothing is listed until it has been handled in person.",
    noResultsHeading: "No matches",
    noResultsBody: "Nothing in stock matches that search. Try a shorter word.",
    clearSearch: "Clear search",
    resultCount: (n: number, q: string) =>
      `${n} ${n === 1 ? "result" : "results"} for "${q}"`,
  },

  product: {
    addToCart: "Add to cart",
    adding: "Adding",
    added: "Added to cart",
    soldOut: "Sold out",
    soldOutBody: "This one is gone. Restocks are not guaranteed.",
    lowStock: (n: number) => `Only ${n} left`,
    inStock: "In stock",
    quantity: "Quantity",
    shippingNote: "Free shipping. Arrives in 10 to 20 business days.",
    descriptionHeading: "About this squishy",
    noDescription: "No description yet. Email us if you want details before ordering.",
  },

  cart: {
    heading: "Cart",
    emptyHeading: "Your cart is empty",
    emptyBody: "Once you add a squishy it will show up here.",
    emptyCta: "Go to the shop",
    subtotal: "Subtotal",
    shipping: "Shipping",
    shippingFree: "Free",
    total: "Total",
    checkout: "Checkout",
    remove: "Remove",
    removed: "Removed",
    undo: "Undo",
    quantityLabel: (name: string) => `Quantity for ${name}`,
    adjusted:
      "Some quantities were reduced because stock changed while you were shopping.",
    taxNote: "Prices are in US dollars. No sales tax is added at checkout.",
  },

  checkout: {
    heading: "Checkout",
    contactHeading: "Contact",
    shippingHeading: "Shipping address",
    summaryHeading: "Order summary",
    submit: "Continue to payment",
    submitting: "Starting payment",
    submitStripe: "Pay with card",
    submitPaypal: "Pay with PayPal",
    note: "Anything we should know?",
    notePlaceholder: "Optional",
    usOnly: "We ship within the United States only.",
    securityNote:
      "Payment is handled by the payment provider. Card details never touch this site.",
    outOfStock:
      "Something in your cart sold out while you were checking out. Your cart has been updated — check it over and try again.",
    failed: "Payment could not be started. Your cart is untouched — try again.",
  },

  confirmation: {
    heading: "Order confirmed",
    body: "Thanks. A receipt is on its way to your email.",
    pendingHeading: "Payment not confirmed yet",
    pendingBody:
      "We have your order but the payment provider has not confirmed it. This usually clears within a minute. The receipt email is sent the moment it does.",
    orderNumber: "Order number",
    placed: "Placed",
    shipTo: "Ship to",
    items: "Items",
    support: `Questions about this order? Email ${site.supportEmail} and include the order number.`,
    continue: "Back to the shop",
  },

  contact: {
    heading: "Contact",
    intro: `One person reads this inbox. Expect a reply within two business days. You can also email ${site.supportEmail} directly.`,
    name: "Your name",
    email: "Email",
    subject: "Subject",
    message: "Message",
    submit: "Send message",
    submitting: "Sending",
    success: "Message sent. You will get a reply at the address you gave.",
    failed: "That did not send. Email us directly instead.",
    orderNote: "Writing about an order? Include the order number.",
  },

  faq: {
    heading: "Questions",
    intro: "The things people ask most. Anything else, use the contact form.",
  },

  notFound: {
    heading: "That page is gone",
    body: "The link may be old, or the squishy may have sold out and been removed.",
    cta: "Go to the shop",
  },

  footer: {
    blurb:
      "Slow-rise squishies and soft toys, shipped free across the United States.",
    rights: (year: number) => `${year} ${site.name}`,
    legalNote: "Prices in USD. We ship within the United States only.",
  },

  common: {
    loading: "Loading",
    tryAgain: "Try again",
    required: "Required",
    freeShipping: "Free shipping",
  },
} as const;
