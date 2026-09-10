import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ withAuth: vi.fn() }));

vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: mocks.withAuth }));

import { POST } from "./route";

const requestId = "A".repeat(43);

describe("website activation decision relay", () => {
  it("rejects a mutation without same-origin CSRF proof before reading the session", async () => {
    const response = await POST(new NextRequest(`https://sonder.test/api/account/activation-requests/${requestId}/approve`, { method: "POST", body: "{}" }), params("approve"));
    await expect(response.json()).resolves.toEqual({ error: "invalidRequest" });
    expect(response.status).toBe(403);
    expect(mocks.withAuth).not.toHaveBeenCalled();
  });

  it("relays only an approved state with server-side authorization", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    mocks.withAuth.mockResolvedValue({ user: { id: "workos-user" }, accessToken: "server-only-token" });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ state: "approved" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(authorizedRequest("approve", { customerId: "browser-controlled", email: "browser@example.test" }), params("approve"));
    await expect(response.json()).resolves.toEqual({ state: "approved" });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(new URL(`/v1/customer/activation-requests/${requestId}/approve`, "https://api.test"), expect.objectContaining({
      headers: { Authorization: "Bearer server-only-token" }, method: "POST",
    }));
  });

  it("fails closed for a terminal duplicate decision without returning ticket material", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    mocks.withAuth.mockResolvedValue({ user: { id: "workos-user" }, accessToken: "server-only-token" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "activationRequestFinalized" }, { status: 409 })));

    const response = await POST(authorizedRequest("deny", {}), params("deny"));
    await expect(response.json()).resolves.toEqual({ error: "activationRequestFinalized" });
    expect(response.status).toBe(409);
  });
});

function params(action: "approve" | "deny") { return { params: Promise.resolve({ activationRequestId: requestId, action }) }; }

function authorizedRequest(action: "approve" | "deny", body: object) {
  return new NextRequest(`https://sonder.test/api/account/activation-requests/${requestId}/${action}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Cookie: "sonder-csrf=csrf-token",
      Origin: "https://sonder.test",
      "X-Sonder-Csrf": "csrf-token",
    },
  });
}
