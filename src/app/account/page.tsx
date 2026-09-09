import type { Metadata } from "next";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";

import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: "Account",
  description: "Your sonder account.",
};

export default async function AccountPage() {
  const { user, accessToken } = await withAuth();
  if (!user || !accessToken) {
    redirect("/login");
  }

  const session = await customerSession(accessToken);
  if (session.kind === "unauthenticated") {
    redirect("/login");
  }
  const ownership = session.kind === "linked" ? await customerProducts(accessToken) : null;
  const accountState = ownership && isDeniedOwnership(ownership) ? { kind: ownership.kind } : session;
  if (accountState.kind === "unauthenticated") {
    redirect("/login");
  }

  const message = accountState.kind === "linked"
    ? "Your customer account is connected."
    : accountState.kind === "unlinked"
      ? "You’re signed in, but no sonder customer account is connected to this identity."
      : accountState.kind === "disabled"
        ? "This customer account is currently unavailable."
        : accountState.kind === "verificationRequired"
          ? "A verified email is required before we can show your account."
          : "We could not confirm account access right now. Please try again shortly.";

  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Account</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">Your sonder account.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8 sm:text-xl">{message}</p>{accountState.kind === "linked" && <ProductsSection ownership={ownership} />}<form action={signOutAction} className="mt-10"><button className="link" type="submit">Sign out</button></form></div></div></Container>;
}

type CustomerSession = { kind: "linked" | "unlinked" | "disabled" | "verificationRequired" | "unauthenticated" | "unavailable" };
type OwnedProduct = { productId: "pulse" | "frame" | "crate"; name: "Pulse" | "Frame" | "Crate"; entitlement: { status: "active" } };
type CustomerProducts = { kind: "ready"; products: OwnedProduct[] } | { kind: "ownershipUnavailable" } | { kind: "unlinked" | "disabled" | "verificationRequired" | "unauthenticated" };

function ProductsSection({ ownership }: { ownership: CustomerProducts | null }) {
  return <section aria-labelledby="products-heading" className="mt-14 border-t border-black/10 pt-8"><p className="eyebrow">Your products</p><h2 id="products-heading" className="sr-only">Your products</h2>{ownership?.kind === "ready" ? ownership.products.length > 0 ? <ul className="mt-5 divide-y divide-black/10">{ownership.products.map((product) => <li className="flex items-baseline justify-between gap-6 py-4" key={product.productId}><span className="type-body text-lg">{product.name}</span><span className="type-body text-sm">Active</span></li>)}</ul> : <p className="type-body mt-5 text-base leading-7">No active products are connected to this account.</p> : <p className="type-body mt-5 text-base leading-7">We could not load your products right now. Please try again shortly.</p>}</section>;
}

async function customerSession(accessToken: string): Promise<CustomerSession> {
  const origin = apiOrigin();
  if (!origin) {
    return { kind: "unavailable" };
  }

  try {
    const response = await fetch(new URL("/v1/customer/session", origin), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.status === 200 && isLinkedSession(body)) {
      return { kind: "linked" };
    }
    if (response.status === 401 && hasError(body, "unauthenticated")) {
      return { kind: "unauthenticated" };
    }
    if (response.status === 403 && hasError(body, "accountUnlinked")) {
      return { kind: "unlinked" };
    }
    if (response.status === 403 && hasError(body, "accountDisabled")) {
      return { kind: "disabled" };
    }
    if (response.status === 403 && hasError(body, "emailNotVerified")) {
      return { kind: "verificationRequired" };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

async function customerProducts(accessToken: string): Promise<CustomerProducts> {
  const origin = apiOrigin();
  if (!origin) return { kind: "ownershipUnavailable" };

  try {
    const response = await fetch(new URL("/v1/customer/products", origin), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.status === 200 && isOwnedProducts(body)) return { kind: "ready", products: body.products };
    if (response.status === 401 && hasError(body, "unauthenticated")) return { kind: "unauthenticated" };
    if (response.status === 403 && hasError(body, "accountUnlinked")) return { kind: "unlinked" };
    if (response.status === 403 && hasError(body, "accountDisabled")) return { kind: "disabled" };
    if (response.status === 403 && hasError(body, "emailNotVerified")) return { kind: "verificationRequired" };
    return { kind: "ownershipUnavailable" };
  } catch {
    return { kind: "ownershipUnavailable" };
  }
}

function apiOrigin(): URL | null {
  const value = process.env.SONDER_API_ORIGIN;
  if (!value) return null;
  try {
    const origin = new URL(value);
    return origin.protocol === "https:" || origin.hostname === "localhost" ? origin : null;
  } catch {
    return null;
  }
}

function isLinkedSession(value: unknown): value is { identityId: string; customerId: string } {
  return typeof value === "object" && value !== null
    && Object.keys(value).length === 2
    && typeof (value as Record<string, unknown>).identityId === "string"
    && typeof (value as Record<string, unknown>).customerId === "string";
}

function hasError(value: unknown, error: string): boolean {
  return typeof value === "object" && value !== null
    && Object.keys(value).length === 1
    && (value as Record<string, unknown>).error === error;
}

function isOwnedProducts(value: unknown): value is { products: OwnedProduct[] } {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 1) return false;
  const products = (value as Record<string, unknown>).products;
  return Array.isArray(products) && products.every(isOwnedProduct);
}

function isOwnedProduct(value: unknown): value is OwnedProduct {
  if (typeof value !== "object" || value === null || Object.keys(value).length !== 3) return false;
  const product = value as Record<string, unknown>;
  return (product.productId === "pulse" && product.name === "Pulse" || product.productId === "frame" && product.name === "Frame" || product.productId === "crate" && product.name === "Crate")
    && typeof product.entitlement === "object" && product.entitlement !== null
    && Object.keys(product.entitlement).length === 1
    && (product.entitlement as Record<string, unknown>).status === "active";
}

function isDeniedOwnership(value: CustomerProducts): value is Exclude<CustomerProducts, { kind: "ready" | "ownershipUnavailable" }> {
  return value.kind === "unlinked" || value.kind === "disabled" || value.kind === "verificationRequired" || value.kind === "unauthenticated";
}
