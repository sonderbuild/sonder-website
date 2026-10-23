import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ withAuth: vi.fn(), signOut: vi.fn() }));
vi.mock("@workos-inc/authkit-nextjs", () => auth);
import { refreshActivationStatus } from "./actions";

beforeEach(() => {
  auth.withAuth.mockReset();
  auth.withAuth.mockResolvedValue({ user: { id: "website-subject" }, accessToken: "server-only-token" });
  vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("authenticated activation status read", () => {
  it("uses only the existing no-store licensing GET and returns its validated projection", async () => {
    const products = [{ productId: "monitor", name: "Monitor", entitlement: { status: "active" } }];
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ products: [{ ...products[0], providerId: "untrusted" }], customerId: "untrusted" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "ready", products });
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "ready", products });
    expect(auth.withAuth).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toEqual(new URL("https://api.test/v1/customer/licenses"));
      expect(options).toEqual({ cache: "no-store", headers: { Authorization: "Bearer server-only-token" } });
      expect(options?.method).toBeUndefined(); // GET; never the revoke mutation.
    }
  });

  it.each([{ user: null, accessToken: null }, { user: { id: "user" }, accessToken: null }, { user: null, accessToken: "token" }])("denies an expired/incomplete session before any API call", async session => {
    auth.withAuth.mockResolvedValue(session); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "error", error: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, "unauthenticated"], [403, "accountUnlinked"], [403, "accountDisabled"], [403, "emailNotVerified"],
    [503, "authenticationUnavailable"], [503, "licensingUnavailable"],
  ] as const)("preserves HTTP %s / %s", async (status, error) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error, extra: "ignored" }, { status })));
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "error", error });
  });

  it.each([{ products: [{ productId: "monitor", name: "Monitor", entitlement: { status: "future" } }] }, { products: "invalid" }])("fails closed for a malformed known projection", async body => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "error", error: "licensingUnavailable" });
  });

  it("keeps session verification failure distinct from a licensing network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline")); vi.stubGlobal("fetch", fetchMock);
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "error", error: "licensingUnavailable" });
    auth.withAuth.mockRejectedValue(new Error("auth unavailable"));
    await expect(refreshActivationStatus()).resolves.toEqual({ kind: "error", error: "authenticationUnavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
