"use server";

import { signOut, withAuth } from "@workos-inc/authkit-nextjs";

import { customerLicensing } from "@/lib/customer-licensing";

export async function signOutAction() {
  await signOut({ returnTo: "/" });
}

/** Read only; no caller-supplied identity, activation ID or mutation parameters. */
export async function refreshActivationStatus(): ReturnType<typeof customerLicensing> {
  try {
    const { user, accessToken } = await withAuth();
    if (!user || !accessToken) return { kind: "error", error: "unauthenticated" };
    return await customerLicensing(accessToken);
  } catch {
    return { kind: "error", error: "authenticationUnavailable" };
  }
}
