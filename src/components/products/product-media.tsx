import Image from "next/image";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { ProductMedia as ProductMediaData } from "@/data/products";

export function ProductMedia({ media, productName }: { media: ProductMediaData; productName: string }) {
  const label = `${productName} product preview`;

  return <Section aria-label={label} atmosphere="neutral" className="border-b border-[color:var(--color-line)] py-8 sm:py-12">
    <Container>
      <div className="relative flex aspect-[16/10] items-end overflow-hidden border border-[color:var(--color-line)] bg-[color:var(--color-paper-soft)] p-6 sm:p-10">
        {media.src && media.kind === "image" ? <Image alt={media.alt ?? media.label} className="object-cover" fill sizes="(min-width: 1280px) 1280px, 100vw" src={media.src} /> : null}
        {media.src && media.kind === "video" ? <video aria-label={media.alt ?? media.label} className="absolute inset-0 size-full object-cover" controls src={media.src} /> : null}
        {media.src && media.kind === "gif" ? <Image alt={media.alt ?? media.label} className="object-cover" fill sizes="(min-width: 1280px) 1280px, 100vw" src={media.src} unoptimized /> : null}
        {media.src && media.kind === "demo" ? <iframe className="absolute inset-0 size-full border-0" src={media.src} title={media.alt ?? media.label} /> : null}
        <div aria-hidden="true" className="absolute inset-5 border border-[color:var(--color-line)] sm:inset-8" />
        <div className="relative">
          <p className="eyebrow">{media.label}</p>
          {media.description ? <p className="type-body mt-3 max-w-md text-lg leading-7 sm:text-xl">{media.description}</p> : null}
        </div>
      </div>
    </Container>
  </Section>;
}
