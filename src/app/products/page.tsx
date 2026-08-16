import type { Metadata } from "next";
import { ProductCard } from "@/components/products/product-card";
import { Container } from "@/components/ui/container";
import { products } from "@/data/products";

export const metadata: Metadata = { title: "Products", description: "Refined macOS tools by sonder." };

export default function ProductsPage() {
  return <Container className="py-20 sm:py-28"><header className="max-w-3xl border-b border-black/10 pb-14 sm:pb-20"><p className="eyebrow">Products</p><h1 className="mt-5 text-5xl font-medium tracking-[-0.055em] sm:text-7xl">Made for the work behind the work.</h1><p className="mt-7 text-lg leading-8 text-black/65 sm:text-xl">A growing collection of precise, considered software for macOS.</p></header><div className="mt-14 grid border-l border-t border-black/10 md:grid-cols-3">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></Container>;
}
