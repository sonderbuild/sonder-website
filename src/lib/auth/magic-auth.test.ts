import type { AuthenticationResponse } from "@workos-inc/node";
import { describe, expect, it, vi } from "vitest";

import {
  persistMagicAuthSession,
  requestMagicAuth,
  type MagicAuthClient,
  verifyMagicAuth,
} from "./magic-auth";

const authenticationResponse = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: { email: "customer@example.com", emailVerified: true, id: "user_01" },
} as AuthenticationResponse;

function client(overrides: Partial<MagicAuthClient> = {}): MagicAuthClient {
  return {
    authenticateWithMagicAuth: vi.fn().mockResolvedValue(authenticationResponse),
    createMagicAuth: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("custom Magic Auth", () => {
  it("requests a Magic Auth code without touching customer, license, or activation services", async () => {
    const workos = client();

    await expect(requestMagicAuth(workos, " customer@example.com ")).resolves.toEqual({ kind: "accepted" });
    expect(workos.createMagicAuth).toHaveBeenCalledWith({ email: "customer@example.com" });
    expect(workos.authenticateWithMagicAuth).not.toHaveBeenCalled();
  });

  it("rejects invalid email input before contacting WorkOS", async () => {
    const workos = client();

    await expect(requestMagicAuth(workos, "not-an-email")).resolves.toEqual({ kind: "invalidEmail" });
    expect(workos.createMagicAuth).not.toHaveBeenCalled();
  });

  it("maps WorkOS request throttling to a retryable result", async () => {
    const workos = client({ createMagicAuth: vi.fn().mockRejectedValue({ status: 429 }) });

    await expect(requestMagicAuth(workos, "customer@example.com")).resolves.toEqual({ kind: "rateLimited" });
  });

  it.each(["wrong", "expired"])("rejects a %s code without creating a session", async () => {
    const workos = client({ authenticateWithMagicAuth: vi.fn().mockRejectedValue({ status: 400 }) });

    await expect(verifyMagicAuth(workos, "client_01", "customer@example.com", "123456")).resolves.toEqual({ kind: "invalidCode" });
  });

  it("verifies a code, requires verified email, and saves only the server-side session", async () => {
    const workos = client();
    const save = vi.fn().mockResolvedValue(undefined);

    const result = await verifyMagicAuth(workos, "client_01", "customer@example.com", "123456");
    expect(result.kind).toBe("authenticated");
    if (result.kind !== "authenticated") throw new Error("Expected authenticated result");

    await expect(persistMagicAuthSession(result.response, save)).resolves.toEqual({ kind: "authenticated" });
    expect(workos.authenticateWithMagicAuth).toHaveBeenCalledWith({ clientId: "client_01", code: "123456", email: "customer@example.com" });
    expect(save).toHaveBeenCalledWith(authenticationResponse);
  });

  it("fails closed when WorkOS does not report a verified email", async () => {
    const workos = client({
      authenticateWithMagicAuth: vi.fn().mockResolvedValue({
        ...authenticationResponse,
        user: { ...authenticationResponse.user, emailVerified: false },
      }),
    });

    await expect(verifyMagicAuth(workos, "client_01", "customer@example.com", "123456")).resolves.toEqual({ kind: "unverified" });
  });

  it("does not report authentication when the session cannot be persisted", async () => {
    const save = vi.fn().mockRejectedValue(new Error("cookie failure"));

    await expect(persistMagicAuthSession(authenticationResponse, save)).resolves.toEqual({ kind: "unavailable" });
  });
});
