import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { Product } from "@/data/products";

export function ProductHero({ product }: { product: Product }) {
  return <Section atmosphere="apps" className="border-b border-[color:var(--color-line)]">
    <Container className="grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:py-36">
      <div className="lg:col-span-3"><p className="eyebrow">{product.category}</p></div>
      <div className="lg:col-span-8 lg:col-start-5">
        <h1 className="type-display text-7xl leading-[0.9] sm:text-9xl">{product.name}</h1>
        <p className="type-display mt-7 max-w-3xl text-4xl leading-[0.98] sm:text-6xl">{product.tagline}</p>
        <p className="type-body mt-8 max-w-2xl text-xl leading-8 sm:text-2xl sm:leading-9">{product.description}</p>
        <dl className="mt-16 grid max-w-2xl gap-y-6 border-t border-[color:var(--color-line)] pt-5 text-sm sm:grid-cols-3 sm:gap-x-8">
          <div><dt className="type-body opacity-80">Category</dt><dd className="mt-1 font-medium">{product.category}</dd></div>
          <div><dt className="type-body opacity-80">Platform</dt><dd className="mt-1 font-medium">{product.platform}</dd></div>
          <div><dt className="type-body opacity-80">Status</dt><dd className="mt-1 font-medium">{product.status}</dd></div>
        </dl>
      </div>
    </Container>
  </Section>;
}
