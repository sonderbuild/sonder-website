import { NextRequest, NextResponse } from "next/server";

import { csrfCookieName } from "@/lib/auth/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = crypto.randomUUID();
  const response = NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });

  response.cookies.set(csrfCookieName, token, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}
