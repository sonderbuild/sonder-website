import Link from "next/link";
import type { Product } from "@/data/products";

export function ProductCard({ product }: { product: Product }) {
  return <Link className="group flex min-h-80 flex-col border-b border-r border-black/10 p-6 transition-colors hover:bg-black/[0.03] sm:p-8" href={`/apps/${product.slug}`}><div className="flex items-center justify-between gap-4 text-sm text-black/55"><span>{product.platform}</span><span>{product.status}</span></div><div className="mt-auto pt-16"><h3 className="text-3xl font-medium tracking-[-0.045em]">{product.name}</h3><p className="mt-3 max-w-xs leading-7 text-black/65">{product.description}</p><span className="mt-7 inline-flex text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Explore <span aria-hidden="true">↗</span></span></div></Link>;
}
