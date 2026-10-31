import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/image", () => ({ default: () => null }));
import Impressum from "@/content/legal-drafts/impressum";
import { metadata as imprintMetadata } from "@/app/impressum/page";
import Datenschutz from "@/content/legal-drafts/datenschutz";
import { metadata as privacyMetadata } from "@/app/datenschutz/page";
import { legalDraftPreviewAvailable } from "@/lib/legal-publication";
import { Footer } from "@/components/layout/footer";
import { HomepageFooter } from "@/components/home/homepage-footer";

it("keeps legal drafts visibly incomplete, unindexed and free of an inferred provider address", () => {
  for (const [page, metadata] of [[Impressum, imprintMetadata], [Datenschutz, privacyMetadata]] as const) {
    const html = renderToStaticMarkup(page());
    expect(html).toContain("Nicht zur Veröffentlichung freigegeben");
    expect(html).toContain("[OFFEN:");
    expect(html).toContain("Laurens Karpf");
    expect(html).not.toMatch(/Ludwig-Erhard|20459|Kundennummer #/);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  }
});

afterEach(() => vi.unstubAllEnvs());
it("makes both drafts reachable only in explicitly enabled local development", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("SONDER_LEGAL_PREVIEW", "local-draft");
  for (const footer of [Footer, HomepageFooter]) {
    const html = renderToStaticMarkup(createElement(footer));
    expect(html).toContain('href="/impressum"');
    expect(html).toContain('href="/datenschutz"');
    expect(html).toContain("Entwurf");
  }
});

it("production never exposes draft navigation even with a stale preview flag", () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SONDER_LEGAL_PREVIEW", "local-draft");
  expect(legalDraftPreviewAvailable()).toBe(false);
  for (const footer of [Footer, HomepageFooter]) expect(renderToStaticMarkup(createElement(footer))).not.toContain('href="/impressum"');
});
