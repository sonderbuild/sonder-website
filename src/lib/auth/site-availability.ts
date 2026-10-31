import { NextResponse, type NextMiddleware } from "next/server";
import { customerPlatformAvailable } from "@/lib/site-availability";

export function guardSiteAvailability(application: NextMiddleware): NextMiddleware {
  return (request, event) => {
    if (customerPlatformAvailable()) return application(request, event);
    const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    // Never forward a Server Action or API mutation, even from an old open tab.
    if (request.nextUrl.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) {
      return NextResponse.json({ error: "customerPlatformUnavailable" }, { status: 503, headers });
    }
    // Drop query/path claims; do not preserve tokens or caller-selected return URLs.
    return NextResponse.redirect(new URL("/availability", request.url), { status: 307, headers });
  };
}
