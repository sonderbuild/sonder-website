import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { isOpaqueActivationId, revokeCustomerActivation } from "@/lib/customer-licensing";
import { hasValidSameOriginCsrf } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ activationId: string }> }) {
  if (!hasValidSameOriginCsrf(request)) return response({ error: "invalidRequest" }, 403);

  const { activationId } = await context.params;
  if (!isOpaqueActivationId(activationId)) return response({ error: "activationUnavailable" }, 404);

  try {
    const { user, accessToken } = await withAuth();
    if (!user || !accessToken) return response({ error: "unauthenticated" }, 401);
    const result = await revokeCustomerActivation(accessToken, activationId);
    return result.kind === "revoked" ? response({ revoked: true }) : response({ error: result.error }, statusFor(result.error));
  } catch {
    return response({ error: "licensingUnavailable" }, 503);
  }
}

function response(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function statusFor(error: string): number {
  if (error === "unauthenticated") return 401;
  if (error === "accountUnlinked" || error === "accountDisabled" || error === "emailNotVerified" || error === "stepUpRequired") return 403;
  if (error === "activationUnavailable") return 404;
  return 503;
}
