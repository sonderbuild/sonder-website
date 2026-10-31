import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authBodyDeadlineMs, authJsonBodyLimit, hasValidSameOriginCsrf, jsonBody } from "./request-security";

function request(body: string | ReadableStream<Uint8Array>, extra: Record<string, string> = {}) {
  return new NextRequest("https://sonder.example/api/auth/magic/request", {
    method: "POST", body, headers: { "content-type": "application/json", ...extra },
  });
}

describe("bounded auth JSON", () => {
  it("accepts valid JSON exactly at the existing byte limit with missing or understated length", async () => {
    const json = JSON.stringify({ email: "customer@example.test", note: "café 🎵" });
    const body = json + " ".repeat(authJsonBodyLimit - new TextEncoder().encode(json).length);
    for (const headers of [{}, { "content-length": "1" }] as Record<string, string>[]) {
      await expect(jsonBody(request(body, headers))).resolves.toEqual(JSON.parse(json));
    }
  });

  it("rejects actual UTF-8 overflow with missing or incorrect Content-Length", async () => {
    const body = JSON.stringify({ note: "é".repeat(600) });
    expect(body.length).toBeLessThan(authJsonBodyLimit);
    for (const headers of [{}, { "content-length": "1" }] as Record<string, string>[]) {
      await expect(jsonBody(request(body, headers))).resolves.toBeUndefined();
    }
  });

  it("cancels an oversized stream before consuming subsequent chunks", async () => {
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { pulls++; controller.enqueue(new Uint8Array(512)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    await expect(jsonBody(request(stream, { "content-length": "1" }))).resolves.toBeUndefined();
    expect(cancelled).toBe(true);
    expect(pulls).toBe(3);
  });

  it("parses JSON split across byte chunks, including a split UTF-8 character", async () => {
    const bytes = new TextEncoder().encode('{"note":"é"}');
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index === bytes.length) controller.close();
        else controller.enqueue(bytes.slice(index, ++index));
      },
    });
    await expect(jsonBody(request(stream))).resolves.toEqual({ note: "é" });
  });

  it("preserves invalid request handling for wrong type, declared overflow, malformed and non-object JSON", async () => {
    for (const body of ["", "{broken", "null", "[]", '"string"']) {
      await expect(jsonBody(request(body))).resolves.toBeUndefined();
    }
    await expect(jsonBody(request("{}", { "content-type": "text/plain" }))).resolves.toBeUndefined();
    await expect(jsonBody(request("{}", { "content-length": String(authJsonBodyLimit + 1) }))).resolves.toBeUndefined();
    const locked = request("{}");
    locked.body?.getReader();
    await expect(jsonBody(locked)).resolves.toBeUndefined();
    const failed = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("fixture read error")); } });
    await expect(jsonBody(request(failed))).resolves.toBeUndefined();
  });

  it("preserves same-origin CSRF token matching", () => {
    const headers = { origin: "https://sonder.example", cookie: "sonder-csrf=fixture", "x-sonder-csrf": "fixture" };
    expect(hasValidSameOriginCsrf(request("{}", headers))).toBe(true);
    expect(hasValidSameOriginCsrf(request("{}", { ...headers, origin: "https://other.example" }))).toBe(false);
    expect(hasValidSameOriginCsrf(request("{}", { ...headers, "x-sonder-csrf": "wrong" }))).toBe(false);
  });
});


it("rejects stalled authentication bodies within the finite deadline", async () => {
  vi.useFakeTimers();
  let cancelled = false;
  try {
    const result = expect(jsonBody(request(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } })))).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(authBodyDeadlineMs + 1);
    await result;
    expect(cancelled).toBe(true);
  } finally { vi.useRealTimers(); }
});
it("rejects malformed length and non-JSON MIME aliases before reading", async () => {
  for (const headers of [{"content-length":"-1"},{"content-length":"NaN"},{"content-type":"text/plainapplication/json"}] as Record<string, string>[]) {
    await expect(jsonBody(request("{}", headers))).resolves.toBeUndefined();
  }
});


describe("configured website origin behind a server adapter", () => {
  afterEach(() => vi.unstubAllEnvs());
  const secured = (origin: string) => new NextRequest("https://localhost:1234/api/auth/magic/request", { method: "POST", headers: { origin, cookie: "sonder-csrf=fixture", "x-sonder-csrf": "fixture" } });
  it("admits only the exact configured public origin despite an internal request URL", () => {
    vi.stubEnv("SONDER_WEBSITE_ORIGIN", "https://website.example");
    expect(hasValidSameOriginCsrf(secured("https://website.example"))).toBe(true);
    expect(hasValidSameOriginCsrf(secured("https://attacker.example"))).toBe(false);
    expect(hasValidSameOriginCsrf(secured("https://localhost:1234"))).toBe(false);
  });
  it.each(["", "https://user:pass@website.example", "https://website.example/path", "https://website.example?x=1", "http://localhost:1234", "https://*.example.invalid"])("fails closed for invalid production configuration: %s", value => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("SONDER_WEBSITE_ORIGIN", value);
    expect(hasValidSameOriginCsrf(secured("https://localhost:1234"))).toBe(false);
  });
});
