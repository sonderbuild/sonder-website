import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import {
  configuredSocialProviders,
  createSocialAuthorizationUrl,
  createSocialState,
  encodeSocialState,
  socialProvider,
  socialStateCookieName,
} from "@/lib/auth/social-auth";
import { hasValidSameOriginCsrf, jsonBody } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  if (!hasValidSameOriginCsrf(request) || !(await jsonBody(request))) return NextResponse.json({ error: "invalidRequest" }, { status: 403, headers: noStore });

  const { provider: rawProvider } = await context.params;
  const provider = socialProvider(rawProvider);
  const enabledProviders = configuredSocialProviders();
  if (!provider || !enabledProviders.includes(provider)) return NextResponse.json({ error: "providerUnavailable" }, { status: 404, headers: noStore });

  const state = createSocialState();
  const url = createSocialAuthorizationUrl(getWorkOS().userManagement, {
    clientId: process.env.WORKOS_CLIENT_ID,
    provider,
    redirectUri: process.env.WORKOS_SOCIAL_REDIRECT_URI,
    state,
  }, enabledProviders);
  if (!url) return NextResponse.json({ error: "temporarilyUnavailable" }, { status: 503, headers: noStore });

  const response = NextResponse.json({ url }, { headers: noStore });
  response.cookies.set(socialStateCookieName, encodeSocialState(provider, state), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/auth/social/callback",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

const noStore = { "Cache-Control": "no-store" };
