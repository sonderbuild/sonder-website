import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

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
}));

vi.mock("@/components/ui/container", () => ({
  Container: ({ children }: { children: ReactNode }) => children,
}));

import { signOutAction } from "./actions";
import AccountPage from "./page";

describe("account session boundary", () => {
  it("rejects an unauthenticated account request before the customer API is called", async () => {
    mocks.withAuth.mockResolvedValue({ accessToken: null, user: null });

    await expect(AccountPage()).rejects.toThrow("redirect:/login");
  });

  it("uses the existing WorkOS server-side sign-out operation", async () => {
    mocks.signOut.mockResolvedValue(undefined);

    await signOutAction();
    expect(mocks.signOut).toHaveBeenCalledWith({ returnTo: "/" });
  });
});
