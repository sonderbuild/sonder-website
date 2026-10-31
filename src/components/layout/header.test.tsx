import { renderToStaticMarkup } from "react-dom/server";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withAuth: vi.fn(),
  link: vi.fn(),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: mocks.withAuth,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-image-alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
    mocks.link({ ...props, prefetch });
    return <a {...props}>{children}</a>;
  },
}));

vi.mock("@/components/ui/container", () => ({
  Container: ({ children }: { children: ReactNode }) => children,
}));

import { Header } from "./header";

async function renderedHeader() {
  return renderToStaticMarkup(await Header());
}

describe("public header is independent of authentication", () => {
  it.each([
    ["guest", { user: null, accessToken: null }],
    ["authenticated", { user: { id: "user_private" }, accessToken: "secret-token" }],
    ["expired", { user: { id: "user_private" }, accessToken: null }],
  ])("renders identical neutral navigation for %s without reading a session", async (_kind, session) => {
    mocks.withAuth.mockClear();
    mocks.withAuth.mockResolvedValue(session);
    const markup = await renderedHeader();
    expect(markup).toContain('href="/account">Account</a>');
    expect(markup).not.toContain("Sign in");
    expect(markup).not.toContain("user_private");
    expect(markup).not.toContain("secret-token");
    expect(markup).toBe(renderToStaticMarkup(Header()));
    expect(mocks.withAuth).not.toHaveBeenCalled();
    expect(mocks.link).toHaveBeenCalledWith(expect.objectContaining({ href: "/account", prefetch: false }));
    expect(markup).toContain('aria-label="Main navigation"');
    expect(markup).toContain('aria-label="sonder home"');
  });
  it("does not invoke authentication even when it would fail", async () => {
    mocks.withAuth.mockClear();
    mocks.withAuth.mockImplementation(() => { throw Error("must not read session"); });
    expect(await renderedHeader()).toContain('href="/account">Account</a>');
    expect(mocks.withAuth).not.toHaveBeenCalled();
  });
});


afterEach(() => vi.unstubAllEnvs());
it("labels the unavailable account in a marketing build", () => {
  vi.stubEnv("SONDER_SITE_MODE", "marketing-only");
  expect(renderToStaticMarkup(Header())).toContain("Account (not yet available)");
});
