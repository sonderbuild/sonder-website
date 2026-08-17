import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";

import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

export function Footer({ className = "", ...props }: ComponentPropsWithoutRef<"footer">) {
  return <footer className={`border-t border-[color:var(--color-line)] ${className}`} {...props}><Container className="grid gap-10 py-10 sm:grid-cols-2 sm:py-12"><div><Image alt="sonder" height={29} src="/sonder-wordmark.svg" unoptimized width={119} /><p className="type-body mt-3 max-w-xs text-sm leading-6">Independent software for creative professionals.</p></div><div className="sm:justify-self-end sm:text-right"><a className="link" href={`mailto:${site.email}`}>{site.email}</a><p className="type-body mt-5 text-sm opacity-80">© {new Date().getFullYear()} sonder</p></div></Container></footer>;
}
