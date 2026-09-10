import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ withAuth: vi.fn() }));

vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: mocks.withAuth }));

import { POST } from "./route";

const activationId = "activation-id";

describe("activation revoke relay", () => {
  it("rejects a mutation without same-origin CSRF proof before reading the session", async () => {
    const response = await POST(new NextRequest(`https://sonder.test/api/account/activations/${activationId}/revoke`, { method: "POST" }), params());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "invalidRequest" });
    expect(mocks.withAuth).not.toHaveBeenCalled();
  });

  it("forwards only an opaque activation ID and server-side WorkOS token", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    mocks.withAuth.mockResolvedValue({ user: { id: "workos-user" }, accessToken: "server-only-token" });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ revoked: true }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(authorizedRequest(), params());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ revoked: true });
    expect(fetchMock).toHaveBeenCalledWith(new URL(`/v1/customer/activations/${activationId}/revoke`, "https://api.test"), expect.objectContaining({ headers: { Authorization: "Bearer server-only-token" }, method: "POST" }));
  });

  it("fails closed for an unavailable cross-customer or unknown activation", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    mocks.withAuth.mockResolvedValue({ user: { id: "workos-user" }, accessToken: "server-only-token" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "activationUnavailable" }, { status: 404 })));

    const response = await POST(authorizedRequest(), params());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "activationUnavailable" });
  });
});

function params() { return { params: Promise.resolve({ activationId }) }; }

function authorizedRequest() {
  return new NextRequest(`https://sonder.test/api/account/activations/${activationId}/revoke`, {
    method: "POST",
    headers: {
      Cookie: "sonder-csrf=csrf-token",
      Origin: "https://sonder.test",
      "X-Sonder-Csrf": "csrf-token",
    },
  });
}
