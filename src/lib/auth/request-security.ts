import { timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

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
  if (!contentType.includes("application/json") || contentLength > 1_024) return undefined;

  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function tokensMatch(cookie: string | undefined, header: string | null): boolean {
  if (!cookie || !header) return false;

  const cookieBytes = Buffer.from(cookie);
  const headerBytes = Buffer.from(header);
  return cookieBytes.length === headerBytes.length && timingSafeEqual(cookieBytes, headerBytes);
}
