import { checkoutReturnPath } from "@/lib/checkout-return-path";
import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { persistMagicAuthSession, verifyMagicAuth } from "@/lib/auth/magic-auth";
import { activationReturnPath } from "@/lib/activation-approval";
import { hasValidSameOriginCsrf, jsonBody } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidSameOriginCsrf(request)) return response({ error: "invalidRequest" }, 403);

  const body = await jsonBody(request);
  if (!body) return response({ error: "invalidRequest" }, 400);

  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) return response({ error: "temporarilyUnavailable" }, 503);

  let result: Awaited<ReturnType<typeof verifyMagicAuth>>;
  try {
    result = await verifyMagicAuth(
    getWorkOS().userManagement,
    clientId,
    body.email,
    body.code,
    requestContext(request, request.cookies.get("sonder-magic-radar")?.value),
  );
  } catch {
    return response({ error: "temporarilyUnavailable" }, 503);
  }

  if (result.kind === "authenticated") {
    const saved = await persistMagicAuthSession(result.response, async (authResponse) => saveSession(authResponse, request));
    return saved.kind === "authenticated"
      ? response({ ok: true, ...((activationReturnPath(body.returnTo) ?? checkoutReturnPath(body.returnTo)) ? { returnTo: (activationReturnPath(body.returnTo) ?? checkoutReturnPath(body.returnTo)) } : {}) }, 200)
      : response({ error: "temporarilyUnavailable" }, 503);
  }

  switch (result.kind) {
    case "invalidCode":
      return response({ error: "invalidCode" }, 401);
    case "unverified":
      return response({ error: "emailNotVerified" }, 403);
    case "rateLimited":
      return response({ error: "tryAgainLater" }, 429);
    default:
      return response({ error: "temporarilyUnavailable" }, 503);
  }
}

function requestContext(request: NextRequest, radarAuthAttemptId?: string) {
  return {
    ...(radarAuthAttemptId ? { radarAuthAttemptId } : {}),
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

function response(body: object, status: number) {
  const result = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  result.cookies.set("sonder-magic-radar", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/magic/verify",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return result;
}
