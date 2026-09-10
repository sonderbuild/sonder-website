import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ withAuth: vi.fn() }));

vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: mocks.withAuth }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/components/ui/container", () => ({ Container: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/activation/approval-controls", () => ({ ApprovalControls: () => <div>approval controls</div> }));

import ActivationApprovalPage from "./page";

const requestId = "A".repeat(43);

describe("activation approval page", () => {
  it("returns a signed-out customer to the same opaque request after login", async () => {
    mocks.withAuth.mockResolvedValue({ user: null, accessToken: null });
    await expect(ActivationApprovalPage({ params: Promise.resolve({ activationRequestId: requestId }) })).rejects.toThrow(`redirect:/login?returnTo=%2Faccount%2Factivate%2F${requestId}`);
  });

  it("renders only provider-neutral preview fields for a linked customer", async () => {
    mocks.withAuth.mockResolvedValue({ user: { id: "user_01" }, accessToken: "server-only-token" });
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      productId: "pulse", name: "Pulse", deviceLabel: "Studio Mac", requestedAt: 1,
      activeActivationCount: 1, remainingActivationSlots: 2,
    })));

    const html = renderToStaticMarkup(await ActivationApprovalPage({ params: Promise.resolve({ activationRequestId: requestId }) }));
    expect(html).toContain("Activate Pulse?");
    expect(html).toContain("Studio Mac");
    expect(html).toContain("1 of 3 used");
    expect(html).not.toContain("server-only-token");
    expect(html).not.toContain("user_01");
  });

  it("fails closed for a terminal request", async () => {
    mocks.withAuth.mockResolvedValue({ user: { id: "user_01" }, accessToken: "server-only-token" });
    vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "activationRequestFinalized" }, { status: 409 })));

    const html = renderToStaticMarkup(await ActivationApprovalPage({ params: Promise.resolve({ activationRequestId: requestId }) }));
    expect(html).toContain("Activation request finished");
    expect(html).not.toContain("approval controls");
  });
});
