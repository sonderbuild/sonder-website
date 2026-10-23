"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CustomerLicensingProduct } from "@/lib/customer-licensing";

export function ActivationManagement({ products }: { products: CustomerLicensingProduct[] }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const activeProducts = products.filter((product) => product.entitlement.status === "active" && product.license);

  if (activeProducts.length === 0) return <p className="type-body mt-5 text-base leading-7">No active products with activation slots are connected to this account.</p>;

  async function revoke(activationId: string, label: string) {
    if (!window.confirm(`Revoke activation for ${label}? This frees its activation slot without revoking your product entitlement. An offline device with a valid perpetual entitlement can keep using the app until its next successful online check. Time-limited offline access ends at its signed end date.`)) return;
    setError(undefined);
    setNotice(undefined);
    setRevoking(activationId);
    let requested = false;
    let confirmed = false;
    try {
      const csrf = await fetch("/api/auth/csrf", { cache: "no-store" });
      const token: unknown = await csrf.json().catch(() => null);
      if (!csrf.ok || typeof token !== "object" || token === null || typeof (token as Record<string, unknown>).token !== "string") throw new Error("csrf");
      requested = true;
      const response = await fetch(`/api/account/activations/${activationId}/revoke`, {
        cache: "no-store",
        headers: { "X-Sonder-Csrf": (token as Record<string, string>).token },
        method: "POST",
      });
      if ([401, 403, 404].includes(response.status)) {
        setError("We could not revoke this activation. Please try again shortly.");
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof body !== "object" || body === null || (body as Record<string, unknown>).revoked !== true) throw new Error("revoke");
      confirmed = true;
      setNotice("Activation revoked. Your product entitlement is unchanged.");
      router.refresh();
    } catch {
      setError(confirmed
        ? "Activation revoked, but we could not refresh your account. Refresh the page to update your activation list."
        : requested
          ? "We could not confirm whether this activation was revoked. Refresh your account to check its status before trying again."
          : "We could not start revoking this activation. Please try again shortly.");
    } finally {
      setRevoking(undefined);
    }
  }

  return <div className="mt-5 space-y-10">{notice && <p className="type-body text-base leading-7" role="status">{notice}</p>}{error && <p className="type-body text-base leading-7" role="alert">{error}</p>}{activeProducts.map((product, index) => {
    const license = product.license!;
    const remaining = license.remainingActivationSlots;
    return <section key={`${product.productId}-${index}`} aria-labelledby={`activations-${product.productId}-${index}`}><h3 id={`activations-${product.productId}-${index}`} className="type-body text-lg">{product.name}</h3><p className="type-body mt-2 text-base">Activations</p><p className="type-body mt-1 text-base">{license.activeActivationCount} of {license.activationLimit} used</p><p className="type-body mt-1 text-base">{remaining} {remaining === 1 ? "slot" : "slots"} available</p>{license.status !== "active" && <p className="type-body mt-1 text-sm">Activation unavailable</p>}{license.activations.length > 0 ? <ul className="mt-5 divide-y divide-black/10">{license.activations.map((activation) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={activation.activationId}><div><p className="type-body text-base">{activation.deviceLabel ?? "Unnamed device"}</p><p className="type-body mt-1 text-sm">Activated {formatDate(activation.activatedAt)}{activation.lastSeenAt ? ` · Last seen ${formatDate(activation.lastSeenAt)}` : ""}</p></div><button className="link" disabled={revoking === activation.activationId} onClick={() => revoke(activation.activationId, activation.deviceLabel ?? "this device")} type="button">{revoking === activation.activationId ? "Revoking…" : "Revoke"}</button></li>)}</ul> : <p className="type-body mt-5 text-base leading-7">No devices are using activation slots.</p>}</section>;
  })}</div>;
}

function formatDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
