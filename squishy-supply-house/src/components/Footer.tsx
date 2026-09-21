import Link from "next/link";
import { Logo } from "@/components/Logo";
import { copy } from "@/content/copy";
import { footerLinks, site } from "@/lib/site";

const groups = [
  { heading: "Shop", links: footerLinks.shop },
  { heading: "Help", links: footerLinks.help },
  { heading: "Legal", links: footerLinks.legal },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-plum-100/40">
      <div className="container-page py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-8">
          <div>
            <Logo height={56} />
            <p className="mt-4 max-w-xs text-sm text-muted">{copy.footer.blurb}</p>
            <a
              href={`mailto:${site.supportEmail}`}
              className="mt-4 inline-block text-sm font-medium text-plum-700 underline underline-offset-4 hover:text-plum-900"
            >
              {site.supportEmail}
            </a>
          </div>

          {groups.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-sm font-semibold tracking-wide text-plum-900 uppercase">
                {group.heading}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-plum-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.footer.rights(new Date().getFullYear())}</p>
          <p>{copy.footer.legalNote}</p>
        </div>
      </div>
    </footer>
  );
}
