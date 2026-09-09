import type { AuthenticationResponse } from "@workos-inc/node";
import { describe, expect, it, vi } from "vitest";

import {
  authenticateSocialCode,
  createSocialAuthorizationUrl,
  encodeSocialState,
  readSocialCallback,
  type SocialAuthClient,
} from "./social-auth";

const authenticationResponse = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: { email: "customer@example.com", emailVerified: true, id: "user_01" },
} as AuthenticationResponse;

function client(overrides: Partial<SocialAuthClient> = {}): SocialAuthClient {
  return {
    authenticateWithCode: vi.fn().mockResolvedValue(authenticationResponse),
    getAuthorizationUrl: vi.fn().mockReturnValue("https://api.workos.com/user_management/authorize?state=state"),
    ...overrides,
  };
}

const state = "a0b1c2d3-e4f5-4123-8abc-1234567890ab";

describe("custom social authentication", () => {
  it("starts Google through WorkOS while only Google is configured", () => {
    const workos = client();

    expect(createSocialAuthorizationUrl(workos, {
      clientId: "client_01",
      provider: "google",
      redirectUri: "https://staging.sonder.build/api/auth/social/callback",
      state,
    }, ["google"])).toContain("api.workos.com");
    expect(workos.getAuthorizationUrl).toHaveBeenCalledWith({
      clientId: "client_01",
      provider: "GoogleOAuth",
      redirectUri: "https://staging.sonder.build/api/auth/social/callback",
      state,
    });
  });

  it("cannot start an unconfigured Apple provider", () => {
    const workos = client();

    expect(createSocialAuthorizationUrl(workos, {
      clientId: "client_01",
      provider: "apple",
      redirectUri: "https://staging.sonder.build/api/auth/social/callback",
      state,
    }, ["google"])).toBeUndefined();
    expect(workos.getAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("starts Apple through the same server-side WorkOS seam when configured", () => {
    const workos = client();

    expect(createSocialAuthorizationUrl(workos, {
      clientId: "client_01",
      provider: "apple",
      redirectUri: "https://staging.sonder.build/api/auth/social/callback",
      state,
    }, ["google", "apple"])).toContain("api.workos.com");
    expect(workos.getAuthorizationUrl).toHaveBeenCalledWith({
      clientId: "client_01",
      provider: "AppleOAuth",
      redirectUri: "https://staging.sonder.build/api/auth/social/callback",
      state,
    });
  });

  it("accepts a matching Google callback and exchanges its code server-side", async () => {
    const callback = readSocialCallback({
      code: "code_01",
      error: null,
      state,
      storedState: encodeSocialState("google", state),
    }, ["google"]);
    expect(callback).toEqual({ kind: "code", code: "code_01", provider: "google" });

    const workos = client();
    if (callback.kind !== "code") throw new Error("Expected an authorization code");
    await expect(authenticateSocialCode(workos, "client_01", callback.code)).resolves.toMatchObject({ kind: "authenticated" });
    expect(workos.authenticateWithCode).toHaveBeenCalledWith({ clientId: "client_01", code: "code_01" });
  });

  it("accepts a matching Apple callback and exchanges its code server-side", async () => {
    const callback = readSocialCallback({
      code: "code_01",
      error: null,
      state,
      storedState: encodeSocialState("apple", state),
    }, ["google", "apple"]);
    expect(callback).toEqual({ kind: "code", code: "code_01", provider: "apple" });

    const workos = client();
    if (callback.kind !== "code") throw new Error("Expected an authorization code");
    await expect(authenticateSocialCode(workos, "client_01", callback.code)).resolves.toMatchObject({ kind: "authenticated" });
    expect(workos.authenticateWithCode).toHaveBeenCalledWith({ clientId: "client_01", code: "code_01" });
  });

  it("treats provider cancellation as a safe return to login", () => {
    expect(readSocialCallback({
      code: null,
      error: "access_denied",
      state,
      storedState: encodeSocialState("apple", state),
    }, ["google", "apple"])).toEqual({ kind: "cancelled" });
  });

  it("rejects invalid state, unsupported provider state, and unconfigured callbacks", () => {
    expect(readSocialCallback({ code: "code_01", error: null, state: "different", storedState: encodeSocialState("google", state) }, ["google"])).toEqual({ kind: "invalid" });
    expect(readSocialCallback({ code: "code_01", error: null, state, storedState: encodeSocialState("apple", state) }, ["google"])).toEqual({ kind: "invalid" });
  });

  it("fails closed when WorkOS does not report a verified provider email", async () => {
    const workos = client({ authenticateWithCode: vi.fn().mockResolvedValue({ ...authenticationResponse, user: { ...authenticationResponse.user, emailVerified: false } }) });

    await expect(authenticateSocialCode(workos, "client_01", "code_01")).resolves.toEqual({ kind: "failed" });
  });
});
