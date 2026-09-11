export type ActivationPreview = {
  productId: "pulse" | "frame" | "crate" | "cue";
  name: "Pulse" | "Frame" | "Crate" | "Cue";
  deviceLabel: string | null;
  requestedAt: number;
  activeActivationCount: number;
  remainingActivationSlots: number;
};

export type ActivationApiError =
  | "unauthenticated"
  | "accountUnlinked"
  | "accountDisabled"
  | "emailNotVerified"
  | "activationRequestUnavailable"
  | "activationRequestFinalized"
  | "activationLimitReached"
  | "entitlementUnavailable"
  | "authenticationUnavailable"
  | "licensingUnavailable";

const requestIdPattern = /^[A-Za-z0-9_-]{43}$/;

export function isActivationRequestId(value: string): boolean {
  return requestIdPattern.test(value);
}

export function activationReturnPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^\/account\/activate\/([A-Za-z0-9_-]{43})$/.exec(value);
  return match && isActivationRequestId(match[1]) ? value : undefined;
}

export function activationLoginPath(activationRequestId: string): string {
  return `/login?returnTo=${encodeURIComponent(`/account/activate/${activationRequestId}`)}`;
}

export function apiOrigin(): URL | undefined {
  const value = process.env.SONDER_API_ORIGIN;
  if (!value) return undefined;
  try {
    const origin = new URL(value);
    return origin.protocol === "https:" || origin.hostname === "localhost" ? origin : undefined;
  } catch {
    return undefined;
  }
}

export async function previewActivationRequest(accessToken: string, activationRequestId: string): Promise<{ kind: "ready"; preview: ActivationPreview } | { kind: "error"; error: ActivationApiError }> {
  const result = await activationRequestApi("GET", accessToken, activationRequestId);
  return result.kind === "ready" || result.kind === "error" ? result : { kind: "error", error: "licensingUnavailable" };
}

export async function decideActivationRequest(accessToken: string, activationRequestId: string, action: "approve" | "deny"): Promise<{ kind: "decision"; state: "approved" | "denied" } | { kind: "error"; error: ActivationApiError }> {
  const result = await activationRequestApi("POST", accessToken, activationRequestId, action);
  return result.kind === "decision" || result.kind === "error" ? result : { kind: "error", error: "licensingUnavailable" };
}

async function activationRequestApi(method: "GET" | "POST", accessToken: string, activationRequestId: string, action?: "approve" | "deny"): Promise<{ kind: "ready"; preview: ActivationPreview } | { kind: "decision"; state: "approved" | "denied" } | { kind: "error"; error: ActivationApiError }> {
  const origin = apiOrigin();
  if (!origin || !isActivationRequestId(activationRequestId)) return { kind: "error", error: "licensingUnavailable" };

  try {
    const response = await fetch(new URL(`/v1/customer/activation-requests/${activationRequestId}${action ? `/${action}` : ""}`, origin), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      method,
    });
    const body: unknown = await response.json().catch(() => null);
    if (method === "GET" && response.status === 200 && isActivationPreview(body)) return { kind: "ready", preview: body };
    if (method === "POST" && response.status === 200 && isDecision(body)) return { kind: "decision", state: body.state };
    return { kind: "error", error: knownError(body) ?? "licensingUnavailable" };
  } catch {
    return { kind: "error", error: "licensingUnavailable" };
  }
}

function isActivationPreview(value: unknown): value is ActivationPreview {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 6) return false;
  const preview = value as Record<string, unknown>;
  return (preview.productId === "pulse" && preview.name === "Pulse" || preview.productId === "frame" && preview.name === "Frame" || preview.productId === "crate" && preview.name === "Crate" || preview.productId === "cue" && preview.name === "Cue")
    && (typeof preview.deviceLabel === "string" || preview.deviceLabel === null)
    && Number.isSafeInteger(preview.requestedAt)
    && typeof preview.activeActivationCount === "number" && Number.isSafeInteger(preview.activeActivationCount) && preview.activeActivationCount >= 0
    && typeof preview.remainingActivationSlots === "number" && Number.isSafeInteger(preview.remainingActivationSlots) && preview.remainingActivationSlots >= 0;
}

function isDecision(value: unknown): value is { state: "approved" | "denied" } {
  return typeof value === "object" && value !== null && Object.keys(value).length === 1
    && ((value as Record<string, unknown>).state === "approved" || (value as Record<string, unknown>).state === "denied");
}

function knownError(value: unknown): ActivationApiError | undefined {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 1) return undefined;
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && ["unauthenticated", "accountUnlinked", "accountDisabled", "emailNotVerified", "activationRequestUnavailable", "activationRequestFinalized", "activationLimitReached", "entitlementUnavailable", "authenticationUnavailable", "licensingUnavailable"].includes(error)
    ? error as ActivationApiError
    : undefined;
}
