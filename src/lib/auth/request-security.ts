import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

export const authJsonBodyLimit = 1_024;

export const csrfCookieName = "sonder-csrf";
export const csrfHeaderName = "x-sonder-csrf";

export function hasValidSameOriginCsrf(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const header = request.headers.get(csrfHeaderName);
  const cookie = request.cookies.get(csrfCookieName)?.value;

  return origin === request.nextUrl.origin && tokensMatch(cookie, header);
}

export async function jsonBody(request: NextRequest): Promise<Record<string, unknown> | undefined> {
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.includes("application/json") || contentLength > authJsonBodyLimit) return undefined;

  if (!request.body) return undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const bytes = new Uint8Array(authJsonBodyLimit);
  let length = 0;
  let complete = false;
  try {
    reader = request.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      if (value.byteLength > authJsonBodyLimit - length) return undefined;
      bytes.set(value, length);
      length += value.byteLength;
    }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length)));
    return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  } finally {
    if (reader && !complete) { try { await reader.cancel(); } catch { /* Preserve invalidRequest semantics. */ } }
    reader?.releaseLock();
  }
}

function tokensMatch(cookie: string | undefined, header: string | null): boolean {
  if (!cookie || !header) return false;

  const cookieBytes = Buffer.from(cookie);
  const headerBytes = Buffer.from(header);
  return cookieBytes.length === headerBytes.length && timingSafeEqual(cookieBytes, headerBytes);
}
