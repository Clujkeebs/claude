import type { Metadata } from "next";
import { SearchField } from "@/components/SearchField";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="container-page py-20 md:py-28">
      <div className="container-prose text-center">
        <p
          aria-hidden="true"
          className="font-display text-4xl text-plum-500"
        >
          404
        </p>
        <h1 className="mt-4 text-3xl text-plum-900">{copy.notFound.heading}</h1>
        <p className="mt-4 text-muted">{copy.notFound.body}</p>

        <div className="mx-auto mt-10 max-w-md text-left">
          <SearchField />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/shop">{copy.notFound.cta}</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
