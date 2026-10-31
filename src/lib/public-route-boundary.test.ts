import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
// Next reads a literal matcher. Use the actual source in both canonical Next
// and the isolated OpenNext Edge-middleware copy, without importing auth code.
const proxy = new URL("../proxy.ts", import.meta.url);
const source = readFileSync(existsSync(proxy) ? proxy : new URL("../middleware.ts", import.meta.url), "utf8");
const matcher = source.match(/matcher:\s*(\[[^\]]+\])/);
if (!matcher) throw new Error("Missing static Next matcher");
const config = { matcher: JSON.parse(matcher[1]) as string[] };

it.each(["/", "/apps/mactric", "/apps/mactric/", "/about", "/contact", "/creative", "/sonder-wordmark.svg", "/_next/static/app.js", "/?next=/account"])("public %s never invokes AuthKit proxy", url => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});
it.each(["/account", "/account/", "/account/activate/request", "/account?_rsc=public-navigation", "/login", "/api/auth/csrf", "/api/auth/magic/verify", "/api/auth/social/callback", "/api/account/activations/id/revoke"])("protected %s retains AuthKit processing", url => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});
