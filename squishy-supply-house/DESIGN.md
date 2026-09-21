# Design system — Squishy Supply House by Clujkeebs

Everything here is derived from the logo. The logo is the only decorative
element in the brand; the rest of the site is quiet so the products carry the
colour.

## Intended feel

A small shop that takes its inventory seriously. The logo is playful, so the
site around it is calm — deep plum ink on warm paper, wide margins, one accent
colour used sparingly. Product photography does the talking; the interface gets
out of the way. Nothing bounces, nothing glows, nothing autoplays. It should
feel closer to a well-made stationery shop than to a toy store, so that a
$12 squishy reads as something chosen rather than something dumped into a grid.

## Palette

Three brand colours plus warm neutrals, all sampled from the logo.

### Brand

| Token | Hex | Use |
| --- | --- | --- |
| `--color-plum-900` | `#2A1338` | Body text, headings, footer background |
| `--color-plum-700` | `#3B1D4F` | Primary buttons, active nav, focus ring |
| `--color-plum-500` | `#9A6FD4` | Logo lilac. Dividers, quiet fills, chart-free accents |
| `--color-plum-100` | `#EFE7F7` | Tinted panels, hover backgrounds |

### Accents

| Token | Hex | Use |
| --- | --- | --- |
| `--color-pink-500` | `#EF6D9B` | Logo pink. Decorative only — rules, underlines, badges |
| `--color-pink-700` | `#B8386B` | Pink when it must carry text (sale, low stock) |
| `--color-blue-500` | `#6BB3E5` | Logo blue. Decorative only |
| `--color-blue-700` | `#2C7CB5` | Blue when it must carry text (info notices) |

### Neutrals

| Token | Hex | Use |
| --- | --- | --- |
| `--color-paper` | `#FDFBF7` | Page background. Warm, not white |
| `--color-surface` | `#FFFFFF` | Cards, product tiles, inputs |
| `--color-border` | `#E6DFEA` | Hairlines, input borders |
| `--color-muted` | `#6B5B75` | Secondary text, captions, meta |
| `--color-success-700` | `#2F6D4F` | In stock, order paid |
| `--color-danger-700` | `#A32F32` | Errors, sold out |

### Contrast rules

The logo pink and blue are too light to carry white text at AA, so they are
never button or text backgrounds. Primary actions are plum-700 with white text
(14.2:1). Pink and blue appear as 2–4px rules, small badges on tinted
backgrounds, and the logo itself. Where pink or blue must carry meaning in
text, the `-700` variants are used on paper (both clear AA at body size).

Verified pairings:

- `plum-900` on `paper` — 15.8:1
- `plum-700` on `paper` — 13.5:1
- white on `plum-700` — 14.2:1
- `muted` on `paper` — 6.1:1
- `pink-700` on `paper` — 5.4:1
- `blue-700` on `paper` — 4.9:1

## Type

**Display — Fraunces.** A variable serif with `SOFT` and `WONK` axes. Set at
`SOFT 40`, `WONK 1`, weight 600. The soft axis rounds the terminals, which
picks up the rounded forms in the logo without resorting to a bubble font. Used
for page headings, product names on detail pages, and prices.

**Body — Karla.** A grotesque with slightly odd, friendly details that hold up
at 14–16px. Used for everything else: navigation, body copy, buttons, form
labels, tables.

Loaded through `next/font/google` with `display: swap` and preloaded subsets, so
there is no layout shift and no render-blocking stylesheet.

### Scale

Fluid, built on a 1.25 ratio at desktop and 1.2 at mobile. Defined once as
custom properties and never overridden with arbitrary Tailwind sizes.

| Token | Clamp | Typical use |
| --- | --- | --- |
| `--text-xs` | `0.75rem` | Meta, legal fine print |
| `--text-sm` | `0.875rem` | Captions, table cells, helper text |
| `--text-base` | `1rem` | Body |
| `--text-lg` | `clamp(1.0625rem, 0.3vw + 1rem, 1.125rem)` | Lead paragraphs |
| `--text-xl` | `clamp(1.25rem, 0.5vw + 1.1rem, 1.375rem)` | Card headings |
| `--text-2xl` | `clamp(1.5rem, 1vw + 1.25rem, 1.75rem)` | Section headings |
| `--text-3xl` | `clamp(1.875rem, 2vw + 1.4rem, 2.5rem)` | Page headings |
| `--text-4xl` | `clamp(2.25rem, 3.5vw + 1.5rem, 3.5rem)` | Home hero only |

Line height: 1.15 on display sizes, 1.6 on body. Measure capped at 68
characters for prose.

## Spacing

A 4px base. Only these steps are used; no arbitrary values in components.

`--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px ·
`--space-5` 24px · `--space-6` 32px · `--space-7` 48px · `--space-8` 64px ·
`--space-9` 96px · `--space-10` 128px

Section rhythm: `--space-9` between major page sections on desktop,
`--space-7` on mobile. Page gutter: 20px mobile, 32px tablet, 48px desktop,
with content capped at 1200px and prose at 720px.

## Form and motion

- Radius: 10px on inputs and buttons, 14px on cards, 999px on badges. One step
  larger on the product image frame so it echoes the logo's rounded forms.
- Elevation: one shadow only, `0 1px 2px rgb(42 19 56 / 0.06)`. Cards separate
  by border and background, not by drop shadow.
- Borders: 1px `--color-border`, except the 2px pink rule under section
  headings, which is the one piece of ornament the system allows.
- Motion: 150ms ease-out on colour and border, 200ms on transform. Buttons
  translate 1px down on `:active`. Cart count scales once on change. Everything
  inside `@media (prefers-reduced-motion: reduce)` collapses to no transform
  and 0.01ms duration.
- Focus: 2px `--color-plum-700` ring at 2px offset, always visible, never
  removed. Never `outline: none` without a replacement.

## Product imagery

Dropshipped photography varies wildly in quality and crop, so every product
image is normalised by the interface rather than trusted:

- Fixed 1:1 aspect ratio, `object-fit: cover`, centred.
- White `--color-surface` frame with 14px radius and a 1px border, so mixed
  supplier backgrounds sit on one consistent field.
- `next/image` with explicit sizes, `quality={82}`, remote hosts allowlisted in
  `next.config.ts`. First row of the grid is priority-loaded; the rest lazy.
- Alt text is required at the data layer, defaulting to the product name.

## Components with designed states

Every one of these has a real state, not a default:

- Buttons: rest, hover, active (1px press), focus-visible ring, disabled,
  loading with an inline spinner and unchanged width.
- Product card: in stock, low stock (pink-700 badge), sold out (desaturated
  image, disabled action).
- Cart: empty state with copy and a route back to the shop, line-item quantity
  stepper with optimistic totals, removal with undo.
- Catalogue: empty state for a shop with no products yet, and a distinct
  no-results state for a search that matched nothing.
- Forms: inline validation on blur, error text tied via `aria-describedby`,
  server errors surfaced above the form, success confirmations.
- Loading: skeletons that match the final layout's dimensions so nothing
  shifts.
- 404: designed page with search and a route back to the shop.
- Order confirmation: reads as a receipt — order number, itemised lines,
  totals, shipping address, support email.
