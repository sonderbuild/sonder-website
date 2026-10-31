import { NextResponse, type NextMiddleware } from "next/server";

/** Current product contract uses WorkOS's first-party API, not custom domains.
 * This is configuration admission only; SDK redirects/body/retries remain gated. */
export function canonicalWorkOSOrigin(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return (env.WORKOS_API_HOSTNAME === undefined || env.WORKOS_API_HOSTNAME === "api.workos.com")
    && (env.WORKOS_API_HTTPS === undefined || env.WORKOS_API_HTTPS === "true")
    && (env.WORKOS_API_PORT === undefined || env.WORKOS_API_PORT === "443");
}

/** Wrap the existing AuthKit handler; do not construct a parallel auth client. */
export function guardWorkOSOrigin(authkit: NextMiddleware): NextMiddleware {
  return (request, event) => {
    if (!canonicalWorkOSOrigin()) {
      return NextResponse.json({ error: "temporarilyUnavailable" }, {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
      });
    }
    return authkit(request, event);
  };
}
