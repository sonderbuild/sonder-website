import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  withAuth: vi.fn(),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  signOut: mocks.signOut,
  withAuth: mocks.withAuth,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/ui/container", () => ({
  Container: ({ children }: { children: ReactNode }) => children,
}));

import { signOutAction } from "./actions";
import AccountPage from "./page";

describe("account session boundary", () => {
  it("rejects an unauthenticated account request before the customer API is called", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.withAuth.mockResolvedValue({ accessToken: null, user: null });

    await expect(AccountPage()).rejects.toThrow("redirect:/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to login when the API reports an unauthenticated session", async () => {
    mockAuthenticatedAccount({ status: 401, body: { error: "unauthenticated" } });

    await expect(AccountPage()).rejects.toThrow("redirect:/login");
  });

  it("redirects to login when ownership reports an expired API authentication state", async () => {
    mockAuthenticatedAccount(
      { status: 200, body: { identityId: "identity-id", customerId: "customer-id" } },
      { status: 401, body: { error: "unauthenticated" } },
    );

    await expect(AccountPage()).rejects.toThrow("redirect:/login");
  });

  it("renders the linked state only for the stable linked response shape", async () => {
    const fetchMock = mockAuthenticatedAccount(
      { status: 200, body: { identityId: "identity-id", customerId: "customer-id" } },
      { status: 200, body: { products: [{ productId: "pulse", name: "Pulse", entitlement: { status: "active" }, license: { status: "active", activationLimit: 3, activeActivationCount: 1, remainingActivationSlots: 2, activations: [{ activationId: "activation-id", deviceLabel: "Studio Mac", activatedAt: "2026-09-11T12:00:00Z", lastSeenAt: "2026-09-11T13:00:00Z", status: "active" }] } }] } },
    );

    const account = await renderAccount();
    expect(account).toContain("Your customer account is connected.");
    expect(account).toContain("Your products");
    expect(account).toContain("Pulse");
    expect(account).toContain("Activations");
    expect(account).toContain("1 of 3 used");
    expect(account).toContain("2 slots available");
    expect(account).toContain("Studio Mac");
    expect(account).not.toContain("identity-id");
    expect(account).not.toContain("customer-id");
    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ cache: "no-store", headers: { Authorization: "Bearer access-token" } }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders an explicit unlinked state without leaking account data", async () => {
    mockAuthenticatedAccount({ status: 403, body: { error: "accountUnlinked" } });

    const account = await renderAccount();
    expect(account).toContain("no sonder customer account is connected");
    expect(account).not.toContain("customer-id");
    expect(account).not.toContain("person@example.com");
  });

  it("renders a distinct disabled state without leaking account data", async () => {
    mockAuthenticatedAccount({ status: 403, body: { error: "accountDisabled" } });

    const account = await renderAccount();
    expect(account).toContain("customer account is currently unavailable");
    expect(account).not.toContain("customer-id");
    expect(account).not.toContain("person@example.com");
  });

  it("renders a distinct verification-required state without leaking account data", async () => {
    mockAuthenticatedAccount({ status: 403, body: { error: "emailNotVerified" } });

    const account = await renderAccount();
    expect(account).toContain("verified email is required before we can show your account");
    expect(account).not.toContain("customer-id");
    expect(account).not.toContain("person@example.com");
  });

  it("fails closed for an unknown error code or malformed response", async () => {
    mockAuthenticatedAccount({ status: 403, body: { error: "unexpected" } });
    await expect(renderAccount()).resolves.toContain("could not confirm account access");

    mockAuthenticatedAccount({ status: 200, body: { customerId: "customer-id" } });
    const account = await renderAccount();
    expect(account).toContain("could not confirm account access");
    expect(account).not.toContain("customer-id");
    expect(account).not.toContain("person@example.com");
  });

  it("does not render product data when the ownership response is malformed or unavailable", async () => {
    mockAuthenticatedAccount(
      { status: 200, body: { identityId: "identity-id", customerId: "customer-id" } },
      { status: 503, body: { error: "licensingUnavailable" } },
    );

    const account = await renderAccount();
    expect(account).toContain("could not load your activation details");
    expect(account).not.toContain("identity-id");
    expect(account).not.toContain("customer-id");
  });

  it("uses the existing WorkOS server-side sign-out operation", async () => {
    mocks.signOut.mockResolvedValue(undefined);

    await signOutAction();
    expect(mocks.signOut).toHaveBeenCalledWith({ returnTo: "/" });
  });
});

async function renderAccount() {
  return renderToStaticMarkup(await AccountPage());
}

function mockAuthenticatedAccount(...responses: Array<{ status: number; body: unknown }>) {
  mocks.withAuth.mockResolvedValue({ accessToken: "access-token", user: { email: "person@example.com", id: "user-id" } });
  vi.stubEnv("SONDER_API_ORIGIN", "https://api.test");
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(Response.json(response.body, { status: response.status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
