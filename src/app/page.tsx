import Link from "next/link";

import { ArrowUpRight } from "@/components/icons/arrow-up-right";
import { ProductCard } from "@/components/products/product-card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { creativeTools, products } from "@/data/products";

export default function Home() {
  return <>
    <Section atmosphere="studio" className="border-b border-[color:var(--color-line)]">
      <Container className="grid min-h-[76svh] content-end gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:py-36">
        <p className="eyebrow lg:col-span-3">Independent software studio<br />Berlin · Everywhere</p>
        <div className="lg:col-span-8 lg:col-start-5"><h1 className="type-display max-w-5xl text-balance text-6xl leading-[0.92] sm:text-8xl lg:text-9xl">Tools for a more attentive practice.</h1><p className="type-body mt-10 max-w-xl text-lg leading-8 sm:text-xl">sonder makes purposeful software for the people who notice how things work — and how they could work better.</p></div>
      </Container>
    </Section>
    <Section atmosphere="apps" className="border-b border-[color:var(--color-line)] py-20 sm:py-28">
      <Container><div className="mb-14 grid gap-6 sm:grid-cols-2 sm:items-end"><div><p className="eyebrow">Selected apps</p><h2 className="type-display mt-4 text-5xl leading-none sm:text-6xl">Made for the work behind the work.</h2></div><Link className="link inline-flex items-center gap-1 justify-self-start sm:justify-self-end" href="/apps">View all apps <ArrowUpRight aria-hidden className="size-4" /></Link></div><div className="grid border-l border-t border-[color:var(--color-line)] md:grid-cols-3">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></Container>
    </Section>
    <Section atmosphere="creative" className="scroll-mt-20 border-b border-[color:var(--color-line)] py-20 sm:py-28" id="creative">
      <Container className="grid gap-12 lg:grid-cols-12"><div className="lg:col-span-3"><p className="eyebrow">Creative tools</p></div><div className="lg:col-span-8 lg:col-start-5"><h2 className="type-display max-w-3xl text-5xl leading-none sm:text-6xl">Small instruments for musical ideas.</h2><p className="type-body mt-8 max-w-xl text-lg leading-8">A parallel practice in Max for Live devices and experimental music software — made to invite a different kind of listening.</p><div className="mt-14 divide-y divide-[color:var(--color-line)] border-y border-[color:var(--color-line)]">{creativeTools.map((tool) => <article key={tool.name} className="grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-baseline"><div><h3 className="text-xl font-medium tracking-[-0.035em]">{tool.name}</h3><p className="type-body mt-2 max-w-lg leading-7">{tool.description}</p></div><p className="type-body text-sm opacity-80">{tool.format}</p></article>)}</div></div></Container>
    </Section>
    <Section atmosphere="neutral" className="py-24 sm:py-36"><Container className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">The studio</p><div className="lg:col-span-8 lg:col-start-5"><p className="type-display max-w-4xl text-5xl leading-[0.98] sm:text-7xl">We believe the tools around a practice should earn their place in it.</p><Link className="link mt-10 inline-flex items-center gap-1" href="/about">About sonder <ArrowUpRight aria-hidden className="size-4" /></Link></div></Container></Section>
  </>;
}
