import Image from "next/image";

import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

export function HomepageFooter() {
  return <footer className="border-t border-[color:var(--color-line)]">
    <Container className="flex flex-col gap-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:py-6">
      <Image alt="sonder" height={22} src="/sonder-wordmark.svg" unoptimized width={91} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
        <a className="link w-fit" href={`mailto:${site.email}`}>{site.email}</a>
        <p className="type-body opacity-80">© {new Date().getFullYear()} sonder</p>
      </div>
    </Container>
  </footer>;
}
