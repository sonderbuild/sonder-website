import { parseServerOrigin } from "../server-origin";

import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

export const authJsonBodyLimit = 1_024;
export const authBodyDeadlineMs = 5_000;

export const csrfCookieName = "sonder-csrf";
export const csrfHeaderName = "x-sonder-csrf";

export function hasValidSameOriginCsrf(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const header = request.headers.get(csrfHeaderName);
  const cookie = request.cookies.get(csrfCookieName)?.value;

  // Some server adapters reconstruct NextRequest with an internal localhost URL.
  // A configured deployment origin must be exact, server-owned and fail closed.
  const expectedOrigin = process.env.SONDER_WEBSITE_ORIGIN === undefined
    ? request.nextUrl.origin
    : parseServerOrigin(process.env.SONDER_WEBSITE_ORIGIN)?.origin;
  return origin === expectedOrigin && tokensMatch(cookie, header);
}

export async function jsonBody(request: NextRequest): Promise<Record<string, unknown> | undefined> {
  const contentType = request.headers.get("content-type") ?? "";
  const declaredLength = request.headers.get("content-length");
  if (contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json" ||
      (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > authJsonBodyLimit))) return undefined;

  if (!request.body) return undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const bytes = new Uint8Array(authJsonBodyLimit);
  let length = 0;
  let complete = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("auth_body_timeout")), authBodyDeadlineMs);
  });
  try {
    reader = request.body.getReader();
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
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
    clearTimeout(timer);
    if (reader && !complete) void reader.cancel().catch(() => {});
    reader?.releaseLock();
  }
}

function tokensMatch(cookie: string | undefined, header: string | null): boolean {
  if (!cookie || !header || cookie.length > 256 || header.length > 256) return false;

  const cookieBytes = Buffer.from(cookie);
  const headerBytes = Buffer.from(header);
  return cookieBytes.length === headerBytes.length && timingSafeEqual(cookieBytes, headerBytes);
}
