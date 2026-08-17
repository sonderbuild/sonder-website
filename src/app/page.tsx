import Link from "next/link";

import { ArrowUpRight } from "@/components/icons/arrow-up-right";
import { HomepageFooter } from "@/components/home/homepage-footer";
import { HomepageScene } from "@/components/home/homepage-scene";
import { AtmosphereBackground } from "@/components/ui/atmosphere-background";
import { Container } from "@/components/ui/container";
import { creativeTools, products } from "@/data/products";

export default function Home() {
  return <div className="homepage-scenes">
    <HomepageScene align="end" atmosphere="studio" className="relative isolate overflow-hidden border-b border-[color:var(--color-line)]">
      <AtmosphereBackground variant="studio" />
      <Container className="relative z-[1] grid content-end gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:py-36">
        <p className="eyebrow lg:col-span-3">Independent software studio<br />Berlin · Everywhere</p>
        <div className="lg:col-span-8 lg:col-start-5">
          <h1 className="type-display max-w-5xl text-balance text-6xl leading-[0.92] sm:text-8xl lg:text-9xl">Thoughtful software tools for the work people care about.</h1>
          <p className="type-body mt-10 max-w-xl text-lg leading-8 sm:text-xl">sonder designs focused apps and creative tools that make everyday practices clearer, calmer, and more rewarding.</p>
        </div>
      </Container>
    </HomepageScene>

    <HomepageScene align="start" atmosphere="apps" className="border-b border-[color:var(--color-line)] py-20 sm:py-28">
      <Container>
        <header className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <p className="eyebrow">Selected apps</p>
            <h2 className="type-display mt-4 max-w-2xl text-5xl leading-none sm:text-6xl">Three considered tools for macOS.</h2>
          </div>
          <p className="type-body max-w-sm leading-7 sm:justify-self-end">Software for understanding your machine, making room for documents, and knowing the music you keep.</p>
        </header>
        <div className="mt-14 grid border-l border-t border-[color:var(--color-line)] md:grid-cols-3">
          {products.map((product) => <Link key={product.slug} className="group flex min-h-[34rem] flex-col border-b border-r border-[color:var(--color-line)] p-6 transition-colors hover:bg-black/[0.03] sm:p-8" href={`/apps/${product.slug}`}>
            <div className="type-body flex items-center justify-between gap-4 text-sm"><span>{product.platform}</span><span>{product.status}</span></div>
            <div className="relative mt-8 flex min-h-52 flex-1 items-end overflow-hidden border border-[color:var(--color-line)] bg-white/15 p-5 sm:min-h-60">
              <div aria-hidden="true" className="absolute inset-4 border border-[color:var(--color-line)]" />
              <p className="type-metadata relative">Future product media</p>
            </div>
            <div className="pt-8">
              <h3 className="text-4xl font-medium tracking-[-0.05em]">{product.name}</h3>
              <p className="type-body mt-3 max-w-xs leading-7">{product.tagline}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">Explore <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
            </div>
          </Link>)}
        </div>
        <Link className="link mt-8 inline-flex items-center gap-1" href="/apps">View all apps <ArrowUpRight aria-hidden className="size-4" /></Link>
      </Container>
    </HomepageScene>

    <HomepageScene align="start" atmosphere="creative" className="border-b border-[color:var(--color-line)] py-20 sm:py-28" id="creative">
      <Container className="grid gap-12 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3">Creative</p>
        <div className="lg:col-span-8 lg:col-start-5">
          <h2 className="type-display max-w-3xl text-5xl leading-none sm:text-6xl">Studio experiments for sound and performance.</h2>
          <p className="type-body mt-8 max-w-xl text-lg leading-8">A parallel practice in Max for Live devices and experimental music tools: software as an instrument, a prompt, or a space to listen differently.</p>
          <div className="mt-14 overflow-hidden border border-[color:var(--color-line)]">
            <div className="relative flex min-h-64 items-end border-b border-[color:var(--color-line)] bg-white/15 p-6 sm:min-h-80 sm:p-8">
              <div aria-hidden="true" className="absolute inset-6 border border-[color:var(--color-line)] sm:inset-8" />
              <p className="type-metadata relative">Future audio, video, and instrument studies</p>
            </div>
            <div className="divide-y divide-[color:var(--color-line)] px-6 sm:px-8">
              {creativeTools.map((tool) => <article key={tool.name} className="grid gap-3 py-7 sm:grid-cols-[1fr_auto] sm:items-baseline"><div><h3 className="text-2xl font-medium tracking-[-0.04em]">{tool.name}</h3><p className="type-body mt-2 max-w-lg leading-7">{tool.description}</p></div><p className="type-metadata">{tool.format}</p></article>)}
            </div>
          </div>
        </div>
      </Container>
    </HomepageScene>

    <HomepageScene align="start" atmosphere="neutral" className="homepage-scene--final">
      <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3">The studio</p>
        <div className="lg:col-span-8 lg:col-start-5">
          <p className="type-display max-w-4xl text-5xl leading-[0.98] sm:text-7xl">Software should leave more room for the practice itself.</p>
          <p className="type-body mt-8 max-w-xl text-lg leading-8">sonder is an independent studio building tools with a clear purpose, a quiet presence, and an enduring place in the work.</p>
          <Link className="link mt-10 inline-flex items-center gap-1" href="/about">About sonder <ArrowUpRight aria-hidden className="size-4" /></Link>
        </div>
      </Container>
      <div className="mt-auto">
        <HomepageFooter />
      </div>
    </HomepageScene>
  </div>;
}
