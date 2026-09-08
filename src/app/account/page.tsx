import type { Metadata } from "next";
import { signOut, withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Account",
  description: "Your sonder account, licenses, and downloads.",
};

export default async function AccountPage() {
  const { user, accessToken } = await withAuth();
  if (!user || !accessToken) {
    redirect("/login");
  }

  const session = await customerSession(accessToken);
  const message = session.kind === "linked"
    ? "Your identity is securely connected. Products, licenses, and activation controls will arrive in a later milestone."
    : session.kind === "unlinked"
      ? "This verified email is not yet connected to a purchase. No products or licenses have been changed."
      : "We could not confirm account access right now. Please try again shortly.";

  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Account</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">A place for your software.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8 sm:text-xl">{message}</p><p className="type-body mt-5 text-sm opacity-70">Signed in as {user.email}</p><form action={signOutAction} className="mt-10"><button className="link" type="submit">Sign out</button></form></div></div></Container>;
}

async function signOutAction() {
  "use server";
  await signOut({ returnTo: "/" });
}

async function customerSession(accessToken: string): Promise<{ kind: "linked" | "unlinked" | "unavailable" }> {
  const apiOrigin = process.env.SONDER_API_ORIGIN;
  if (!apiOrigin) {
    return { kind: "unavailable" };
  }

  let origin: URL;
  try {
    origin = new URL(apiOrigin);
  } catch {
    return { kind: "unavailable" };
  }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    return { kind: "unavailable" };
  }

  try {
    const response = await fetch(new URL("/v1/customer/session", origin), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok ? { kind: "linked" } : response.status === 403 ? { kind: "unlinked" } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
