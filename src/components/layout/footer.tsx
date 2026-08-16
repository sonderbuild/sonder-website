import Image from "next/image";

import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

export function Footer() {
  return <footer className="border-t border-black/10"><Container className="grid gap-10 py-10 sm:grid-cols-2 sm:py-12"><div><Image alt="sonder" height={29} src="/sonder-wordmark.svg" unoptimized width={119} /><p className="mt-3 max-w-xs text-sm leading-6 text-black/60">Independent software for creative professionals.</p></div><div className="sm:justify-self-end sm:text-right"><a className="link" href={`mailto:${site.email}`}>{site.email}</a><p className="mt-5 text-sm text-black/50">© {new Date().getFullYear()} sonder</p></div></Container></footer>;
}
