import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { decideActivationRequest, isActivationRequestId } from "@/lib/activation-approval";
import { hasValidSameOriginCsrf } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ activationRequestId: string; action: string }> }) {
  if (!hasValidSameOriginCsrf(request)) return response({ error: "invalidRequest" }, 403);

  const { activationRequestId, action } = await context.params;
  if (!isActivationRequestId(activationRequestId) || action !== "approve" && action !== "deny") return response({ error: "activationRequestUnavailable" }, 404);

  try {
    const { user, accessToken } = await withAuth();
    if (!user || !accessToken) return response({ error: "unauthenticated" }, 401);
    const result = await decideActivationRequest(accessToken, activationRequestId, action);
    return result.kind === "decision" ? response({ state: result.state }) : response({ error: result.error }, statusFor(result.error));
  } catch {
    return response({ error: "licensingUnavailable" }, 503);
  }
}

function response(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function statusFor(error: string): number {
  if (error === "unauthenticated") return 401;
  if (error === "accountUnlinked" || error === "accountDisabled" || error === "emailNotVerified") return 403;
  if (error === "activationRequestUnavailable") return 404;
  if (error === "activationRequestFinalized" || error === "activationLimitReached" || error === "entitlementUnavailable") return 409;
  return 503;
}
