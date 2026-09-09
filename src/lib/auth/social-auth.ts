import { timingSafeEqual } from "node:crypto";

import type { AuthenticationResponse } from "@workos-inc/node";

export type SocialProvider = "apple" | "google";

type WorkOSSocialProvider = "AppleOAuth" | "GoogleOAuth";

export type SocialAuthClient = {
  authenticateWithCode(input: { clientId: string; code: string }): Promise<AuthenticationResponse>;
  getAuthorizationUrl(input: {
    clientId: string;
    provider: WorkOSSocialProvider;
    redirectUri: string;
    state: string;
  }): string;
};

export type SocialCallback =
  | { kind: "cancelled" }
  | { kind: "invalid" }
  | { kind: "code"; code: string; provider: SocialProvider };

export const socialStateCookieName = "sonder-social-state";

const workOSProvider: Record<SocialProvider, WorkOSSocialProvider> = {
  apple: "AppleOAuth",
  google: "GoogleOAuth",
};

export function configuredSocialProviders(value = process.env.WORKOS_SOCIAL_PROVIDERS): SocialProvider[] {
  if (!value) return [];

  return value.split(",").map((provider) => provider.trim()).flatMap((provider) => {
    const parsed = socialProvider(provider);
    return parsed ? [parsed] : [];
  }).filter((provider, index, all) => all.indexOf(provider) === index);
}

export function socialProvider(value: string): SocialProvider | undefined {
  return value === "apple" || value === "google" ? value : undefined;
}

export function createSocialState(): string {
  return crypto.randomUUID();
}

export function encodeSocialState(provider: SocialProvider, state: string): string {
  return `${provider}.${state}`;
}

export function createSocialAuthorizationUrl(
  client: SocialAuthClient,
  input: { clientId?: string; redirectUri?: string; provider: SocialProvider; state: string },
  enabledProviders: readonly SocialProvider[],
): string | undefined {
  if (!enabledProviders.includes(input.provider) || !input.clientId || !isAllowedCallbackUrl(input.redirectUri) || !isState(input.state)) {
    return undefined;
  }

  try {
    return client.getAuthorizationUrl({
      clientId: input.clientId,
      provider: workOSProvider[input.provider],
      redirectUri: input.redirectUri,
      state: input.state,
    });
  } catch {
    return undefined;
  }
}

export function readSocialCallback(
  input: { code: string | null; error: string | null; state: string | null; storedState: string | undefined },
  enabledProviders: readonly SocialProvider[],
): SocialCallback {
  const stored = parseStoredState(input.storedState);
  if (!stored || !input.state || !statesMatch(stored.state, input.state) || !enabledProviders.includes(stored.provider)) {
    return { kind: "invalid" };
  }
  if (input.error) return { kind: "cancelled" };
  if (!isOpaqueCode(input.code)) return { kind: "invalid" };
  return { kind: "code", code: input.code, provider: stored.provider };
}

export async function authenticateSocialCode(
  client: Pick<SocialAuthClient, "authenticateWithCode">,
  clientId: string | undefined,
  code: string,
): Promise<{ kind: "authenticated"; response: AuthenticationResponse } | { kind: "failed" }> {
  if (!clientId || !isOpaqueCode(code)) return { kind: "failed" };

  try {
    const response = await client.authenticateWithCode({ clientId, code });
    return response.user.emailVerified ? { kind: "authenticated", response } : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

function parseStoredState(value: string | undefined): { provider: SocialProvider; state: string } | undefined {
  if (!value) return undefined;
  const separator = value.indexOf(".");
  if (separator < 1) return undefined;
  const provider = socialProvider(value.slice(0, separator));
  const state = value.slice(separator + 1);
  return provider && isState(state) ? { provider, state } : undefined;
}

function isAllowedCallbackUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost");
  } catch {
    return false;
  }
}

function isState(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isOpaqueCode(value: string | null): value is string {
  return !!value && value.length <= 2_048 && /^[A-Za-z0-9._~-]+$/.test(value);
}

function statesMatch(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
