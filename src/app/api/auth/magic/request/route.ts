import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { requestMagicAuth } from "@/lib/auth/magic-auth";
import { hasValidSameOriginCsrf, jsonBody } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidSameOriginCsrf(request)) return response({ error: "invalidRequest" }, 403);

  const body = await jsonBody(request);
  if (!body) return response({ error: "invalidRequest" }, 400);

  const result = await requestMagicAuth(getWorkOS().userManagement, body.email, requestContext(request));
  switch (result.kind) {
    case "accepted":
      return response({ ok: true }, 202);
    case "invalidEmail":
      return response({ error: "invalidEmail" }, 400);
    case "rateLimited":
      return response({ error: "tryAgainLater" }, 429);
    default:
      return response({ error: "temporarilyUnavailable" }, 503);
  }
}

function requestContext(request: NextRequest) {
  return { userAgent: request.headers.get("user-agent") ?? undefined };
}

function response(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
