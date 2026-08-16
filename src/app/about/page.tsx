import type { Metadata } from "next";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "About", description: "sonder is an independent software studio." };

export default function AboutPage() {
  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">About sonder</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="text-balance text-5xl font-medium tracking-[-0.055em] sm:text-7xl">An independent studio for considered software.</h1><div className="mt-10 max-w-2xl space-y-6 text-lg leading-8 text-black/65"><p>sonder is a small software studio making tools for creative professionals. We believe everyday software can be useful, precise, and quietly enjoyable to use.</p><p>Our work spans macOS apps, focused utilities, and experimental music tools. Each begins with a simple question: what would make this part of the process feel clearer?</p></div></div></div></Container>;
}
