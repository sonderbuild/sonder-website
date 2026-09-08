import type { AuthenticationResponse } from "@workos-inc/node";

export type MagicAuthClient = {
  createMagicAuth(input: {
    email: string;
    ipAddress?: string;
    radarAuthAttemptId?: string;
    userAgent?: string;
  }): Promise<{ radarAuthAttemptId?: string }>;
  authenticateWithMagicAuth(input: {
    clientId: string;
    email: string;
    code: string;
    ipAddress?: string;
    radarAuthAttemptId?: string;
    userAgent?: string;
  }): Promise<AuthenticationResponse>;
};

type RequestContext = {
  ipAddress?: string;
  radarAuthAttemptId?: string;
  userAgent?: string;
};

type MagicAuthRequestResult =
  | { kind: "accepted"; radarAuthAttemptId?: string }
  | { kind: "invalidEmail" }
  | { kind: "rateLimited" }
  | { kind: "unavailable" };

type MagicAuthVerificationResult =
  | { kind: "authenticated"; response: AuthenticationResponse }
  | { kind: "invalidCode" }
  | { kind: "unverified" }
  | { kind: "rateLimited" }
  | { kind: "unavailable" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const codePattern = /^\d{6}$/;

export function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const email = value.trim();
  return email.length <= 254 && emailPattern.test(email) ? email : undefined;
}

export function normalizeMagicAuthCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const code = value.trim();
  return codePattern.test(code) ? code : undefined;
}

export async function requestMagicAuth(
  client: MagicAuthClient,
  emailValue: unknown,
  context: RequestContext = {},
): Promise<MagicAuthRequestResult> {
  const email = normalizeEmail(emailValue);
  if (!email) return { kind: "invalidEmail" };

  try {
    const response = await client.createMagicAuth({ email, ...context });
    return {
      kind: "accepted",
      ...(response.radarAuthAttemptId ? { radarAuthAttemptId: response.radarAuthAttemptId } : {}),
    };
  } catch (error) {
    return statusOf(error) === 429 ? { kind: "rateLimited" } : { kind: "unavailable" };
  }
}

export async function verifyMagicAuth(
  client: MagicAuthClient,
  clientId: string | undefined,
  emailValue: unknown,
  codeValue: unknown,
  context: RequestContext = {},
): Promise<MagicAuthVerificationResult> {
  const email = normalizeEmail(emailValue);
  const code = normalizeMagicAuthCode(codeValue);
  if (!email || !code || !clientId) return { kind: "invalidCode" };

  try {
    const response = await client.authenticateWithMagicAuth({ clientId, email, code, ...context });
    return response.user.emailVerified ? { kind: "authenticated", response } : { kind: "unverified" };
  } catch (error) {
    const status = statusOf(error);
    if (status === 429) return { kind: "rateLimited" };
    return status !== undefined && status >= 500 ? { kind: "unavailable" } : { kind: "invalidCode" };
  }
}

export async function persistMagicAuthSession(
  response: AuthenticationResponse,
  save: (response: AuthenticationResponse) => Promise<void>,
): Promise<{ kind: "authenticated" } | { kind: "unavailable" }> {
  try {
    await save(response);
    return { kind: "authenticated" };
  } catch {
    return { kind: "unavailable" };
  }
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;

  const status = error.status;
  return typeof status === "number" ? status : undefined;
}
