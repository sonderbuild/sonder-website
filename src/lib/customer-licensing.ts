import { apiOrigin } from "@/lib/activation-approval";

export type CustomerLicensingProduct = {
  productId: "monitor" | "frame" | "crate" | "cue";
  name: "Monitor" | "Frame" | "Crate" | "Cue";
  entitlement: { status: "active" | "grace" | "suspended" | "revoked" };
  license?: {
    status: "active" | "expired" | "refunded" | "disabled" | "unknown";
    activationLimit: number;
    activeActivationCount: number;
    remainingActivationSlots: number;
    activations: Array<{
      activationId: string;
      deviceLabel: string | null;
      activatedAt: string;
      lastSeenAt: string | null;
      status: "active";
    }>;
  };
};

export type CustomerLicensingError = "unauthenticated" | "accountUnlinked" | "accountDisabled" | "emailNotVerified" | "authenticationUnavailable" | "licensingUnavailable" | "activationUnavailable" | "stepUpRequired";

export async function customerLicensing(accessToken: string): Promise<{ kind: "ready"; products: CustomerLicensingProduct[] } | { kind: "error"; error: CustomerLicensingError }> {
  const origin = apiOrigin();
  if (!origin) return { kind: "error", error: "licensingUnavailable" };

  try {
    const response = await fetch(new URL("/v1/customer/licenses", origin), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.status === 200 && isCustomerLicensing(body)) return { kind: "ready", products: body.products.map(knownProductFields) };
    return { kind: "error", error: knownError(body, response.status, false) ?? "licensingUnavailable" };
  } catch {
    return { kind: "error", error: "licensingUnavailable" };
  }
}

export async function revokeCustomerActivation(accessToken: string, activationId: string): Promise<{ kind: "revoked" } | { kind: "error"; error: CustomerLicensingError }> {
  const origin = apiOrigin();
  if (!origin || !isOpaqueActivationId(activationId)) return { kind: "error", error: "licensingUnavailable" };

  try {
    const response = await fetch(new URL(`/v1/customer/activations/${activationId}/revoke`, origin), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "POST",
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.status === 200 && isRevoked(body)) return { kind: "revoked" };
    return { kind: "error", error: knownError(body, response.status, true) ?? "licensingUnavailable" };
  } catch {
    return { kind: "error", error: "licensingUnavailable" };
  }
}

export function isOpaqueActivationId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function isCustomerLicensing(value: unknown): value is { products: CustomerLicensingProduct[] } {
  if (!isRecord(value)) return false;
  const products = (value as Record<string, unknown>).products;
  return Array.isArray(products) && products.every(isProduct);
}

function isProduct(value: unknown): value is CustomerLicensingProduct {
  if (!isRecord(value)) return false;
  const product = value as Record<string, unknown>;
  if (!isCanonicalProduct(product) || !isEntitlement(product.entitlement)) return false;
  return product.license === undefined || isLicense(product.license);
}

function isCanonicalProduct(product: Record<string, unknown>): boolean {
  return (product.productId === "monitor" && product.name === "Monitor" || product.productId === "frame" && product.name === "Frame" || product.productId === "crate" && product.name === "Crate" || product.productId === "cue" && product.name === "Cue");
}

function isEntitlement(value: unknown): boolean {
  return isRecord(value)
    && ["active", "grace", "suspended", "revoked"].includes((value as Record<string, unknown>).status as string);
}

function isLicense(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const license = value as Record<string, unknown>;
  return ["active", "expired", "refunded", "disabled", "unknown"].includes(license.status as string)
    && isNonNegativeInteger(license.activationLimit)
    && isNonNegativeInteger(license.activeActivationCount)
    && isNonNegativeInteger(license.remainingActivationSlots)
    && Array.isArray(license.activations) && license.activations.every(isActivation);
}

function isActivation(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const activation = value as Record<string, unknown>;
  return typeof activation.activationId === "string" && isOpaqueActivationId(activation.activationId)
    && (typeof activation.deviceLabel === "string" || activation.deviceLabel === null)
    && typeof activation.activatedAt === "string"
    && (typeof activation.lastSeenAt === "string" || activation.lastSeenAt === null)
    && activation.status === "active";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRevoked(value: unknown): boolean {
  return isRecord(value) && (value as Record<string, unknown>).revoked === true;
}

// Shared v1 permits additive keys. Project only known validated data into account
// state, including every nested object passed to the client activation component.
function knownProductFields(product: CustomerLicensingProduct): CustomerLicensingProduct {
  const license = product.license;
  return {
    productId: product.productId,
    name: product.name,
    entitlement: { status: product.entitlement.status },
    ...(license ? { license: {
      status: license.status,
      activationLimit: license.activationLimit,
      activeActivationCount: license.activeActivationCount,
      remainingActivationSlots: license.remainingActivationSlots,
      activations: license.activations.map((activation) => ({
        activationId: activation.activationId,
        deviceLabel: activation.deviceLabel,
        activatedAt: activation.activatedAt,
        lastSeenAt: activation.lastSeenAt,
        status: activation.status,
      })),
    } } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function knownError(value: unknown, status: number, revocation: boolean): CustomerLicensingError | undefined {
  if (!isRecord(value)) return undefined;
  const error = value.error;
  if (status === 401 && error === "unauthenticated") return error;
  if (status === 403 && (error === "accountUnlinked" || error === "accountDisabled" || error === "emailNotVerified")) return error;
  if (status === 503 && (error === "authenticationUnavailable" || error === "licensingUnavailable")) return error;
  if (revocation && status === 403 && error === "stepUpRequired") return error;
  if (revocation && status === 404 && error === "activationUnavailable") return error;
  return undefined;
}
