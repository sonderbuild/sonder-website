import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import { canonicalWorkOSOrigin, guardWorkOSOrigin } from "./workos-origin";
const mocks = { authkit: vi.fn() };
const proxy = guardWorkOSOrigin(mocks.authkit);

beforeEach(() => {
  vi.stubEnv("WORKOS_API_HOSTNAME", undefined);
  vi.stubEnv("WORKOS_API_HTTPS", undefined);
  vi.stubEnv("WORKOS_API_PORT", undefined);
  mocks.authkit.mockReset().mockReturnValue(NextResponse.next());
});
afterEach(() => vi.unstubAllEnvs());

describe("WorkOS origin configuration admission", () => {
  it("preserves native defaults and the exact explicit HTTPS origin", () => {
    expect(canonicalWorkOSOrigin({})).toBe(true);
    expect(canonicalWorkOSOrigin({ WORKOS_API_HOSTNAME: "api.workos.com", WORKOS_API_HTTPS: "true", WORKOS_API_PORT: "443" })).toBe(true);
  });
  it.each([
    ["WORKOS_API_HOSTNAME", "attacker.example.invalid"], ["WORKOS_API_HOSTNAME", "api.workos.com.attacker.invalid"],
    ["WORKOS_API_HOSTNAME", "https://api.workos.com"], ["WORKOS_API_HOSTNAME", "api.workos.com@attacker.invalid"],
    ["WORKOS_API_HOSTNAME", "api.workos.com/path"], ["WORKOS_API_HOSTNAME", ""],
    ["WORKOS_API_HTTPS", "false"], ["WORKOS_API_HTTPS", ""], ["WORKOS_API_PORT", "80"], ["WORKOS_API_PORT", "443x"],
  ])("rejects %s=%s before AuthKit, refresh or route execution", async (key, value) => {
    vi.stubEnv(key, value);
    for (const path of ["/account", "/api/auth/magic/verify", "/api/auth/social/callback"]) {
      // No Next event is used on this rejection path.
      const response = await proxy(new NextRequest("https://website.example.invalid" + path), {} as NextFetchEvent);
      expect(response?.status).toBe(503);
      expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response?.headers.has("set-cookie")).toBe(false);
    }
    expect(mocks.authkit).not.toHaveBeenCalled();
  });
  it("passes the original request/event through on canonical configuration", async () => {
    const request = new NextRequest("https://website.example.invalid/account");
    const event = {} as NextFetchEvent;
    await proxy(request, event);
    expect(mocks.authkit).toHaveBeenCalledExactlyOnceWith(request, event);
  });
});
