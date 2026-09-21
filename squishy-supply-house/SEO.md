# SEO

On-page SEO is done. It is also the part that matters least for a new store.
Nothing here will rank a brand-new domain on its own — the off-site list below
is the actual work.

## What is already built

- Unique `<title>` and meta description per page, via the Metadata API.
- Human-readable slugs (`/products/pink-axolotl-squishy`), generated from the
  product name and guaranteed unique.
- Canonical URLs on every page, driven by `NEXT_PUBLIC_SITE_URL`.
- Dynamic `sitemap.xml` (products, policies, static pages, with real
  `lastModified` dates) and `robots.txt` that keeps crawlers out of `/admin`,
  `/api`, `/cart`, `/checkout` and `/orders`.
- JSON-LD: `Organization` and `WebSite` with a `SearchAction` on the home page,
  `Product` + `Offer` with `availability`, `priceCurrency` and `shippingDetails`
  on product pages, `FAQPage` on the FAQ, `BreadcrumbList` on products and
  policies.
- Open Graph and Twitter card tags everywhere, with a generated 1200×630 image.
- Semantic HTML, exactly one `h1` per page, alt text required at the data layer.
- Product and policy pages statically prerendered with ISR; minimal client JS.
- Noindex on cart, checkout, order confirmation and the whole admin area.

Verify any of it with `npm run verify:ui`, which asserts the sitemap, robots,
canonicals, OG tags and FAQ schema on every run.

## Before launch

1. **Buy the domain and set `NEXT_PUBLIC_SITE_URL`.** Until you do, every
   canonical URL and sitemap entry points at the Railway subdomain, which will
   get indexed instead of your real site.
2. **Pick one hostname and stick to it.** `www` or bare, not both. Redirect the
   other permanently.
3. **Google Search Console** — add the property, verify by DNS, submit
   `/sitemap.xml`, then use the URL Inspection tool on two or three product
   pages to confirm Google renders them as you expect.
4. **Bing Webmaster Tools** — same thing. It takes five minutes and Bing feeds
   several smaller engines.

## Off-site: the work that actually moves rankings

On-page SEO gets you eligible to rank. These get you ranked.

**Google Business Profile.** Only if you have a real business address or serve a
defined area. It is the single highest-leverage free listing for a small
retailer, and it feeds Maps.

**Product feeds.** Google Merchant Center accepts free listings in the Shopping
tab. Your `Product` + `Offer` schema already carries the required fields
(price, currency, availability, shipping), so a feed is mostly configuration.
This is usually the fastest source of real buying traffic for a small catalogue.

**Backlinks, honestly earned.** This is slow and there is no shortcut worth
taking. What works for a shop like this:
- Squishy, kawaii, stationery and ASMR communities — Reddit, Discord servers,
  niche forums. Participate first; link when it is genuinely relevant. Drive-by
  link-dropping gets you banned and does nothing for rankings.
- Send product to small reviewers and unboxing channels. A YouTube description
  link and a real review video is worth more than a hundred directory links.
- Local press or blogs if you have a local angle.
- Do not buy links. Google devalues them and can penalise the domain.

**Social, as a distribution channel rather than an SEO one.** TikTok, Instagram
Reels and YouTube Shorts are where squishy demand actually lives. Short
satisfying videos of the product are the format. These will not raise your
domain authority, but they will sell squishies, which is the point.

**Content only if you can be specific.** A generic "top 10 squishies" post will
not rank against established sites. Something you can say that they cannot —
photographing the same item from three suppliers and showing which one is
actually good, or honest teardown comparisons — has a chance and matches the
shop's voice.

## After launch

- Watch Search Console **Coverage** weekly for the first month. Products
  excluded as "Crawled — currently not indexed" usually means thin content: add
  real descriptions.
- Watch **Core Web Vitals** in Search Console, not just Lighthouse. Field data
  from real visitors is what Google uses.
- Check **Merchant Center** for disapproved items. Missing GTINs and vague
  product titles are the usual causes.
- Re-submit the sitemap after any bulk catalogue change.

## Realistic expectations

A new domain with no backlinks takes months to rank for anything competitive.
For the first 90 days, assume paid social and organic short-form video are your
traffic, and treat SEO as compounding groundwork rather than a launch channel.
