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
  const limit = 262_144;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new Error("cms_timeout")); }, 3_000);
  });
  try {
    const response = await Promise.race([fetcher(url, { signal: controller.signal, redirect: "manual", cache: "force-cache" }), deadline]);
    const length = response.headers.get("content-length");
    if (!response.ok || length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) {
      void response.body?.cancel().catch(() => {});
      throw new Error("cms_unavailable");
    }
    reader = response.body?.getReader();
    if (!reader) throw new Error("cms_unavailable");
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next.done) { complete = true; break; }
      size += next.value.byteLength;
      if (size > limit) throw new Error("cms_response_oversize");
      parts.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return isResult(body) ? body.result : null;
  } finally {
    clearTimeout(timeout);
    controller.abort();
    if (reader) {
      if (!complete) void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}

function isResult(value: unknown): value is { result: unknown } {
  return typeof value === "object" && value !== null && "result" in value;
}
