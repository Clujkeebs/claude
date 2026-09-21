# Pre-launch checklist

Everything that needs a human, roughly in order. Nothing here can be done from
code alone.

## 1. Domain

- [ ] Buy the domain.
- [ ] Add it to the Railway service (Settings → Networking → Custom Domain) and
      create the CNAME it gives you.
- [ ] Wait for the certificate to go green.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.com` (no trailing
      slash) and redeploy. **Do this before sharing any link** — canonical
      URLs, the sitemap and payment redirect URLs are all built from it.

## 2. Admin account

- [ ] Visit `/admin/setup`.
- [ ] Use your real email, a password of at least 12 characters, and the
      `ADMIN_SETUP_TOKEN` from the Railway variables tab.
- [ ] Confirm `/admin/setup` now redirects to sign-in.
- [ ] Store the password in a password manager. There is no reset flow.

## 3. Stripe

- [ ] Create the account and finish identity verification (this gates payouts,
      and takes longest — start it early).
- [ ] Copy the **test** secret key into `STRIPE_SECRET_KEY`.
- [ ] Add a webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Subscribe it to: `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`,
      `checkout.session.async_payment_failed`, `checkout.session.expired`,
      `charge.refunded`
- [ ] Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Place a test order with card `4242 4242 4242 4242`, any future expiry,
      any CVC.
- [ ] Confirm: receipt email arrives, order shows PAID in `/admin/orders`,
      stock went down by the right amount.
- [ ] Swap in **live** keys, recreate the webhook against the live endpoint,
      and place one real order with your own card. Refund it afterwards.

## 4. PayPal (optional — only if you want it as the active provider)

- [ ] Create a sandbox app at developer.paypal.com.
- [ ] Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox`.
- [ ] Add a webhook: `https://yourdomain.com/api/webhooks/paypal`
- [ ] Subscribe it to: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`,
      `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
- [ ] Copy the webhook id into `PAYPAL_WEBHOOK_ID`.
- [ ] Set `PAYMENT_PROVIDER=paypal`, place a sandbox order, verify the same
      three things as above.
- [ ] Set `PAYPAL_ENV=live` and swap in live credentials when ready.

## 5. Email

- [ ] Create a Resend account.
- [ ] Add and verify your domain (SPF and DKIM DNS records).
- [ ] Set `RESEND_API_KEY`.
- [ ] Set `EMAIL_FROM` to an address on that domain, e.g.
      `Squishy Supply House <orders@yourdomain.com>`.
- [ ] Confirm `OWNER_EMAIL` is where you want new-order alerts.
- [ ] Place a test order and confirm **both** emails arrive: the customer
      receipt and your notification.

> Until the domain is verified, `onboarding@resend.dev` only delivers to the
> Resend account owner. Customers will silently get nothing.

## 6. Database

- [ ] Railway → Postgres service → Backups → enable scheduled backups.
- [ ] Take one manual backup before launch.
- [ ] Confirm `DATABASE_URL` on the storefront service is the reference
      `${{Postgres.DATABASE_URL}}`, not a pasted string.

## 7. Legal

- [ ] Fill in every value in [`PLACEHOLDERS.md`](./PLACEHOLDERS.md).
- [ ] Have a lawyer review all four policies, especially limitation of
      liability, indemnity, and the age and safety language.
- [ ] Set `LAST_UPDATED` in `src/content/legal.ts` to the review date.

## 8. Catalogue

- [ ] `npm run seed:demo -- --clear` if you ever seeded demo data. Confirm
      `/shop` shows the empty state.
- [ ] Add real products. Check each one has a description and honest stock.
- [ ] Add supplier URL and unit cost on each product — private, admin only, and
      the only place your margin is recorded.
- [ ] Confirm every product image loads. Dead supplier URLs show a placeholder
      rather than a broken image, but a placeholder still will not sell.

## 9. SEO

- [ ] Google Search Console: add property, verify, submit `/sitemap.xml`.
- [ ] Bing Webmaster Tools: same.
- [ ] Work through [`SEO.md`](./SEO.md) — the off-site list is the part that
      matters.

## 10. Final pass

- [ ] `npm run verify` against the deployed URL
      (`VERIFY_BASE_URL=https://yourdomain.com`).
- [ ] Run Lighthouse on mobile for `/`, `/shop` and a product page.
- [ ] Open the site on a real phone. Buy something. Read the receipt on that
      phone.
- [ ] Check the footer support email is the address you actually read.

## Known limitations

- **No sales tax calculation.** Prices are tax-inclusive and the terms say so.
  If you cross an economic-nexus threshold in any state, add Stripe Tax.
- **US shipping only.** Enforced at checkout by the address validation.
- **No customer accounts.** Guest checkout only; order pages are reached via
  the tokenised link in the receipt.
- **One administrator.** Adding a second means inserting a row by hand.
- **Refunds are issued in Stripe or PayPal**, not from the admin. Marking an
  order refunded records the status and deliberately does not restock.
