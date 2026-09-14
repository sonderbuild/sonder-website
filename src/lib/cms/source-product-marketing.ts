import type { Product, ProductSection } from "@/data/products";

import type { ProductMarketingContent, ProductMarketingFeatureSection } from "./product-marketing";

export function sourceProductMarketingContent(product: Product): ProductMarketingContent {
  return {
    productId: product.slug,
    title: product.name,
    tagline: product.tagline,
    hero: { description: product.description },
    featureSections: product.sections.flatMap(toFeatureSection),
    media: product.sections.flatMap(toMedia),
    faq: [],
    seo: { title: product.name, description: product.description },
  };
}

export function productWithMarketingContent(product: Product, content: ProductMarketingContent): Product {
  const featureSections: ProductSection[] = content.featureSections.map((section) => section.kind === "statement"
    ? { type: "statement", ...(section.eyebrow ? { eyebrow: section.eyebrow } : {}), statement: section.statement, ...(section.description ? { description: section.description } : {}) }
    : { type: "feature-highlight", ...(section.eyebrow ? { eyebrow: section.eyebrow } : {}), title: section.title, description: section.description });
  const mediaSections: ProductSection[] = content.media.map((media) => ({
    type: "media",
    media: { kind: "image", label: media.label ?? `${content.title}, in use`, ...(media.description ? { description: media.description } : {}), ...(media.url ? { src: media.url, alt: media.alt } : {}) },
  }));
  return {
    ...product,
    name: content.title,
    tagline: content.tagline,
    description: content.hero.description,
    sections: [...featureSections.slice(0, 1), ...mediaSections, ...featureSections.slice(1)],
  };
}

function toFeatureSection(section: ProductSection): ProductMarketingFeatureSection[] {
  if (section.type === "statement") return [{ kind: "statement", ...(section.eyebrow ? { eyebrow: section.eyebrow } : {}), statement: section.statement, ...(section.description ? { description: section.description } : {}) }];
  if (section.type === "feature-highlight") return [{ kind: "feature", ...(section.eyebrow ? { eyebrow: section.eyebrow } : {}), title: section.title, description: section.description }];
  return [];
}

function toMedia(section: ProductSection): ProductMarketingContent["media"] {
  if (section.type !== "media" || section.media.kind !== "image") return [];
  return [{ ...(section.media.src ? { url: section.media.src } : {}), alt: section.media.alt ?? section.media.label, ...(section.media.label ? { label: section.media.label } : {}), ...(section.media.description ? { description: section.media.description } : {}) }];
}
