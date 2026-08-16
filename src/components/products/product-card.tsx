import Link from "next/link";
import { ArrowUpRight } from "@/components/icons/arrow-up-right";
import type { Product } from "@/data/products";

export function ProductCard({ product }: { product: Product }) {
  return <Link className="group flex min-h-80 flex-col border-b border-r border-[color:var(--color-line)] p-6 transition-colors hover:bg-black/[0.03] sm:p-8" href={`/apps/${product.slug}`}><div className="type-body flex items-center justify-between gap-4 text-sm"><span>{product.platform}</span><span>{product.status}</span></div><div className="mt-auto pt-16"><h3 className="text-3xl font-medium tracking-[-0.045em]">{product.name}</h3><p className="type-body mt-3 max-w-xs leading-7">{product.description}</p><span className="mt-7 inline-flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Explore <ArrowUpRight aria-hidden className="size-4" /></span></div></Link>;
}
