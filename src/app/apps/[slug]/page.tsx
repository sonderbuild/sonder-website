import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductHero } from "@/components/products/product-hero";
import { ProductSection } from "@/components/products/product-section";
import { getProduct, products } from "@/data/products";
import { getProductMarketingContent } from "@/lib/cms/product-marketing.server";
import { productWithMarketingContent } from "@/lib/cms/source-product-marketing";

type ProductPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return products.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  if (product.slug !== "monitor") return { title: product.name, description: product.description };
  const content = await getProductMarketingContent("monitor");
  return { title: content.seo.title ?? content.title, description: content.seo.description ?? content.hero.description };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const renderedProduct = product.slug === "monitor"
    ? productWithMarketingContent(product, await getProductMarketingContent("monitor"))
    : product;
  return <><ProductHero product={renderedProduct} />{renderedProduct.sections.map((section, index) => <ProductSection key={`${section.type}-${index}`} productName={renderedProduct.name} section={section} />)}</>;
}
