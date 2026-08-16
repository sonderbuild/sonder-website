import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";

const navigation = [
  { href: "/apps", label: "Apps" },
  { href: "/#creative", label: "Creative" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Account" },
];

export function Header() {
  return <header className="sticky top-0 z-10 border-b border-[color:var(--color-line)] bg-[color:var(--color-paper)]/90 backdrop-blur-sm"><Container className="flex min-h-16 items-center justify-between gap-6 py-3"><Link aria-label="sonder home" className="shrink-0" href="/"><Image alt="sonder" height={29} src="/sonder-wordmark.svg" unoptimized width={119} /></Link><nav aria-label="Main navigation" className="overflow-x-auto"><ul className="flex items-center gap-4 whitespace-nowrap text-sm sm:gap-6">{navigation.map((item) => <li key={item.href}><Link className="link" href={item.href}>{item.label}</Link></li>)}</ul></nav></Container></header>;
}
