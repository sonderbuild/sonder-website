import type { Metadata } from "next";

import { CreativeMediaFoundation } from "@/components/creative/creative-media-foundation";
import { CreativeProjectList } from "@/components/creative/creative-project-list";
import { AtmosphereBackground } from "@/components/ui/atmosphere-background";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { creativeProjects } from "@/data/creative";

export const metadata: Metadata = {
  title: "Creative",
  description: "Experimental music software and small creative tools by sonder.",
};

const media = creativeProjects.flatMap((project) => project.media);

export default function CreativePage() {
  return <>
    <Section atmosphere="creative" className="relative isolate overflow-hidden border-b border-[color:var(--color-line)]">
      <AtmosphereBackground variant="creative" />
      <Container className="relative py-24 sm:py-36">
        <div className="max-w-4xl">
          <p className="eyebrow">Creative</p>
          <h1 className="type-display mt-5 text-6xl leading-[0.94] sm:text-8xl">Small instruments for musical ideas.</h1>
          <p className="type-body mt-8 max-w-2xl text-lg leading-8 sm:text-xl">Alongside apps, sonder explores tools for sound, rhythm, and unusual workflows. They are made to be touched, tested, and taken somewhere unexpected.</p>
        </div>
      </Container>
    </Section>

    <Section atmosphere="creative" className="border-b border-[color:var(--color-line)] py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3">Current explorations</p>
        <div className="lg:col-span-8 lg:col-start-5"><CreativeProjectList projects={creativeProjects} /></div>
      </Container>
    </Section>

    <Section atmosphere="neutral" className="border-b border-[color:var(--color-line)] py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-3"><p className="eyebrow">Media, in time</p></div>
        <div className="lg:col-span-8 lg:col-start-5"><p className="type-display max-w-3xl text-4xl leading-[0.98] sm:text-5xl">A place for the work to be seen, heard, and understood in use.</p><div className="mt-12"><CreativeMediaFoundation media={media} /></div></div>
      </Container>
    </Section>

    <Section atmosphere="creative" className="py-24 sm:py-36">
      <Container className="grid gap-10 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3">The lab</p>
        <p className="type-display max-w-4xl text-5xl leading-[0.98] lg:col-span-8 lg:col-start-5 sm:text-7xl">Software can also be an instrument.</p>
      </Container>
    </Section>
  </>;
}
