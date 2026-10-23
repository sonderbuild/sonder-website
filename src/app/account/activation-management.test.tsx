import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerLicensingProduct } from "@/lib/customer-licensing";

const hooks = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, refresh: vi.fn(), read: vi.fn(), transition: Promise.resolve() as Promise<unknown> }));
// Node-only interaction harness: exercise the real component's callbacks and JSX
// without adding a DOM dependency. This is not browser/accessibility evidence.
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.state)) hooks.state[slot] = { current: initial };
    return hooks.state[slot];
  },
  useTransition: () => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.state)) hooks.state[slot] = false;
    return [hooks.state[slot], (action: () => Promise<void>) => {
      hooks.state[slot] = true;
      hooks.transition = action().finally(() => { hooks.state[slot] = false; });
    }];
  },
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.state)) hooks.state[slot] = initial;
    return [hooks.state[slot], (value: unknown) => { hooks.state[slot] = value; }];
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: hooks.refresh }) }));
vi.mock("./actions", () => ({ refreshActivationStatus: hooks.read }));
import { ActivationManagement } from "./activation-management";

const products: CustomerLicensingProduct[] = [{ productId: "monitor", name: "Monitor", entitlement: { status: "active" }, license: {
  status: "active", activationLimit: 3, activeActivationCount: 1, remainingActivationSlots: 2,
  activations: [{ activationId: "activation-id", deviceLabel: "Studio Mac", activatedAt: "2026-09-11 10:00:00", lastSeenAt: null, status: "active" }],
} }];
const confirmation = "Revoke activation for Studio Mac? This frees its activation slot without revoking your product entitlement. An offline device with a valid perpetual entitlement can keep using the app until its next successful online check. Time-limited offline access ends at its signed end date.";
let confirm: ReturnType<typeof vi.fn>;

beforeEach(() => {
  hooks.state = []; hooks.cursor = 0; hooks.refresh.mockReset(); hooks.read.mockReset(); hooks.transition = Promise.resolve();
  confirm = vi.fn().mockReturnValue(true);
  vi.stubGlobal("window", { confirm });
});
afterEach(() => vi.unstubAllGlobals());
function render(input = products) { hooks.cursor = 0; return ActivationManagement({ products: input }); }
function markup(input = products) { return renderToStaticMarkup(render(input)); }
function findButton(tree: unknown, label?: string): ReactElement<{onClick: () => Promise<void>; disabled: boolean}> | undefined {
  if (Array.isArray(tree)) return tree.map(child => findButton(child, label)).find(Boolean);
  if (!isValidElement<{children?: unknown}>(tree)) return;
  if (tree.type === "button" && (!label || tree.props.children === label)) return tree as ReactElement<{onClick: () => Promise<void>; disabled: boolean}>;
  return findButton(tree.props.children, label);
}
function click() { const button = findButton(render()); if (!button) throw new Error("missing revoke button"); return button.props.onClick(); }
function respond(response: () => Promise<Response>) {
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ token: "csrf-token" })).mockImplementationOnce(response);
  vi.stubGlobal("fetch", fetchMock); return fetchMock;
}

describe("account activation revoke presentation", () => {
  it("explains activation versus entitlement and conditional offline validity, without inventing expiry or immediate offline invalidation", async () => {
    confirm.mockReturnValue(false); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await click();
    expect(confirm).toHaveBeenCalledWith(confirmation);
    expect(confirmation).not.toContain("ticket expires");
    expect(fetchMock).not.toHaveBeenCalled(); expect(hooks.refresh).not.toHaveBeenCalled();
    expect(markup()).toContain("1 of 3 used"); expect(markup()).not.toContain("Activation revoked.");
  });

  it("keeps pending counts authoritative and announces success only after a confirmed response", async () => {
    let complete!: (value: Response) => void;
    const fetchMock = respond(() => new Promise(resolve => { complete = resolve; }));
    const request = click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(markup()).toContain("Revoking…"); expect(findButton(render())?.props.disabled).toBe(true);
    expect(markup()).toContain("1 of 3 used"); expect(markup()).not.toContain("Activation revoked.");
    expect(hooks.refresh).not.toHaveBeenCalled();
    complete(Response.json({ revoked: true })); await request;
    expect(markup()).toContain('role="status"');
    expect(markup()).toContain("Activation revoked. Your product entitlement is unchanged.");
    expect(markup()).toContain("1 of 3 used"); // Wait for server data, not an optimistic capacity change.
    expect(hooks.refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/account/activations/activation-id/revoke", expect.objectContaining({ method: "POST", headers: { "X-Sonder-Csrf": "csrf-token" } }));
    const refreshed = structuredClone(products); refreshed[0].license!.activations = [];
    refreshed[0].license!.activeActivationCount = 0; refreshed[0].license!.remainingActivationSlots = 3;
    expect(markup(refreshed)).toContain("0 of 3 used"); expect(markup(refreshed)).toContain("3 slots available");
    expect(refreshed[0].entitlement.status).toBe("active");
  });

  it.each([
    [401, "unauthenticated"], [403, "accountUnlinked"], [403, "accountDisabled"],
    [403, "emailNotVerified"], [403, "stepUpRequired"], [404, "activationUnavailable"],
  ])("retains failure feedback for a rejected HTTP %s / %s", async (status, error) => {
    respond(async () => Response.json({ error }, { status })); await click();
    expect(markup()).toContain('role="alert"');
    expect(markup()).toContain("We could not revoke this activation. Please try again shortly.");
    expect(markup()).not.toContain("Activation revoked."); expect(markup()).toContain("1 of 3 used");
    expect(hooks.refresh).not.toHaveBeenCalled(); expect(findButton(render())?.props.disabled).toBe(false);
  });

  it.each([
    ["lost response", async () => { throw new Error("response lost after possible commit"); }],
    ["request timeout", async () => Response.json({ error: "timeout" }, { status: 408 })],
    ["server unavailable", async () => Response.json({ error: "licensingUnavailable" }, { status: 503 })],
    ["malformed response", async () => new Response("invalid JSON")],
    ["unconfirmed success", async () => Response.json({ revoked: false })],
  ] as const)("does not claim failure or success for %s", async (_name, response) => {
    respond(response); await click();
    expect(markup()).toContain("We could not confirm whether this activation was revoked.");
    expect(markup()).toContain("Refresh your account to check its status before trying again.");
    expect(markup()).not.toContain("Activation revoked."); expect(markup()).toContain("1 of 3 used");
    expect(hooks.refresh).not.toHaveBeenCalled();
  });

  it("describes a pre-request failure without sending a revoke request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: "unavailable" }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock); await click();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(markup()).toContain("We could not start revoking this activation. Please try again shortly.");
    expect(hooks.refresh).not.toHaveBeenCalled();
  });

  it("does not recast confirmed revocation as uncertain when refreshing the account fails", async () => {
    hooks.refresh.mockImplementation(() => { throw new Error("refresh failed"); });
    respond(async () => Response.json({ revoked: true })); await click();
    expect(markup()).toContain("Activation revoked. Your product entitlement is unchanged.");
    expect(markup()).toContain("we could not refresh your account");
    expect(markup()).not.toContain("We could not confirm whether");
    expect(findButton(render(), "Refresh activation status")).toBeUndefined();
  });
});


async function uncertain() {
  const fetchMock = respond(async () => { throw new Error("lost revoke response"); });
  await click();
  return fetchMock;
}
async function recover() {
  const button = findButton(render(), "Refresh activation status");
  if (!button) throw new Error("missing refresh action");
  button.props.onClick();
  await hooks.transition;
}

describe("activation status recovery", () => {
  it("uses a native keyboard button, prevents repeated dispatch and announces busy state without another revoke", async () => {
    const fetchMock = await uncertain();
    let complete!: (value: { kind: "ready"; products: CustomerLicensingProduct[] }) => void;
    hooks.read.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const button = findButton(render(), "Refresh activation status")!;
    button.props.onClick(); button.props.onClick(); // Same handler, before the next render.
    expect(hooks.read).toHaveBeenCalledTimes(1);
    expect(markup()).toContain("Refreshing activation status…");
    expect(markup()).toContain('role="status"');
    expect(markup()).toContain('aria-busy="true"');
    expect(findButton(render(), "Refresh activation status")?.props.disabled).toBe(true);
    expect(markup()).not.toContain("1 of 3 used");
    complete({ kind: "ready", products: structuredClone(products) }); await hooks.transition;
    expect(markup()).toContain("Activation status refreshed.");
    expect(markup()).toContain("does not confirm the outcome of the earlier request");
    expect(markup()).toContain("1 of 3 used");
    expect(markup()).not.toContain("Activation revoked.");
    expect(findButton(render(), "Refresh activation status")?.props.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
    expect(hooks.refresh).not.toHaveBeenCalled();
  });

  it("renders the fresh server list and capacity without interpreting absence as revoke confirmation", async () => {
    await uncertain();
    const fresh = structuredClone(products);
    fresh[0].license!.activations = []; fresh[0].license!.activeActivationCount = 0; fresh[0].license!.remainingActivationSlots = 3;
    hooks.read.mockResolvedValue({ kind: "ready", products: fresh }); await recover();
    expect(markup()).toContain("0 of 3 used"); expect(markup()).toContain("3 slots available");
    expect(markup()).not.toContain("Studio Mac"); expect(markup()).not.toContain("Activation revoked.");
    expect(markup()).toContain("does not confirm the outcome of the earlier request");
  });

  it("renders an empty authoritative result while retaining recovery feedback", async () => {
    await uncertain(); hooks.read.mockResolvedValue({ kind: "ready", products: [] }); await recover();
    expect(markup()).toContain("No active products with activation slots");
    expect(markup()).toContain("Activation status refreshed.");
    expect(markup()).not.toContain("1 of 3 used");
    expect(findButton(render(), "Refresh activation status")).toBeDefined();
  });

  it.each([
    ["unauthenticated", "Your session has expired"],
    ["accountUnlinked", "No sonder customer account is connected"],
    ["accountDisabled", "This customer account is currently unavailable"],
    ["emailNotVerified", "A verified email is required"],
    ["authenticationUnavailable", "We could not verify your session"],
    ["licensingUnavailable", "We could not refresh activation status"],
  ] as const)("preserves %s feedback and hides old activation data", async (error, message) => {
    const fetchMock = await uncertain(); hooks.read.mockResolvedValue({ kind: "error", error }); await recover();
    expect(markup()).toContain(message); expect(markup()).toContain('role="alert"');
    expect(markup()).not.toContain("Studio Mac"); expect(markup()).not.toContain("1 of 3 used");
    expect(markup()).not.toContain("No active products with activation slots");
    expect(markup()).not.toContain("Activation revoked.");
    expect(markup().includes('href="/login"')).toBe(error === "unauthenticated");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("allows an explicit read retry after transport failure without trusting stale data or resubmitting revocation", async () => {
    const fetchMock = await uncertain(); hooks.read.mockRejectedValueOnce(new Error("offline")); await recover();
    expect(markup()).toContain("We could not refresh activation status. Please try again.");
    expect(markup()).not.toContain("1 of 3 used");
    hooks.read.mockResolvedValue({ kind: "ready", products }); await recover();
    expect(markup()).toContain("1 of 3 used"); expect(hooks.read).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not offer recovery for a definite rejection or replace a confirmed success with an uncertain outcome", async () => {
    respond(async () => Response.json({ error: "activationUnavailable" }, { status: 404 })); await click();
    expect(findButton(render(), "Refresh activation status")).toBeUndefined();
    respond(async () => Response.json({ revoked: true })); await click();
    expect(markup()).toContain("Activation revoked. Your product entitlement is unchanged.");
    expect(findButton(render(), "Refresh activation status")).toBeUndefined();
  });
});


it("does not let a recovery snapshot override a newer server-rendered account list", async () => {
  await uncertain(); hooks.read.mockResolvedValue({ kind: "ready", products }); await recover();
  expect(markup()).toContain("1 of 3 used");
  const newer = structuredClone(products);
  newer[0].license!.activations = []; newer[0].license!.activeActivationCount = 0; newer[0].license!.remainingActivationSlots = 3;
  expect(markup(newer)).toContain("0 of 3 used"); expect(markup(newer)).not.toContain("Studio Mac");
});


it("ignores a late recovery result after newer server props have arrived", async () => {
  await uncertain();
  let complete!: (value: { kind: "ready"; products: CustomerLicensingProduct[] }) => void;
  hooks.read.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  findButton(render(), "Refresh activation status")!.props.onClick();
  const newer = structuredClone(products);
  newer[0].license!.activations = []; newer[0].license!.activeActivationCount = 0; newer[0].license!.remainingActivationSlots = 3;
  markup(newer);
  complete({ kind: "ready", products }); await hooks.transition;
  expect(markup(newer)).toContain("0 of 3 used"); expect(markup(newer)).not.toContain("Studio Mac");
});
