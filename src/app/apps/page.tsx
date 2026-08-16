import type { Metadata } from "next";

import { ProductCard } from "@/components/products/product-card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { products } from "@/data/products";

export const metadata: Metadata = { title: "Apps", description: "Refined macOS apps by sonder." };

export default function ProductsPage() {
  return <Section atmosphere="apps" className="min-h-full"><Container className="py-20 sm:py-28"><header className="max-w-3xl border-b border-[color:var(--color-line)] pb-14 sm:pb-20"><p className="eyebrow">Apps</p><h1 className="type-display mt-5 text-6xl leading-[0.94] sm:text-8xl">Made for the work behind the work.</h1><p className="type-body mt-8 text-lg leading-8 sm:text-xl">A growing collection of precise, considered software for macOS.</p></header><div className="mt-14 grid border-l border-t border-[color:var(--color-line)] md:grid-cols-3">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></Container></Section>;
}
