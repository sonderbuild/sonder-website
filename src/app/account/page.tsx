import type { Metadata } from "next";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";
import { customerLicensing, type CustomerLicensingProduct } from "@/lib/customer-licensing";

import { signOutAction } from "./actions";
import { ActivationManagement } from "./activation-management";

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
  const licensing = session.kind === "linked" ? await customerLicensing(accessToken) : null;
  const accountState = licensing ? licensingAccountState(licensing) ?? session : session;
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

  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Account</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">Your sonder account.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8 sm:text-xl">{message}</p>{accountState.kind === "linked" && <ProductsSection licensing={licensing} />}<form action={signOutAction} className="mt-10"><button className="link" type="submit">Sign out</button></form></div></div></Container>;
}

type CustomerSession = { kind: "linked" | "unlinked" | "disabled" | "verificationRequired" | "unauthenticated" | "unavailable" };

function ProductsSection({ licensing }: { licensing: { kind: "ready"; products: CustomerLicensingProduct[] } | { kind: "error"; error: string } | null }) {
  return <section aria-labelledby="products-heading" className="mt-14 border-t border-black/10 pt-8"><p className="eyebrow">Your products</p><h2 id="products-heading" className="sr-only">Your products</h2>{licensing?.kind === "ready" ? <ActivationManagement products={licensing.products} /> : <p className="type-body mt-5 text-base leading-7">We could not load your activation details right now. Please try again shortly.</p>}</section>;
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

function licensingAccountState(value: { kind: "ready"; products: CustomerLicensingProduct[] } | { kind: "error"; error: string }): CustomerSession | undefined {
  if (value.kind === "ready") return undefined;
  if (value.error === "unauthenticated") return { kind: "unauthenticated" };
  if (value.error === "accountUnlinked") return { kind: "unlinked" };
  if (value.error === "accountDisabled") return { kind: "disabled" };
  if (value.error === "emailNotVerified") return { kind: "verificationRequired" };
  return undefined;
}
