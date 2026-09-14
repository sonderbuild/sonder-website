import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getProduct } from "@/data/products";

import { canonicalProductIds, isCanonicalProductId, normalizeProductMarketingContent } from "./product-marketing";
import { getProductMarketingContent } from "./product-marketing.server";
import { productWithMarketingContent, sourceProductMarketingContent } from "./source-product-marketing";

const validDocument = {
  productId: "pulse",
  title: "Pulse",
  tagline: "Understand your Mac.",
  hero: { description: "A quiet system monitoring and insights app." },
  featureSections: [
    { _type: "marketingStatement", statement: "Understand your Mac.", description: "Calm context." },
    { _type: "marketingFeature", title: "Live awareness", description: "See changing signals." },
  ],
  media: [{ url: "https://cdn.sanity.io/images/example/pulse.png", alt: "Pulse dashboard", label: "Pulse, in use" }],
  faq: [{ question: "What is Pulse?", answer: "A calm monitoring tool." }],
  seo: { title: "Pulse — sonder", description: "Calm monitoring.", socialImageUrl: "https://cdn.sanity.io/images/example/social.png" },
};

describe("product marketing normalization", () => {
  it("accepts only the canonical product catalog", () => {
    expect(canonicalProductIds).toEqual(["pulse", "frame", "crate", "cue"]);
    for (const productId of canonicalProductIds) expect(isCanonicalProductId(productId)).toBe(true);
    expect(isCanonicalProductId("other")).toBe(false);
  });

  it("normalizes a valid document and drops unknown fields", () => {
    const content = normalizeProductMarketingContent({ ...validDocument, providerId: "not-exposed", pricing: { amount: 99 }, platform: "macOS" });
    expect(content).toEqual({
      productId: "pulse", title: "Pulse", tagline: "Understand your Mac.", hero: { description: "A quiet system monitoring and insights app." },
      featureSections: [
        { kind: "statement", statement: "Understand your Mac.", description: "Calm context." },
        { kind: "feature", title: "Live awareness", description: "See changing signals." },
      ],
      media: [{ url: "https://cdn.sanity.io/images/example/pulse.png", alt: "Pulse dashboard", label: "Pulse, in use" }],
      faq: [{ question: "What is Pulse?", answer: "A calm monitoring tool." }],
      seo: { title: "Pulse — sonder", description: "Calm monitoring.", socialImageUrl: "https://cdn.sanity.io/images/example/social.png" },
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

describe("Pulse marketing adapter", () => {
  it("uses source fallback without CMS content", async () => {
    const content = await getProductMarketingContent("pulse", async () => null);
    expect(content).toEqual(sourceProductMarketingContent(getProduct("pulse")!));
  });

  it("uses source fallback when the CMS request fails, is malformed, missing, duplicated, or mismatched", async () => {
    const fallback = sourceProductMarketingContent(getProduct("pulse")!);
    await expect(getProductMarketingContent("pulse", async () => { throw new Error("unavailable"); })).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("pulse", async () => [{ ...validDocument, title: "" }])).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("pulse", async () => [])).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("pulse", async () => [validDocument, validDocument])).resolves.toEqual(fallback);
    await expect(getProductMarketingContent("pulse", async () => [{ ...validDocument, productId: "frame" }])).resolves.toEqual(fallback);
  });

  it("preserves the existing Pulse fallback page content", () => {
    const sourceProduct = getProduct("pulse")!;
    const rendered = productWithMarketingContent(sourceProduct, sourceProductMarketingContent(sourceProduct));
    expect(rendered.name).toBe(sourceProduct.name);
    expect(rendered.tagline).toBe(sourceProduct.tagline);
    expect(rendered.description).toBe(sourceProduct.description);
    expect(rendered.sections).toEqual(sourceProduct.sections);
  });

  it("keeps Cue valid for CMS data but outside the public product route type", () => {
    expect(isCanonicalProductId("cue")).toBe(true);
  });
});
