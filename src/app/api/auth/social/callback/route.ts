import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import { persistMagicAuthSession } from "@/lib/auth/magic-auth";
import {
  authenticateSocialCode,
  configuredSocialProviders,
  readSocialCallback,
  socialStateCookieName,
} from "@/lib/auth/social-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const callback = readSocialCallback({
    code: request.nextUrl.searchParams.get("code"),
    error: request.nextUrl.searchParams.get("error"),
    state: request.nextUrl.searchParams.get("state"),
    storedState: request.cookies.get(socialStateCookieName)?.value,
  }, configuredSocialProviders());

  if (callback.kind === "cancelled") return redirectToLogin(request, "socialCancelled");
  if (callback.kind !== "code") return redirectToLogin(request, "socialFailed");

  const result = await authenticateSocialCode(getWorkOS().userManagement, process.env.WORKOS_CLIENT_ID, callback.code);
  if (result.kind !== "authenticated") return redirectToLogin(request, "socialFailed");

  const saved = await persistMagicAuthSession(result.response, async (response) => saveSession(response, request));
  return saved.kind === "authenticated" ? redirectTo(request, callback.returnTo ?? "/account") : redirectToLogin(request, "socialFailed");
}

function redirectToLogin(request: NextRequest, error: "socialCancelled" | "socialFailed") {
  return redirectTo(request, `/login?authError=${error}`);
}

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(socialStateCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/social/callback",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
