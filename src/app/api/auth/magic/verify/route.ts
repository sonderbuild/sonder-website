import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { persistMagicAuthSession, verifyMagicAuth } from "@/lib/auth/magic-auth";
import { hasValidSameOriginCsrf, jsonBody } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidSameOriginCsrf(request)) return response({ error: "invalidRequest" }, 403);

  const body = await jsonBody(request);
  if (!body) return response({ error: "invalidRequest" }, 400);

  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) return response({ error: "temporarilyUnavailable" }, 503);

  const result = await verifyMagicAuth(
    getWorkOS().userManagement,
    clientId,
    body.email,
    body.code,
    requestContext(request),
  );

  if (result.kind === "authenticated") {
    const saved = await persistMagicAuthSession(result.response, async (authResponse) => saveSession(authResponse, request));
    return saved.kind === "authenticated"
      ? response({ ok: true }, 200)
      : response({ error: "temporarilyUnavailable" }, 503);
  }

  switch (result.kind) {
    case "invalidCode":
    case "unverified":
      return response({ error: "invalidCode" }, 401);
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
