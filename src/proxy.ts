import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { guardSiteAvailability } from "@/lib/auth/site-availability";
import { guardWorkOSOrigin } from "@/lib/auth/workos-origin";

export default guardSiteAvailability((request, event) => guardWorkOSOrigin(authkitProxy())(request, event));

export const config = {
  // Marketing never inspects or refreshes sessions; protected consumers still do.
  matcher: ["/account/:path*", "/login", "/api/:path*"],
};
