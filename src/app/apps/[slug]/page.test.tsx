import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/lib/cms/sanity.server", () => ({ fetchPublishedSanityProductMarketing: vi.fn() }));

import { products, type Product } from "@/data/products";
import { fetchPublishedSanityProductMarketing } from "@/lib/cms/sanity.server";
import ProductPage, { generateMetadata, generateStaticParams } from "./page";

const load = vi.mocked(fetchPublishedSanityProductMarketing);
const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

function document(productId: string, title: string) {
  return { productId, title, tagline: "Synthetic editorial tagline", hero: { description: "Synthetic editorial description" }, featureSections: [{ _type: "marketingStatement", statement: "Synthetic editorial section" }], media: [] };
}

afterEach(() => { vi.restoreAllMocks(); load.mockReset(); });

describe("public product publishing boundary", () => {
  it("preserves the three existing routes and keeps Cue and proposed names unavailable", async () => {
    expect(generateStaticParams()).toEqual([{ slug: "monitor" }, { slug: "frame" }, { slug: "crate" }]);
    for (const slug of ["cue", "mactric", "pulse", "unknown"]) {
      await expect(ProductPage(props(slug))).rejects.toThrow("not-found");
      await expect(generateMetadata(props(slug))).resolves.toEqual({});
    }
    expect(load).not.toHaveBeenCalled();
  });

  it("renders published Monitor content and metadata through the existing route", async () => {
    load.mockResolvedValue([document("monitor", "Synthetic Monitor")]);
    expect(renderToStaticMarkup(await ProductPage(props("monitor")))).toContain("Synthetic Monitor");
    await expect(generateMetadata(props("monitor"))).resolves.toEqual({ title: "Synthetic Monitor", description: "Synthetic editorial description" });
    expect(load).toHaveBeenCalledWith("monitor");
  });

  it.each(["frame", "crate"])("keeps %s source-owned without any CMS request", async (slug) => {
    const product = products.find((candidate) => candidate.slug === slug)!;
    expect(renderToStaticMarkup(await ProductPage(props(slug)))).toContain(product.tagline);
    await expect(generateMetadata(props(slug))).resolves.toEqual({ title: product.name, description: product.description });
    expect(load).not.toHaveBeenCalled();
  });

  it.each(["frame", "crate"])("can opt a synthetic %s fixture into the shared page without product-specific logic", async (id) => {
    const source = products.find((candidate) => candidate.id === id)!;
    const fixture: Product = { ...source, slug: `synthetic-${id}`, marketingSource: "sanity" };
    vi.spyOn(products, "find").mockImplementation((predicate) => [fixture].find(predicate));
    load.mockResolvedValue([document(id, `Synthetic ${id}`)]);
    expect(renderToStaticMarkup(await ProductPage(props(fixture.slug)))).toContain(`Synthetic ${id}`);
    await expect(generateMetadata(props(fixture.slug))).resolves.toEqual({ title: `Synthetic ${id}`, description: "Synthetic editorial description" });
    expect(load).toHaveBeenCalledWith(id);
    expect(load).not.toHaveBeenCalledWith(fixture.slug);
  });

  it.each([[], [document("frame", "Wrong product")], [document("monitor", "Duplicate"), document("monitor", "Duplicate")]].map((result) => ({ result })))("falls back safely for unavailable, mismatched or duplicate content: $result", async ({ result }) => {
    load.mockResolvedValue(result);
    expect(renderToStaticMarkup(await ProductPage(props("monitor")))).toContain("Understand your Mac.");
    await expect(generateMetadata(props("monitor"))).resolves.toMatchObject({ title: "Monitor" });
  });
});
