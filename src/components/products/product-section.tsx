import { ProductMedia } from "@/components/products/product-media";
import { ProductStatement } from "@/components/products/product-statement";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { ProductSection as ProductSectionData } from "@/data/products";

export function ProductSection({ section, productName }: { section: ProductSectionData; productName: string }) {
  if (section.type === "media") return <ProductMedia media={section.media} productName={productName} />;
  if (section.type === "statement") return <ProductStatement {...section} />;
  if (section.type === "feature-highlight") {
    return <Section atmosphere="apps" className="border-b border-[color:var(--color-line)] py-20 sm:py-28"><Container className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">{section.eyebrow}</p><div className="lg:col-span-8 lg:col-start-5"><h2 className="type-display text-5xl leading-[0.98] sm:text-7xl">{section.title}</h2><p className="type-body mt-8 max-w-xl text-lg leading-8 sm:text-xl">{section.description}</p></div></Container></Section>;
  }
  return <Section atmosphere="studio" className="border-b border-[color:var(--color-line)] py-20 sm:py-28"><Container className="grid gap-12 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">{section.eyebrow ?? section.title}</p><div className="lg:col-span-8 lg:col-start-5"><div className="divide-y divide-[color:var(--color-line)] border-y border-[color:var(--color-line)]">{section.items.map((item) => <article key={item.title} className="grid gap-4 py-7 sm:grid-cols-[10rem_1fr] sm:gap-8 sm:py-9"><h2 className="type-metadata">{item.title}</h2><p className="type-body max-w-2xl text-xl leading-8 tracking-[-0.025em] sm:text-2xl sm:leading-9">{item.text}</p></article>)}</div></div></Container></Section>;
}
