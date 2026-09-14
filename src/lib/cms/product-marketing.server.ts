import "server-only";

import { getProduct } from "@/data/products";

import { normalizeProductMarketingContent, type ProductMarketingContent } from "./product-marketing";
import { fetchPublishedSanityProductMarketing } from "./sanity.server";
import { sourceProductMarketingContent } from "./source-product-marketing";

export type PublicProductRouteId = "pulse" | "frame" | "crate";
type ContentLoader = (productId: PublicProductRouteId) => Promise<unknown>;

export async function getProductMarketingContent(productId: PublicProductRouteId, load: ContentLoader = fetchPublishedSanityProductMarketing): Promise<ProductMarketingContent> {
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

function sourceFallback(productId: PublicProductRouteId): ProductMarketingContent {
  const product = getProduct(productId);
  if (!product) throw new Error(`Missing source fallback for ${productId}.`);
  return sourceProductMarketingContent(product);
}
