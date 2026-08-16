import type { Metadata } from "next";
import { ArrowUpRight } from "@/components/icons/arrow-up-right";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with sonder." };

export default function ContactPage() {
  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Contact</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="text-balance text-5xl font-medium tracking-[-0.055em] sm:text-7xl">Let&apos;s make something clear.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8 sm:text-xl">For product questions, collaborations, or a note about our work, send us an email.</p><a className="link mt-10 inline-flex items-center gap-1 text-xl" href={`mailto:${site.email}`}>{site.email} <ArrowUpRight aria-hidden className="size-5" /></a></div></div></Container>;
}
