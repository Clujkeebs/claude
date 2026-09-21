# Placeholders to fill before launch

Every `[BRACKETED]` value in the codebase, and where it lives. None of these
were invented — real business details cannot be guessed, so they are marked.

Search for them at any time:

```bash
grep -rn "\[[A-Z ,.]\{3,\}\]" src/content/
```

## Legal identity

| Placeholder | Where | What it needs |
| --- | --- | --- |
| `[LEGAL ENTITY NAME]` | `src/content/legal.ts` — privacy, terms (×3) | The registered name you trade under. A sole proprietorship can use your own legal name. |
| `[BUSINESS ADDRESS]` | `src/content/legal.ts` — privacy | A contactable address. Many jurisdictions require one on a commerce site. A registered-agent or PO box address is usually acceptable. |
| `[STATE]`, `[COUNTRY]` | `src/content/legal.ts` — terms, governing law (×3) | Where disputes are governed. Normally where the business is registered. |

## Operational

| Placeholder | Where | What it needs |
| --- | --- | --- |
| `[HOSTING REGION]` | `src/content/legal.ts` — privacy | The Railway region your database runs in, e.g. "the United States (us-west)". Visible in the Railway dashboard. |
| `[RETENTION PERIOD, e.g. 7 years]` | `src/content/legal.ts` — privacy | How long you keep order records. Driven by tax rules where you file. |
| `[DATE POLICIES REVIEWED]` | `src/content/legal.ts` — `LAST_UPDATED` | The date a lawyer signed off. Shown on every policy page. |

## Not placeholders, but change them anyway

| Value | Where | Note |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | environment | Must be your real domain before launch, or canonical URLs, the sitemap and payment redirects all point at the Railway subdomain. |
| `EMAIL_FROM` | environment | `onboarding@resend.dev` only delivers to the Resend account owner. Verify your own domain and send from it, or customers get nothing. |
| Support email | `src/lib/site.ts` | Currently `clujkeebs@gmail.com`. Appears on every policy page, the FAQ, the footer and every order email. |

## Legal disclaimer

The policies are drafts written to be readable and to limit liability sensibly.
They are **not legal advice**. Every policy page says so on its face. Have a
lawyer in your jurisdiction review all four before you take a real order —
particularly the limitation of liability, the indemnity, and the age and safety
language, which are the clauses that matter if something goes wrong.
