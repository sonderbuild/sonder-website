import { describe, expect, it, vi } from "vitest";

import { activationReturnPath, decideActivationRequest, isActivationRequestId, previewActivationRequest } from "./activation-approval";

const requestId = "A".repeat(43);

describe("activation approval boundary", () => {
  it("accepts only the opaque R10 request identifier and same-origin activation return path", () => {
    expect(isActivationRequestId(requestId)).toBe(true);
    expect(isActivationRequestId("customer_01")).toBe(false);
    expect(activationReturnPath(`/account/activate/${requestId}`)).toBe(`/account/activate/${requestId}`);
    expect(activationReturnPath("https://attacker.test/account/activate/" + requestId)).toBeUndefined();
    expect(activationReturnPath("/account?customer=customer_01")).toBeUndefined();
  });

  it("uses a server bearer token only for the R10 preview and accepts only provider-neutral fields", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      productId: "pulse", name: "Pulse", deviceLabel: "Studio Mac", requestedAt: 1,
      activeActivationCount: 1, remainingActivationSlots: 2,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(previewActivationRequest("server-only-token", requestId)).resolves.toEqual({
      kind: "ready", preview: {
        productId: "pulse", name: "Pulse", deviceLabel: "Studio Mac", requestedAt: 1,
        activeActivationCount: 1, remainingActivationSlots: 2,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(new URL(`/v1/customer/activation-requests/${requestId}`, "https://api.test"), expect.objectContaining({
      cache: "no-store", headers: { Authorization: "Bearer server-only-token" }, method: "GET",
    }));
  });

  it("accepts the canonical Cue preview used by the staging fixture", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      productId: "cue", name: "Cue", deviceLabel: null, requestedAt: 1,
      activeActivationCount: 0, remainingActivationSlots: 3,
    })));

    await expect(previewActivationRequest("server-only-token", requestId)).resolves.toMatchObject({ kind: "ready", preview: { productId: "cue", name: "Cue" } });
  });

  it("does not accept tickets or provider fields as a decision response", async () => {
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ state: "approved", ticket: "not-allowed" })));
    await expect(decideActivationRequest("server-only-token", requestId, "approve")).resolves.toEqual({ kind: "error", error: "licensingUnavailable" });
  });
});
