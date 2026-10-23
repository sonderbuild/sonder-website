import "server-only";

import { products } from "@/data/products";
import type { CanonicalProductId } from "@/data/product-identities";

import { normalizeProductMarketingContent, type ProductMarketingContent } from "./product-marketing";
import { fetchPublishedSanityProductMarketing } from "./sanity.server";
import { sourceProductMarketingContent } from "./source-product-marketing";

type ContentLoader = (productId: CanonicalProductId) => Promise<unknown>;

export async function getProductMarketingContent(productId: CanonicalProductId, load: ContentLoader = fetchPublishedSanityProductMarketing): Promise<ProductMarketingContent> {
  const fallback = sourceFallback(productId);
  try {
    const result = await load(productId);
    if (!Array.isArray(result) || result.length !== 1) return fallback;
    const content = normalizeProductMarketingContent(result[0]);
    return content?.productId === productId ? content : fallback;
  } catch {
    return fallback;
  }
}

function sourceFallback(productId: CanonicalProductId): ProductMarketingContent {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) throw new Error(`Missing source fallback for ${productId}.`);
  return sourceProductMarketingContent(product);
}
