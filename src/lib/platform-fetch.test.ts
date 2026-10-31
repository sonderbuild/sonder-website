import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPlatform, platformRequestTimeoutMs, platformResponseLimit } from "./platform-fetch";
import { apiOrigin } from "./activation-approval";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
const url = new URL("https://api.example/v1/customer/session");
describe("server API transport bounds", () => {
  it("keeps authenticated calls no-store and refuses redirects without following them", async () => {
    const provider = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://wrong.example" } }));
    vi.stubGlobal("fetch", provider);
    await expect(fetchPlatform(url, { headers: { Authorization: "Bearer synthetic" } })).rejects.toThrow("platform_redirect");
    expect(provider).toHaveBeenCalledExactlyOnceWith(url, expect.objectContaining({ cache: "no-store", redirect: "manual", signal: expect.any(AbortSignal) }));
  });
  it("bounds streamed bytes even without Content-Length and cancels overflow", async () => {
    let cancelled = false;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(4096)); }, cancel() { cancelled = true; },
    }))));
    await expect(fetchPlatform(url, {})).rejects.toThrow("platform_response_oversize");
    expect(cancelled).toBe(true);
  });
  it("retains valid error JSON and accepts the exact byte limit", async () => {
    const json = '{"error":"unauthenticated"}';
    const body = json + " ".repeat(platformResponseLimit - new TextEncoder().encode(json).byteLength);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 401 })));
    expect(await (await fetchPlatform(url, {})).json()).toEqual({ error: "unauthenticated" });
  });
  it("ends stalled body reads and cancels their reader without retries", async () => {
    vi.useFakeTimers();
    let cancelled = false;
    const provider = vi.fn().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } })));
    vi.stubGlobal("fetch", provider);
    const result = expect(fetchPlatform(url, {})).rejects.toThrow("platform_timeout");
    await vi.advanceTimersByTimeAsync(platformRequestTimeoutMs + 1);
    await result;
    expect(cancelled).toBe(true);
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it.each(["ftp://localhost", "https://name:password@api.example", "https://api.example/prefix", "https://api.example/?query=1", "https://api.example/#fragment"])("denies malformed configured origins: %s", value => {
    vi.stubEnv("SONDER_API_ORIGIN", value); expect(apiOrigin()).toBeUndefined();
  });
});

it("rejects malformed UTF8 before account decoders can treat replacement text as identity", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([123,34,105,100,34,58,34,255,34,125]))));
  await expect(fetchPlatform(url, {})).rejects.toThrow();
});


it("permits HTTP localhost only outside production", () => {
  vi.stubEnv("SONDER_API_ORIGIN", "http://localhost:4317");
  vi.stubEnv("NODE_ENV", "development"); expect(apiOrigin()?.origin).toBe("http://localhost:4317");
  vi.stubEnv("NODE_ENV", "production"); expect(apiOrigin()).toBeUndefined();
  vi.stubEnv("SONDER_API_ORIGIN", "https://api.example"); expect(apiOrigin()?.origin).toBe("https://api.example");
});


it("cancels late headers after timeout without retrying an uncertain mutation", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  let cancelled = false;
  const provider = vi.fn(() => new Promise<Response>(complete => { resolve = complete; }));
  vi.stubGlobal("fetch", provider);
  const result = expect(fetchPlatform(url, { method: "POST" })).rejects.toThrow("platform_timeout");
  await vi.advanceTimersByTimeAsync(platformRequestTimeoutMs + 1);
  await result;
  resolve(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
  await Promise.resolve();
  await Promise.resolve();
  expect(cancelled).toBe(true);
  expect(provider).toHaveBeenCalledTimes(1);
});
