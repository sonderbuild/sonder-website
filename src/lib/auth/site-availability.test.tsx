import { afterEach, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { customerPlatformAvailable } from "@/lib/site-availability";
import { guardSiteAvailability } from "./site-availability";
import AvailabilityPage from "@/app/availability/page";

const event = {} as NextFetchEvent;
afterEach(() => vi.unstubAllEnvs());
it.each(["marketing-only", "typo", ""])('denies private paths before auth/API effects in mode %s', async mode => {
  vi.stubEnv("SONDER_SITE_MODE", mode);
  const application = vi.fn(() => { throw Error("provider must not run"); });
  const handler = guardSiteAvailability(application);
  for (const path of ["/account", "/account/activate/private-id?returnTo=https://evil.invalid", "/login?code=secret"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await handler(new NextRequest(`https://website.invalid${path}`, { method }), event) as Response;
      expect(response.headers.get("location")).toBe("https://website.invalid/availability");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(JSON.stringify([...response.headers])).not.toMatch(/secret|private-id|evil/);
    }
  }
  for (const path of ["/api/auth/csrf", "/api/auth/magic/request", "/api/auth/magic/verify", "/api/auth/social/callback", "/api/account/activations/id/revoke", "/api/account/activation-requests/id/approve", "/account"]) {
    for (const method of ["POST", "DELETE"]) {
      const response = await handler(new NextRequest(`https://website.invalid${path}`, { method }), event) as Response;
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "customerPlatformUnavailable" });
    }
  }
  const response = await handler(new NextRequest("https://website.invalid/api/auth/social/callback?code=secret"), event) as Response;
  expect(response.status).toBe(503);
  expect(application).not.toHaveBeenCalled();
});
it.each([undefined, "customer-platform"])('preserves the existing authenticated boundary in mode %s', async mode => {
  vi.stubEnv("SONDER_SITE_MODE", mode);
  const application = vi.fn(() => new Response("existing boundary", { status: 401 }));
  const request = new NextRequest("https://website.invalid/account");
  expect((await guardSiteAvailability(application)(request, event) as Response).status).toBe(401);
  expect(application).toHaveBeenCalledWith(request, event);
  expect(customerPlatformAvailable()).toBe(true);
});
it('explains all unavailable customer functions without a login or purchase form', () => {
  const html = renderToStaticMarkup(AvailabilityPage());
  expect(html).toContain("Sign-in, purchases and software activation are not available");
  expect(html).toContain('href="/apps"');
  expect(html).toContain("mailto:hello@sonder.build");
  expect(html).not.toContain("<form");
});
