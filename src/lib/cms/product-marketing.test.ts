import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getProduct, products } from "@/data/products";

import { canonicalProductIds, isCanonicalProductId, normalizeProductMarketingContent } from "./product-marketing";
import { getProductMarketingContent } from "./product-marketing.server";
import { productWithMarketingContent, sourceProductMarketingContent } from "./source-product-marketing";

const validDocument = {
  productId: "monitor",
  title: "Monitor",
  tagline: "Understand your Mac.",
  hero: { description: "A quiet system monitoring and insights app." },
  featureSections: [
    { _type: "marketingStatement", statement: "Understand your Mac.", description: "Calm context." },
    { _type: "marketingFeature", title: "Live awareness", description: "See changing signals." },
  ],
  media: [{ url: "https://cdn.sanity.io/images/example/monitor.png", alt: "Monitor dashboard", label: "Monitor, in use" }],
  faq: [{ question: "What is Monitor?", answer: "A calm monitoring tool." }],
  seo: { title: "Monitor — sonder", description: "Calm monitoring.", socialImageUrl: "https://cdn.sanity.io/images/example/social.png" },
};

describe("product marketing normalization", () => {
  it("accepts only the canonical product catalog", () => {
    expect(canonicalProductIds).toEqual(["monitor", "frame", "crate", "cue"]);
    for (const productId of canonicalProductIds) expect(isCanonicalProductId(productId)).toBe(true);
    expect(isCanonicalProductId("other")).toBe(false);
  });

  it("normalizes a valid document and drops unknown fields", () => {
    const content = normalizeProductMarketingContent({ ...validDocument, providerId: "not-exposed", pricing: { amount: 99 }, platform: "macOS" });
    expect(content).toEqual({
      productId: "monitor", title: "Monitor", tagline: "Understand your Mac.", hero: { description: "A quiet system monitoring and insights app." },
      featureSections: [
        { kind: "statement", statement: "Understand your Mac.", description: "Calm context." },
        { kind: "feature", title: "Live awareness", description: "See changing signals." },
      ],
      media: [{ url: "https://cdn.sanity.io/images/example/monitor.png", alt: "Monitor dashboard", label: "Monitor, in use" }],
      faq: [{ question: "What is Monitor?", answer: "A calm monitoring tool." }],
      seo: { title: "Monitor — sonder", description: "Calm monitoring.", socialImageUrl: "https://cdn.sanity.io/images/example/social.png" },
    });
    expect(content).not.toHaveProperty("providerId");
    expect(content).not.toHaveProperty("pricing");
    expect(content).not.toHaveProperty("platform");
  });

  it.each([
    [{ ...validDocument, productId: undefined }],
    [{ ...validDocument, title: "" }],
    [{ ...validDocument, tagline: undefined }],
    [{ ...validDocument, featureSections: [{ _type: "marketingFeature", title: "Missing description" }] }],
  ])("rejects malformed required content", (document) => {
    expect(normalizeProductMarketingContent(document)).toBeNull();
  });
});

describe("Monitor marketing adapter", () => {
  it("uses source fallback without CMS content", async () => {
    const content = await getProductMarketingContent("monitor", async () => null);
    expect(content).toEqual(sourceProductMarketingContent(getProduct("monitor")!));
  });

  it("uses source fallback when the CMS request fails, is malformed, missing, duplicated, or mismatched", async () => {
    const fallback = sourceProductMarketingContent(getProduct("monitor")!);
    await expect(getProductMarketingContent("monitor", async () => { throw new Error("unavailable"); })).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("monitor", async () => [{ ...validDocument, title: "" }])).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("monitor", async () => [])).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("monitor", async () => [validDocument, validDocument])).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("monitor", async () => [{ ...validDocument, productId: "frame" }])).resolves.toEqual(fallback);
  });

  it("preserves the existing Monitor fallback page content", () => {
    const sourceProduct = getProduct("monitor")!;
    const rendered = productWithMarketingContent(sourceProduct, sourceProductMarketingContent(sourceProduct));
    expect(rendered.name).toBe(sourceProduct.name);
    expect(rendered.tagline).toBe(sourceProduct.tagline);
    expect(rendered.description).toBe(sourceProduct.description);
    expect(rendered.sections).toEqual(sourceProduct.sections);
  });

  it("keeps Cue valid for CMS data without a public catalog entry", () => {
    expect(isCanonicalProductId("cue")).toBe(true);
    expect(getProduct("cue")).toBeUndefined();
  });
});

describe("multiple product editorial isolation", () => {
  it("keeps unique catalog identities and slugs with unchanged source fallback rendering", () => {
    expect(new Set(products.map(({ id }) => id)).size).toBe(products.length);
    expect(new Set(products.map(({ slug }) => slug)).size).toBe(products.length);
    for (const product of products) {
      expect(isCanonicalProductId(product.id)).toBe(true);
      expect(productWithMarketingContent(product, sourceProductMarketingContent(product))).toEqual(product);
    }
  });
  it.each(["monitor", "frame", "crate"] as const)("uses %s identity for content and preserves platform facts", async (id) => {
    const source = getProduct(id)!;
    const fixture = { ...validDocument, productId: id, title: `Synthetic ${id}`, status: "Available", platform: "fictional", slug: "untrusted", price: 1, downloadUrl: "https://example.invalid/download", entitlement: "untrusted" };
    const content = await getProductMarketingContent(id, async () => [fixture]);
    const rendered = productWithMarketingContent(source, content);
    expect(content.productId).toBe(id);
    expect(rendered.name).toBe(`Synthetic ${id}`);
    for (const key of ["id", "slug", "marketingSource", "status", "platform", "category"] as const) expect(rendered[key]).toBe(source[key]);
    for (const key of ["price", "downloadUrl", "entitlement"]) {
      expect(content).not.toHaveProperty(key);
      expect(rendered).not.toHaveProperty(key);
    }
    expect(sourceProductMarketingContent({ ...source, slug: "different-route" }).productId).toBe(id);
  });

  it.each(["frame", "crate"] as const)("uses independent %s source fallback on an outage or another product's content", async (id) => {
    const fallback = sourceProductMarketingContent(getProduct(id)!);
    await expect(getProductMarketingContent(id, async () => { throw new Error("offline"); })).resolves.toEqual(fallback);
    await expect(getProductMarketingContent(id, async () => [validDocument])).resolves.toEqual(fallback);
  });
});
