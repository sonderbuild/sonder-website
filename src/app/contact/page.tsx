import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with sonder." };

export default function ContactPage() {
  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Contact</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="text-balance text-5xl font-medium tracking-[-0.055em] sm:text-7xl">Let&apos;s make something clear.</h1><p className="mt-8 max-w-xl text-lg leading-8 text-black/65 sm:text-xl">For product questions, collaborations, or a note about our work, send us an email.</p><a className="link mt-10 inline-flex text-xl" href={`mailto:${site.email}`}>{site.email} <span aria-hidden="true">↗</span></a></div></div></Container>;
}
