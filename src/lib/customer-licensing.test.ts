import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { customerLicensing, revokeCustomerActivation } from "./customer-licensing";

// Current producer fixture: sonder-api/test/customer-licensing.spec.ts,
// "returns a deterministic, private read model without writes or internal material".
// Includes D1 date strings, nullable device metadata and an inactive license.
const producerV1 = {
  products: [
    { productId: "crate", name: "Crate", entitlement: { status: "active" }, license: {
      status: "active", activationLimit: 1, activeActivationCount: 1, remainingActivationSlots: 0,
      activations: [{ activationId: "activation-crate", deviceLabel: "Crate Mac", activatedAt: "2026-09-10 12:00:00", lastSeenAt: null, status: "active" }],
    } },
    { productId: "cue", name: "Cue", entitlement: { status: "active" }, license: {
      status: "active", activationLimit: 3, activeActivationCount: 0, remainingActivationSlots: 3, activations: [],
    } },
    { productId: "frame", name: "Frame", entitlement: { status: "active" }, license: {
      status: "disabled", activationLimit: 2, activeActivationCount: 0, remainingActivationSlots: 0, activations: [],
    } },
    { productId: "monitor", name: "Monitor", entitlement: { status: "active" }, license: {
      status: "active", activationLimit: 3, activeActivationCount: 2, remainingActivationSlots: 1,
      activations: [
        { activationId: "activation-first", deviceLabel: null, activatedAt: "2026-09-10 10:00:00", lastSeenAt: null, status: "active" },
        { activationId: "activation-later", deviceLabel: "Studio Mac", activatedAt: "2026-09-11 10:00:00", lastSeenAt: "2026-09-11 11:00:00", status: "active" },
      ],
    } },
  ],
};
const unavailable = { kind: "error", error: "licensingUnavailable" };
const commonErrors = [
  [401, "unauthenticated"], [403, "accountUnlinked"], [403, "accountDisabled"],
  [403, "emailNotVerified"], [503, "authenticationUnavailable"], [503, "licensingUnavailable"],
] as const;

beforeEach(() => vi.stubEnv("SONDER_API_ORIGIN", "https://api.test"));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
function additive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(additive);
  if (value === null || typeof value !== "object") return value;
  return { ...Object.fromEntries(Object.entries(value).map(([key, field]) => [key, additive(field)])),
    providerId: "untrusted-provider", customerId: "untrusted-customer", authorization: { canActivate: true } };
}
function changed(path: string, value?: unknown) {
  const body = structuredClone(producerV1);
  const keys = path.split(".");
  let target = body as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  const key = keys.at(-1)!;
  if (value === undefined) delete target[key]; else target[key] = value;
  return body;
}

describe("customer licensing v1 response compatibility", () => {
  it.each([false, true])("consumes the current producer with additive fields=%s and returns only known data", async extra => {
    const fetchMock = respond(extra ? additive(producerV1) : producerV1);
    await expect(customerLicensing("server-token")).resolves.toEqual({ kind: "ready", products: producerV1.products });
    expect(fetchMock).toHaveBeenCalledWith(new URL("https://api.test/v1/customer/licenses"), {
      cache: "no-store", headers: { Authorization: "Bearer server-token" },
    });
  });

  it.each([
    "products", "products.0.productId", "products.0.name", "products.0.entitlement", "products.0.entitlement.status",
    ...["status", "activationLimit", "activeActivationCount", "remainingActivationSlots", "activations"].map(key => `products.0.license.${key}`),
    ...["activationId", "deviceLabel", "activatedAt", "lastSeenAt", "status"].map(key => `products.0.license.activations.0.${key}`),
  ])("rejects missing required known field %s even with additive fields", async path => {
    respond(additive(changed(path)));
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
  });

  it.each([
    ["products", {}], ["products.0", []], ["products.0.productId", 1], ["products.0.name", "Wrong name"],
    ["products.0.entitlement", []], ["products.0.entitlement.status", true], ["products.0.license", null],
    ["products.0.license", []], ["products.0.license.status", false],
    ["products.0.license.activationLimit", "3"], ["products.0.license.activationLimit", -1],
    ["products.0.license.activeActivationCount", 0.5], ["products.0.license.remainingActivationSlots", Number.MAX_SAFE_INTEGER + 1],
    ["products.0.license.activations", {}], ["products.0.license.activations.0", []],
    ["products.0.license.activations.0.activationId", "invalid/id"], ["products.0.license.activations.0.deviceLabel", 7],
    ["products.0.license.activations.0.activatedAt", null], ["products.0.license.activations.0.lastSeenAt", false],
  ])("rejects invalid known value at %s", async (path, value) => {
    respond(additive(changed(path as string, value)));
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
  });

  it.each(["products.0.entitlement.status", "products.0.license.status", "products.0.license.activations.0.status"])("fails closed when a newer producer introduces unknown lifecycle value at %s", async path => {
    respond(changed(path, "future-state"));
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
  });

  it("keeps empty, unlicensed and revoked entitlement states distinct from account linkage and capacity", async () => {
    const products = [
      { productId: "monitor", name: "Monitor", entitlement: { status: "active" } },
      { productId: "frame", name: "Frame", entitlement: { status: "revoked" }, license: {
        status: "refunded", activationLimit: 3, activeActivationCount: 0, remainingActivationSlots: 0, activations: [],
      } },
    ];
    respond(additive({ products }));
    await expect(customerLicensing("token")).resolves.toEqual({ kind: "ready", products });
    respond(additive({ products: [] }));
    await expect(customerLicensing("token")).resolves.toEqual({ kind: "ready", products: [] });
  });

  it.each(commonErrors)("preserves HTTP %s / %s without trusting extra account or entitlement claims", async (status, error) => {
    respond({ error, products: producerV1.products, ...additive({}) as object }, status);
    await expect(customerLicensing("token")).resolves.toEqual({ kind: "error", error });
    await expect(revokeCustomerActivation("token", "activation-id")).resolves.toEqual({ kind: "error", error });
  });

  it.each([[403, "stepUpRequired"], [404, "activationUnavailable"]] as const)("accepts revoke-only HTTP %s / %s only for revocation", async (status, error) => {
    respond(additive({ error }), status);
    await expect(revokeCustomerActivation("token", "activation-id")).resolves.toEqual({ kind: "error", error });
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
  });

  it.each([
    [200, { error: "accountUnlinked" }], [500, { error: "unauthenticated" }], [401, { error: "emailNotVerified" }],
    [403, { error: "licensingUnavailable" }], [503, { error: "accountDisabled" }], [403, { error: "future-error" }],
    [403, { error: 403 }], [403, { message: "accountUnlinked" }], [200, null], [200, []],
    [405, { error: "methodNotAllowed" }],
  ])("fails closed for mismatched or unknown HTTP %s error semantics", async (status, body) => {
    respond(additive(body), status as number);
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
    await expect(revokeCustomerActivation("token", "activation-id")).resolves.toEqual(unavailable);
  });

  it.each([false, true])("accepts revocation confirmation with additive fields=%s without returning unknown state", async extra => {
    respond(extra ? additive({ revoked: true }) : { revoked: true });
    await expect(revokeCustomerActivation("token", "activation-id")).resolves.toEqual({ kind: "revoked" });
  });

  it.each([{}, { revoked: false }, { revoked: "true" }, { status: "revoked" }, null, []])("requires the literal revocation confirmation %j", async body => {
    respond(additive(body));
    await expect(revokeCustomerActivation("token", "activation-id")).resolves.toEqual(unavailable);
  });

  it("treats transport/JSON failures as unavailable, without changing ownership", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
    await expect(revokeCustomerActivation("token", "activation-id")).resolves.toEqual(unavailable);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid json")));
    await expect(customerLicensing("token")).resolves.toEqual(unavailable);
  });
});
