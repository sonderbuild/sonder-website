import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerLicensingProduct, CustomerLicensingError } from "@/lib/customer-licensing";

const hooks = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, refresh: vi.fn(), read: vi.fn(), transition: Promise.resolve() as Promise<unknown>, effects: new Map<number, { deps: unknown[]; cleanup?: () => void }>(), commits: [] as Array<() => void>, updates: vi.fn() }));
// Node-only interaction harness: exercise the real component's callbacks and JSX
// without adding a DOM dependency. This is not browser/accessibility evidence.
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    const slot = hooks.cursor++;
    const previous = hooks.effects.get(slot);
    if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
      hooks.commits.push(() => {
        previous?.cleanup?.();
        hooks.effects.set(slot, { deps, cleanup: effect() || undefined });
      });
    }
  },
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
    return [hooks.state[slot], (value: unknown) => { hooks.updates(); hooks.state[slot] = value; }];
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
  hooks.state = []; hooks.cursor = 0; hooks.refresh.mockReset(); hooks.read.mockReset(); hooks.transition = Promise.resolve(); hooks.effects.clear(); hooks.commits = []; hooks.updates.mockReset();
  confirm = vi.fn().mockReturnValue(true);
  vi.stubGlobal("window", { confirm });
});
function unmount() { for (const effect of hooks.effects.values()) effect.cleanup?.(); hooks.effects.clear(); }
afterEach(() => { unmount(); vi.unstubAllGlobals(); });
function render(input = products, initialError?: CustomerLicensingError) {
  hooks.cursor = 0;
  const tree = ActivationManagement({ products: input, initialError });
  for (const commit of hooks.commits.splice(0)) commit();
  return tree;
}
function markup(input = products, initialError?: CustomerLicensingError) { return renderToStaticMarkup(render(input, initialError)); }
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


const emptyProducts: CustomerLicensingProduct[] = [];
async function retry(error: CustomerLicensingError = "licensingUnavailable") {
  const button = findButton(render(emptyProducts, error), "Try again");
  if (!button) throw new Error("missing retry");
  button.props.onClick(); await hooks.transition;
}

describe("initial activation-list retry", () => {
  it.each(["licensingUnavailable", "authenticationUnavailable"] as const)("offers only an explicit read retry for %s, without a mutation", async error => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(markup(emptyProducts, error)).toContain("Try again"); expect(hooks.read).not.toHaveBeenCalled();
    hooks.read.mockResolvedValue({ kind: "ready", products }); await retry(error);
    expect(markup(emptyProducts, error)).toContain("Activation details loaded.");
    expect(markup(emptyProducts, error)).toContain("1 of 3 used");
    expect(findButton(render(emptyProducts, error), "Try again")).toBeUndefined();
    expect(hooks.read).toHaveBeenCalledOnce(); expect(fetchMock).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
    expect(hooks.refresh).not.toHaveBeenCalled();
  });

  it("guards repeated clicks, announces loading and focuses the resulting feedback", async () => {
    let complete!: (value: {kind: "ready"; products: CustomerLicensingProduct[]}) => void;
    hooks.read.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const initial = render(emptyProducts, "licensingUnavailable");
    const feedbackElement = (initial.props.children as unknown[]).find(child => isValidElement<{role: string}>(child) && child.props.role === "alert") as ReactElement<{ref: {current: {focus: (options: unknown) => void} | null}; tabIndex: number}>;
    const focus = vi.fn(); feedbackElement.props.ref.current = { focus };
    const button = findButton(initial, "Try again")!;
    button.props.onClick(); button.props.onClick();
    expect(hooks.read).toHaveBeenCalledOnce();
    expect(markup(emptyProducts, "licensingUnavailable")).toContain("Refreshing activation status…");
    expect(markup(emptyProducts, "licensingUnavailable")).toContain('aria-busy="true"');
    expect(findButton(render(emptyProducts, "licensingUnavailable"), "Try again")?.props.disabled).toBe(true);
    expect(focus).not.toHaveBeenCalled();
    complete({ kind: "ready", products }); await hooks.transition;
    expect(markup(emptyProducts, "licensingUnavailable")).toContain('role="status"');
    expect(feedbackElement.props.tabIndex).toBe(-1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("keeps network failure retryable without rendering an invented empty account", async () => {
    hooks.read.mockRejectedValueOnce(new Error("offline")); await retry();
    expect(markup(emptyProducts, "licensingUnavailable")).toContain("We could not refresh activation status");
    expect(markup(emptyProducts, "licensingUnavailable")).not.toContain("No active products");
    expect(findButton(render(emptyProducts, "licensingUnavailable"), "Try again")).toBeDefined();
    hooks.read.mockResolvedValue({ kind: "ready", products: [] }); await retry();
    expect(markup(emptyProducts, "licensingUnavailable")).toContain("No active products");
    expect(markup(emptyProducts, "licensingUnavailable")).toContain("Activation details loaded.");
  });

  it.each([
    ["unauthenticated", "Your session has expired"], ["accountUnlinked", "No sonder customer account is connected"],
    ["accountDisabled", "This customer account is currently unavailable"], ["emailNotVerified", "A verified email is required"],
    ["activationUnavailable", "We could not refresh activation status"], ["stepUpRequired", "We could not refresh activation status"],
  ] as const)("does not offer Try again for %s", async (error, message) => {
    expect(findButton(render(emptyProducts, error), "Try again")).toBeUndefined();
    hooks.read.mockResolvedValue({ kind: "error", error }); await retry();
    const html = markup(emptyProducts, "licensingUnavailable");
    expect(html).toContain(message); expect(html).not.toContain("Try again"); expect(html).not.toContain("No active products");
    expect(html.includes('href="/login"')).toBe(error === "unauthenticated");
  });

  it("ignores a late success after the server reports an authentication/linkage change", async () => {
    let complete!: (value: {kind: "ready"; products: CustomerLicensingProduct[]}) => void;
    hooks.read.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    findButton(render(emptyProducts, "licensingUnavailable"), "Try again")!.props.onClick();
    markup(emptyProducts, "accountUnlinked"); // Same products, different authoritative account state.
    complete({ kind: "ready", products }); await hooks.transition;
    const html = markup(emptyProducts, "accountUnlinked");
    expect(html).toContain("No sonder customer account is connected"); expect(html).not.toContain("Studio Mac");
    expect(html).not.toContain("Activation details loaded."); expect(html).not.toContain("Try again");
  });

  it("does not dispatch a read result after navigation unmounts the account", async () => {
    let complete!: (value: {kind: "ready"; products: CustomerLicensingProduct[]}) => void;
    hooks.read.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    findButton(render(emptyProducts, "licensingUnavailable"), "Try again")!.props.onClick();
    unmount(); hooks.updates.mockClear();
    complete({ kind: "ready", products }); await hooks.transition;
    expect(hooks.updates).not.toHaveBeenCalled();
  });
  it("lets a new account scope finish a retry while an old read remains pending", async () => {
    let completeOld!: (value: {kind: "ready"; products: CustomerLicensingProduct[]}) => void;
    hooks.read.mockImplementationOnce(() => new Promise(resolve => { completeOld = resolve; }));
    findButton(render(emptyProducts, "licensingUnavailable"), "Try again")!.props.onClick();
    const oldTransition = hooks.transition;
    markup(emptyProducts, "authenticationUnavailable");
    expect(findButton(render(emptyProducts, "authenticationUnavailable"), "Try again")?.props.disabled).toBe(false);
    hooks.read.mockResolvedValue({ kind: "ready", products }); await retry("authenticationUnavailable");
    expect(markup(emptyProducts, "authenticationUnavailable")).toContain("1 of 3 used");
    expect(markup(emptyProducts, "authenticationUnavailable")).not.toContain("Refreshing activation status…");
    completeOld({ kind: "ready", products: [] }); await oldTransition;
    expect(markup(emptyProducts, "authenticationUnavailable")).toContain("1 of 3 used");
  });

});
