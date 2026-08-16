import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export function ProductStatement({ eyebrow, statement, description }: { eyebrow?: string; statement: string; description?: string }) {
  return <Section atmosphere="studio" className="py-24 sm:py-36">
    <Container className="grid gap-10 lg:grid-cols-12">
      {eyebrow ? <p className="eyebrow lg:col-span-3">{eyebrow}</p> : null}
      <div className="lg:col-span-8 lg:col-start-5">
        <h2 className="type-display max-w-4xl text-5xl leading-[0.98] sm:text-7xl">{statement}</h2>
        {description ? <p className="type-body mt-8 max-w-xl text-lg leading-8 sm:text-xl">{description}</p> : null}
      </div>
    </Container>
  </Section>;
}
