import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchPublishedSanityProductMarketing } from "./sanity.server";
import { getProductMarketingContent } from "./product-marketing.server";

beforeEach(() => {
  vi.stubEnv("SANITY_PROJECT_ID", "fixture");
  vi.stubEnv("SANITY_DATASET", "staging");
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
const load = (fetcher: typeof fetch) => fetchPublishedSanityProductMarketing("mactric", fetcher);

it("retains anonymous public caching and exact product query without credentials", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: [] }));
  expect(await load(fetcher)).toEqual([]);
  const [url, options] = fetcher.mock.calls[0];
  expect(String(url)).toContain("https://fixture.api.sanity.io/");
  expect(new URL(String(url)).searchParams.get("$productId")).toBe('"mactric"');
  expect(options).toMatchObject({ redirect: "manual", cache: "force-cache" });
  expect(options).not.toHaveProperty("headers");
});
it("does not fetch when CMS configuration is absent", async () => {
  vi.stubEnv("SANITY_PROJECT_ID", ""); const fetcher = vi.fn<typeof fetch>();
  expect(await load(fetcher)).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
});
it.each([302, 500])("rejects %s without following a redirect or using partial content", async status => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status, headers: { location: "https://other.invalid" } }));
  await expect(load(fetcher)).rejects.toThrow("cms_unavailable"); expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each(["-1", "bogus", "262145"])("rejects invalid/oversize declared lengths %s", async length => {
  await expect(load(vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { headers: { "content-length": length } })))).rejects.toThrow();
});
it("enforces actual bytes even with a false small length; source fallback survives", async () => {
  const cancel = vi.fn();
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(262145)); }, cancel }), { headers: { "content-length": "1" } });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
  const content = await getProductMarketingContent("mactric", () => load(fetcher));
  expect(content.title).toBe("Mactric"); expect(cancel).toHaveBeenCalledTimes(1);
});
it("rejects invalid UTF8 and invalid JSON before normalization", async () => {
  for (const bytes of [new Uint8Array([123, 255, 125]), new TextEncoder().encode("{bad")]) {
    await expect(load(vi.fn<typeof fetch>().mockResolvedValue(new Response(bytes)))).rejects.toThrow();
  }
});
it.each(["headers", "body"])("bounds stalled %s, even when transport ignores abort", async stage => {
  vi.useFakeTimers(); let signal: AbortSignal | null | undefined;
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const fetcher = vi.fn<typeof fetch>((_url, options) => {
    signal = options?.signal;
    return stage === "headers" ? new Promise<Response>(() => {}) : Promise.resolve(new Response(new ReadableStream({ cancel })));
  });
  const result = expect(load(fetcher)).rejects.toThrow("cms_timeout");
  await vi.advanceTimersByTimeAsync(3000); await result;
  expect(signal?.aborted).toBe(true);
  if (stage === "body") expect(cancel).toHaveBeenCalledTimes(1);
});
