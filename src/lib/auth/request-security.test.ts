import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { authJsonBodyLimit, hasValidSameOriginCsrf, jsonBody } from "./request-security";

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
