import { Container } from "@/components/ui/container";
import type { Product } from "@/data/products";

export function ProductHero({ product }: { product: Product }) {
  return (
    <>
      <section className="border-b border-black/10">
        <Container className="grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:py-36">
          <div className="lg:col-span-3">
            <p className="eyebrow">{product.category}</p>
          </div>
          <div className="lg:col-span-8 lg:col-start-5">
            <h1 className="display text-7xl leading-[0.9] sm:text-9xl">{product.name}</h1>
            <p className="display mt-7 max-w-3xl text-4xl leading-[0.98] sm:text-6xl">{product.tagline}</p>
            <p className="mt-8 max-w-2xl text-xl leading-8 text-black/65 sm:text-2xl sm:leading-9">{product.description}</p>
            <dl className="mt-16 grid max-w-2xl gap-y-6 border-t border-black/10 pt-5 text-sm sm:grid-cols-3 sm:gap-x-8">
              <div><dt className="text-black/50">Category</dt><dd className="mt-1 font-medium">{product.category}</dd></div>
              <div><dt className="text-black/50">Platform</dt><dd className="mt-1 font-medium">{product.platform}</dd></div>
              <div><dt className="text-black/50">Status</dt><dd className="mt-1 font-medium">{product.status}</dd></div>
            </dl>
          </div>
        </Container>
      </section>

      <section aria-label={`${product.name} product preview`} className="border-b border-black/10 py-8 sm:py-12">
        <Container>
          <div className="relative flex aspect-[16/10] items-end overflow-hidden border border-black/10 bg-[#eae8e1] p-6 sm:p-10">
            <div aria-hidden="true" className="absolute inset-5 border border-black/[0.07] sm:inset-8" />
            <div className="relative">
              <p className="eyebrow">{product.media.label}</p>
              <p className="mt-3 max-w-md text-lg leading-7 text-black/60 sm:text-xl">{product.media.description}</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-black/10 py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-12">
          <p className="eyebrow lg:col-span-3">Made with attention</p>
          <div className="lg:col-span-8 lg:col-start-5">
            <div className="divide-y divide-black/10 border-y border-black/10">
              <EditorialDetail title="The need" text={product.problem} />
              <EditorialDetail title="The approach" text={product.philosophy} />
              <EditorialDetail title="For" text={product.audience} />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-24 sm:py-36">
        <Container className="grid gap-10 lg:grid-cols-12">
          <p className="eyebrow lg:col-span-3">In direction</p>
          <div className="lg:col-span-8 lg:col-start-5">
            <h2 className="display max-w-4xl text-5xl leading-[0.98] sm:text-7xl">{product.direction.statement}</h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-black/65 sm:text-xl">{product.direction.description}</p>
          </div>
        </Container>
      </section>
    </>
  );
}

function EditorialDetail({ title, text }: { title: string; text: string }) {
  return (
    <section className="grid gap-4 py-7 sm:grid-cols-[10rem_1fr] sm:gap-8 sm:py-9">
      <h2 className="text-sm font-medium text-black/55">{title}</h2>
      <p className="max-w-2xl text-xl leading-8 tracking-[-0.025em] text-black/75 sm:text-2xl sm:leading-9">{text}</p>
    </section>
  );
}
