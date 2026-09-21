import { site } from "@/lib/site";

/**
 * FAQ and policy copy. Plain English, written to be edited.
 *
 * Every [BRACKETED] value must be filled in before launch — they are listed in
 * PLACEHOLDERS.md. These are drafts, not legal advice.
 */

export const LEGAL_DISCLAIMER =
  "These policies are a starting template, not legal advice. Have a lawyer in your " +
  "jurisdiction review them before you start selling.";

export const LAST_UPDATED = "[DATE POLICIES REVIEWED]";

export type Faq = { question: string; answer: string };

export const faqs: Faq[] = [
  {
    question: "How long does shipping take?",
    answer:
      "Most orders arrive in 10 to 20 business days. Items ship directly from our " +
      "supplier rather than from a warehouse we hold, which is what keeps prices low " +
      "and shipping free. Orders are dispatched within 1 to 3 business days of payment.",
  },
  {
    question: "How much is shipping?",
    answer:
      "Shipping is free on every order within the United States. There is no minimum.",
  },
  {
    question: "Do you ship outside the United States?",
    answer:
      "Not yet. We ship to United States addresses only, including APO and FPO " +
      `addresses. If you are elsewhere and want to order, email ${site.supportEmail} ` +
      "and we will tell you honestly whether we can help.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Your confirmation email has a link to your order page. When the order is marked " +
      "shipped you will get a second email. If tracking is available for your parcel it " +
      "will be included in that email. Some low-cost shipping methods have limited " +
      "tracking once the parcel leaves the origin country, and we will say so rather " +
      "than pretend otherwise.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Card payments and PayPal. Payment is handled entirely by the payment provider — " +
      "card numbers never touch this website and we never see or store them.",
  },
  {
    question: "Can I return something?",
    answer:
      "Yes. You have 30 days from delivery to request a return for any reason, as long " +
      "as the item is unused and in its original packaging. If an item arrives damaged " +
      "or is not what you ordered, we cover return shipping and you get a full refund. " +
      "For a change of mind, you cover return shipping. See the returns policy for the " +
      "full detail.",
  },
  {
    question: "What are the squishies made of?",
    answer:
      "Most are slow-rise polyurethane foam with a painted or coated surface. Exact " +
      "materials vary by item and are listed on the product page where the supplier " +
      `provides them. If a specific material matters to you, email ${site.supportEmail} ` +
      "before ordering and we will check.",
  },
  {
    question: "Are these safe for young children?",
    answer:
      "No. These are not toys for children under 3. They are a choking hazard, and some " +
      "items contain small parts. Keep them away from infants and pets, and do not cut " +
      "them open or let anyone chew on them.",
  },
  {
    question: "How do I look after a squishy?",
    answer:
      "Keep it out of direct sunlight, and away from heat and sharp surfaces. Clean it " +
      "with a barely damp cloth. Do not machine wash, soak, or put it in a dryer — the " +
      "foam will not recover.",
  },
  {
    question: "Do you do wholesale or bulk orders?",
    answer:
      `Sometimes, for larger quantities of a single item. Email ${site.supportEmail} ` +
      "with the item and the quantity you want and we will tell you what is possible " +
      "and what it would cost. We do not publish a wholesale price list.",
  },
  {
    question: "How do I contact you?",
    answer:
      `Use the contact form, or email ${site.supportEmail} directly. One person reads ` +
      "that inbox, so expect a reply within two business days. Include your order " +
      "number if you are writing about an order.",
  },
];

export type PolicySection = { heading: string; body: string[] };
export type Policy = {
  slug: string;
  title: string;
  summary: string;
  sections: PolicySection[];
};

export const policies: Policy[] = [
  {
    slug: "shipping",
    title: "Shipping policy",
    summary: "Free shipping across the United States. It takes 10 to 20 business days.",
    sections: [
      {
        heading: "Where we ship",
        body: [
          "We ship to addresses in the United States only, including APO and FPO addresses. We cannot ship internationally at this time.",
        ],
      },
      {
        heading: "What it costs",
        body: [
          "Shipping is free on every order. There is no minimum order value and no handling fee.",
        ],
      },
      {
        heading: "How long it takes",
        body: [
          "Orders are dispatched within 1 to 3 business days of payment clearing. Delivery normally takes a further 10 to 20 business days.",
          "Items ship directly from our supplier. That is slower than a domestic warehouse would be, and it is the honest trade-off that lets shipping be free. If you need something quickly, this is not the right shop for that order.",
          "Business days exclude weekends and United States public holidays. Peak periods, customs checks and carrier delays can extend these times, and we cannot guarantee a delivery date.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "Your confirmation email links to your order page. When an order is marked shipped you will receive a second email with any tracking information available.",
          "Some economy shipping methods stop updating once the parcel leaves the origin country. If that happens we will tell you plainly rather than invent an update.",
        ],
      },
      {
        heading: "Address accuracy",
        body: [
          `Please check your address at checkout. We cannot change an address once an order has been dispatched. If an order is returned to sender because the address was wrong, we will refund the item price but not any costs incurred, and you are welcome to order again with the corrected address. Email ${site.supportEmail} as soon as possible if you spot a mistake.`,
        ],
      },
      {
        heading: "Lost and delayed parcels",
        body: [
          "If your order has not arrived 30 business days after dispatch, contact us and we will either replace it or refund it. We do not ask you to chase the carrier yourself.",
          "We are not responsible for parcels marked delivered by the carrier but taken from your property afterwards, though we will help you open a claim.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Return and refund policy",
    summary: "30 days to return an unused item. Our mistakes are on us.",
    sections: [
      {
        heading: "Your return window",
        body: [
          "You may request a return within 30 days of delivery. The item must be unused and in its original packaging.",
          `To start a return, email ${site.supportEmail} with your order number and what you would like to do. Do not send anything back before you have heard from us, because we may not be able to identify an unannounced parcel.`,
        ],
      },
      {
        heading: "If we got it wrong",
        body: [
          "If an item arrives damaged, defective, or is not the item you ordered, we pay for return shipping and refund you in full — or send a replacement, whichever you prefer.",
          "Please send a photograph of the problem when you contact us. It usually means we can resolve it without you posting anything back at all.",
        ],
      },
      {
        heading: "If you changed your mind",
        body: [
          "Change-of-mind returns are accepted within the same 30 days, but you pay the return postage and the original order's shipping cost is not refunded where one was charged.",
          "We recommend a tracked service. Until a returned parcel reaches us it remains your responsibility.",
        ],
      },
      {
        heading: "Items we cannot accept back",
        body: [
          "Items that have been used, washed, cut, or damaged after delivery.",
          "Items returned without their original packaging.",
          "Items returned more than 30 days after delivery.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Refunds are issued to the original payment method within 5 business days of us receiving the return or agreeing to refund without one. Your bank or PayPal may take a few more days to show it.",
          "Refunding an order does not automatically put the item back on sale.",
        ],
      },
      {
        heading: "Cancellations",
        body: [
          `You can cancel an order at no cost any time before it is dispatched. Email ${site.supportEmail} with your order number. Once dispatched, the return process above applies instead.`,
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    summary: "What we collect, why, and who else sees it.",
    sections: [
      {
        heading: "Who we are",
        body: [
          `${site.name} is operated by [LEGAL ENTITY NAME], [BUSINESS ADDRESS]. For any question about your data, email ${site.supportEmail}.`,
        ],
      },
      {
        heading: "What we collect",
        body: [
          "When you order: your email address, shipping name and address, what you ordered, and the amount paid. We need these to fulfil and support the order.",
          "When you contact us: your name, email address and whatever you write in the message.",
          "Automatically: a cart identifier stored in a cookie so your basket survives a page reload, and an admin session cookie if you are the store owner. Our server keeps standard request logs, which include IP addresses, for security and debugging.",
          "We never collect or store card numbers. Payment details are entered on the payment provider's own systems and are never sent to this website.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use two cookies, both strictly necessary: one holds your cart identifier, one holds an administrator sign-in session. Neither is used for advertising or tracking across other websites.",
          "We do not run third-party advertising or social media pixels. Analytics are off by default; if they are ever enabled we will use a cookie-free, privacy-respecting tool and say so here.",
        ],
      },
      {
        heading: "Who else processes your data",
        body: [
          "Stripe and PayPal process payments and receive the information needed to take payment. They are independent controllers of that data under their own privacy policies.",
          "Railway hosts the website and its database, in [HOSTING REGION].",
          "Resend sends transactional email — your receipt and shipping notice — and therefore processes your email address.",
          "Our supplier and the shipping carrier receive the name and address needed to deliver your order.",
          "We do not sell your personal information, and we do not share it for advertising.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Order records are kept for [RETENTION PERIOD, e.g. 7 years] because tax and accounting rules require it. Contact messages are kept for 2 years. Abandoned carts are deleted after 60 days.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it where we are not required to keep it.",
          `Email ${site.supportEmail} and we will respond within 30 days. If you are in California, the EEA or the UK, you may have additional rights under your local law, including the right to complain to a supervisory authority.`,
        ],
      },
      {
        heading: "Children",
        body: [
          "This shop is intended for adults. We do not knowingly collect personal information from anyone under 13. If you believe a child has given us their information, email us and we will delete it.",
        ],
      },
      {
        heading: "Security",
        body: [
          "The site is served over HTTPS. Administrator passwords are stored only as a bcrypt hash. Sessions are signed, HTTP-only cookies. No system is perfectly secure, so we do not claim that this one is.",
        ],
      },
      {
        heading: "Changes",
        body: [
          `We will update this page if our practices change, and change the date at the top. Last reviewed: ${LAST_UPDATED}.`,
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of service",
    summary: "The agreement between you and this shop.",
    sections: [
      {
        heading: "Agreement",
        body: [
          `By placing an order with ${site.name}, operated by [LEGAL ENTITY NAME], you agree to these terms. If you do not agree, please do not order.`,
          "You must be at least 18, or have the consent of a parent or guardian who accepts these terms on your behalf.",
        ],
      },
      {
        heading: "Orders and acceptance",
        body: [
          "Your order is an offer to buy. A contract is formed only when we confirm the order by email after payment is verified.",
          "We may refuse or cancel any order, including after payment, for any lawful reason — including suspected fraud, pricing errors, an address we cannot ship to, or stock that is genuinely unavailable. If we cancel, we refund you in full. That refund is your sole remedy for a cancelled order.",
        ],
      },
      {
        heading: "Pricing and availability",
        body: [
          "Prices are in United States dollars and may change without notice. The price that applies is the one shown when your order is confirmed.",
          "We do not add sales tax at checkout. Where a tax obligation applies, it is accounted for out of the displayed price. If you are ordering for a business and need a tax document, contact us.",
          "We try to show stock accurately, but an item can sell out between your order and fulfilment. If that happens we will contact you and refund you.",
          "Obvious pricing errors — for example a $14 item listed at $1.40 — do not bind us, even if an order was confirmed. We will cancel and refund instead.",
        ],
      },
      {
        heading: "Products",
        body: [
          "Product photographs are supplied by our suppliers. Colour, size and finish can vary slightly from the images, and handmade or hand-finished items vary more.",
          "Descriptions are provided in good faith. Where a detail matters to you, ask before ordering.",
        ],
      },
      {
        heading: "Age, safety and intended use",
        body: [
          "These products are not intended for children under 3 years old. They present a choking hazard and may contain small parts.",
          "Items are novelty and stress-relief products for normal handling. They are not food, not medical devices, and not chew toys for children or pets. Do not cut, burn, heat, eat, or otherwise misuse them.",
          "Adult supervision is required whenever a child uses one of these products. By ordering you confirm you understand this and accept responsibility for safe use and storage.",
        ],
      },
      {
        heading: "Shipping, returns and refunds",
        body: [
          "Our shipping policy and return and refund policy form part of these terms. Please read them.",
          "Risk of loss passes to you on delivery to the address you supplied.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          "To the fullest extent permitted by law, our total liability to you for any claim arising out of or relating to an order, the products, or this website is limited to the amount you actually paid for the order concerned.",
          "We are not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, lost data, or loss of goodwill, even if we were told such damages were possible.",
          "Products are supplied as they are. To the extent permitted by law we disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
          "Nothing in these terms excludes liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot lawfully be excluded. Some jurisdictions do not allow certain exclusions, so parts of this section may not apply to you.",
        ],
      },
      {
        heading: "Indemnity",
        body: [
          "You agree to indemnify and hold harmless [LEGAL ENTITY NAME] and anyone working with it against claims, damages and reasonable legal costs arising from your misuse of a product, your breach of these terms, or your violation of any law or the rights of a third party.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          `The ${site.shortName} name, logo, site design and written content belong to [LEGAL ENTITY NAME] and may not be copied or used without permission. Product images may belong to their respective suppliers or manufacturers.`,
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not attempt to breach, overload, scrape at scale, or otherwise interfere with this website or its systems. We may refuse service to anyone who does.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of [STATE], [COUNTRY], without regard to conflict-of-law rules. The courts of [STATE] have exclusive jurisdiction over any dispute, except that either party may seek an injunction wherever necessary to protect its rights.",
        ],
      },
      {
        heading: "Changes",
        body: [
          `We may update these terms. The version in force is the one published when you place your order. Last reviewed: ${LAST_UPDATED}.`,
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about these terms: ${site.supportEmail}.`],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return policies.find((p) => p.slug === slug);
}
