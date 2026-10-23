import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerLicensingProduct } from "@/lib/customer-licensing";

const hooks = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, refresh: vi.fn() }));
// Node-only interaction harness: exercise the real component's callbacks and JSX
// without adding a DOM dependency. This is not browser/accessibility evidence.
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.state)) hooks.state[slot] = initial;
    return [hooks.state[slot], (value: unknown) => { hooks.state[slot] = value; }];
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: hooks.refresh }) }));
import { ActivationManagement } from "./activation-management";

const products: CustomerLicensingProduct[] = [{ productId: "monitor", name: "Monitor", entitlement: { status: "active" }, license: {
  status: "active", activationLimit: 3, activeActivationCount: 1, remainingActivationSlots: 2,
  activations: [{ activationId: "activation-id", deviceLabel: "Studio Mac", activatedAt: "2026-09-11 10:00:00", lastSeenAt: null, status: "active" }],
} }];
const confirmation = "Revoke activation for Studio Mac? This frees its activation slot without revoking your product entitlement. An offline device with a valid perpetual entitlement can keep using the app until its next successful online check. Time-limited offline access ends at its signed end date.";
let confirm: ReturnType<typeof vi.fn>;

beforeEach(() => {
  hooks.state = []; hooks.cursor = 0; hooks.refresh.mockReset();
  confirm = vi.fn().mockReturnValue(true);
  vi.stubGlobal("window", { confirm });
});
afterEach(() => vi.unstubAllGlobals());
function render(input = products) { hooks.cursor = 0; return ActivationManagement({ products: input }); }
function markup(input = products) { return renderToStaticMarkup(render(input)); }
function findButton(tree: unknown): ReactElement<{onClick: () => Promise<void>; disabled: boolean}> | undefined {
  if (Array.isArray(tree)) return tree.map(findButton).find(Boolean);
  if (!isValidElement<{children?: unknown}>(tree)) return;
  if (tree.type === "button") return tree as ReactElement<{onClick: () => Promise<void>; disabled: boolean}>;
  return findButton(tree.props.children);
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
  });
});
