import { apiOrigin } from "@/lib/activation-approval";

export type CustomerLicensingProduct = {
  productId: "pulse" | "frame" | "crate";
  name: "Pulse" | "Frame" | "Crate";
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
    if (response.status === 200 && isCustomerLicensing(body)) return { kind: "ready", products: body.products };
    return { kind: "error", error: knownError(body) ?? "licensingUnavailable" };
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
    return { kind: "error", error: knownError(body) ?? "licensingUnavailable" };
  } catch {
    return { kind: "error", error: "licensingUnavailable" };
  }
}

export function isOpaqueActivationId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function isCustomerLicensing(value: unknown): value is { products: CustomerLicensingProduct[] } {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 1) return false;
  const products = (value as Record<string, unknown>).products;
  return Array.isArray(products) && products.every(isProduct);
}

function isProduct(value: unknown): value is CustomerLicensingProduct {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  if (!isCanonicalProduct(product) || !isEntitlement(product.entitlement)) return false;
  return product.license === undefined || isLicense(product.license);
}

function isCanonicalProduct(product: Record<string, unknown>): boolean {
  return Object.keys(product).every((key) => ["productId", "name", "entitlement", "license"].includes(key))
    && (product.productId === "pulse" && product.name === "Pulse" || product.productId === "frame" && product.name === "Frame" || product.productId === "crate" && product.name === "Crate");
}

function isEntitlement(value: unknown): boolean {
  return typeof value === "object" && value !== null && Object.keys(value).length === 1
    && ["active", "grace", "suspended", "revoked"].includes((value as Record<string, unknown>).status as string);
}

function isLicense(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 5) return false;
  const license = value as Record<string, unknown>;
  return ["active", "expired", "refunded", "disabled", "unknown"].includes(license.status as string)
    && isNonNegativeInteger(license.activationLimit)
    && isNonNegativeInteger(license.activeActivationCount)
    && isNonNegativeInteger(license.remainingActivationSlots)
    && Array.isArray(license.activations) && license.activations.every(isActivation);
}

function isActivation(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 5) return false;
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
  return typeof value === "object" && value !== null && Object.keys(value).length === 1 && (value as Record<string, unknown>).revoked === true;
}

function knownError(value: unknown): CustomerLicensingError | undefined {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 1) return undefined;
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && ["unauthenticated", "accountUnlinked", "accountDisabled", "emailNotVerified", "authenticationUnavailable", "licensingUnavailable", "activationUnavailable", "stepUpRequired"].includes(error)
    ? error as CustomerLicensingError
    : undefined;
}
