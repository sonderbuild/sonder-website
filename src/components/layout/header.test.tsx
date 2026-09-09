import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withAuth: vi.fn(),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: mocks.withAuth,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-image-alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/container", () => ({
  Container: ({ children }: { children: ReactNode }) => children,
}));

import { Header } from "./header";

async function renderedHeader() {
  return renderToStaticMarkup(await Header());
}

describe("shared header session state", () => {
  it("renders Sign in for a signed-out session", async () => {
    mocks.withAuth.mockResolvedValue({ accessToken: null, user: null });

    await expect(renderedHeader()).resolves.toContain('<a href="/login">Sign in</a>');
  });

  it("renders Account only for a sealed session with a user and access token", async () => {
    mocks.withAuth.mockResolvedValue({ accessToken: "access-token", user: { id: "user_01" } });

    const header = await renderedHeader();
    expect(header).toContain('<a href="/account">Account</a>');
    expect(header).not.toContain("Sign in");
    expect(header).not.toContain("user_01");
  });

  it("fails closed for expired or invalid sessions", async () => {
    mocks.withAuth.mockResolvedValueOnce({ accessToken: null, user: { id: "user_01" } });
    await expect(renderedHeader()).resolves.toContain('<a href="/login">Sign in</a>');

    mocks.withAuth.mockRejectedValueOnce(new Error("invalid session"));
    await expect(renderedHeader()).resolves.toContain('<a href="/login">Sign in</a>');
  });

  it("renders Sign in again after a server-side logout transition", async () => {
    mocks.withAuth.mockResolvedValueOnce({ accessToken: "access-token", user: { id: "user_01" } });
    await expect(renderedHeader()).resolves.toContain('<a href="/account">Account</a>');

    mocks.withAuth.mockResolvedValueOnce({ accessToken: null, user: null });
    await expect(renderedHeader()).resolves.toContain('<a href="/login">Sign in</a>');
  });
});
