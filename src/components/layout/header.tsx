import Link from "next/link";

import { Container } from "@/components/ui/container";

const navigation = [
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return <header className="border-b border-black/10"><Container className="flex min-h-16 items-center justify-between gap-8 py-3"><Link className="text-xl font-semibold tracking-[-0.06em]" href="/">sonder</Link><nav aria-label="Main navigation"><ul className="flex items-center gap-5 text-sm sm:gap-7">{navigation.map((item) => <li key={item.href}><Link className="link" href={item.href}>{item.label}</Link></li>)}</ul></nav></Container></header>;
}
