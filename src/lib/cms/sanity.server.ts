import "server-only";

import type { CanonicalProductId } from "./product-marketing";

const query = `*[_type == "productMarketing" && productId == $productId]{
  productId, title, tagline,
  "hero": {"description": hero.description},
  "featureSections": featureSections[]{_type, eyebrow, statement, title, description},
  "media": media[]{"url": image.asset->url, alt, label, description},
  "faq": faq[]{question, answer},
  "seo": {title, description, "socialImageUrl": socialImage.asset->url}
}`;

export function isSanityPublishedContentConfigured(environment = process.env): boolean {
  return Boolean(environment.SANITY_PROJECT_ID && environment.SANITY_DATASET);
}

export async function fetchPublishedSanityProductMarketing(productId: CanonicalProductId, fetcher: typeof fetch = fetch): Promise<unknown> {
  const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset, SANITY_API_VERSION: apiVersion = "2026-09-14" } = process.env;
  if (!projectId || !dataset) return null;

  const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`);
  url.searchParams.set("query", query);
  url.searchParams.set("$productId", JSON.stringify(productId));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetcher(url, { signal: controller.signal, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`Sanity published-content request failed with ${response.status}.`);
    const body: unknown = await response.json();
    return isResult(body) ? body.result : null;
  } finally {
    clearTimeout(timeout);
  }
}

function isResult(value: unknown): value is { result: unknown } {
  return typeof value === "object" && value !== null && "result" in value;
}
