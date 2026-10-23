"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { refreshActivationStatus } from "./actions";

import type { CustomerLicensingProduct, CustomerLicensingError } from "@/lib/customer-licensing";

export function ActivationManagement({ products }: { products: CustomerLicensingProduct[] }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [refreshed, setRefreshed] = useState<{ sourceProducts: CustomerLicensingProduct[]; result: Awaited<ReturnType<typeof refreshActivationStatus>> }>();
  const refreshInFlight = useRef(false);
  const readResult = refreshed?.sourceProducts === products ? refreshed.result : undefined;
  const visibleProducts = readResult?.kind === "error" ? [] : readResult?.kind === "ready" ? readResult.products : products;
  const activeProducts = visibleProducts.filter((product) => product.entitlement.status === "active" && product.license);

  async function revoke(activationId: string, label: string) {
    if (refreshInFlight.current) return;
    if (!window.confirm(`Revoke activation for ${label}? This frees its activation slot without revoking your product entitlement. An offline device with a valid perpetual entitlement can keep using the app until its next successful online check. Time-limited offline access ends at its signed end date.`)) return;
    setError(undefined);
    setNotice(undefined);
    setNeedsRefresh(false);
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
      setNeedsRefresh(requested && !confirmed);
      setError(confirmed
        ? "Activation revoked, but we could not refresh your account. Refresh the page to update your activation list."
        : requested
          ? "We could not confirm whether this activation was revoked. Refresh your account to check its status before trying again."
          : "We could not start revoking this activation. Please try again shortly.");
    } finally {
      setRevoking(undefined);
    }
  }

  function refreshStatus() {
    if (refreshInFlight.current || revoking) return;
    refreshInFlight.current = true;
    setError(undefined);
    setNotice("Refreshing activation status…");
    startRefresh(async () => {
      try {
        const result = await refreshActivationStatus();
        setRefreshed({ sourceProducts: products, result });
        if (result.kind === "ready") {
          setNotice("Activation status refreshed. The list below shows your current account state; it does not confirm the outcome of the earlier request.");
        } else {
          setNotice(undefined);
          setError(refreshErrorMessage(result.error));
        }
      } catch {
        // A lost read response provides no new account or activation evidence.
        setRefreshed({ sourceProducts: products, result: { kind: "error", error: "licensingUnavailable" } });
        setNotice(undefined);
        setError("We could not refresh activation status. Please try again.");
      } finally {
        refreshInFlight.current = false;
      }
    });
  }

  return <div className="mt-5 space-y-10">{notice && <p className="type-body text-base leading-7" role="status">{notice}</p>}{error && <p className="type-body text-base leading-7" role="alert">{error}</p>}{needsRefresh && <div><button className="link" type="button" onClick={refreshStatus} disabled={refreshing || !!revoking} aria-busy={refreshing}>Refresh activation status</button>{readResult?.kind === "error" && readResult.error === "unauthenticated" && <p className="type-body mt-3"><a className="link" href="/login">Sign in again</a></p>}</div>}{readResult?.kind !== "error" && activeProducts.length === 0 && <p className="type-body mt-5 text-base leading-7">No active products with activation slots are connected to this account.</p>}{!refreshing && activeProducts.map((product, index) => {
    const license = product.license!;
    const remaining = license.remainingActivationSlots;
    return <section key={`${product.productId}-${index}`} aria-labelledby={`activations-${product.productId}-${index}`}><h3 id={`activations-${product.productId}-${index}`} className="type-body text-lg">{product.name}</h3><p className="type-body mt-2 text-base">Activations</p><p className="type-body mt-1 text-base">{license.activeActivationCount} of {license.activationLimit} used</p><p className="type-body mt-1 text-base">{remaining} {remaining === 1 ? "slot" : "slots"} available</p>{license.status !== "active" && <p className="type-body mt-1 text-sm">Activation unavailable</p>}{license.activations.length > 0 ? <ul className="mt-5 divide-y divide-black/10">{license.activations.map((activation) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={activation.activationId}><div><p className="type-body text-base">{activation.deviceLabel ?? "Unnamed device"}</p><p className="type-body mt-1 text-sm">Activated {formatDate(activation.activatedAt)}{activation.lastSeenAt ? ` · Last seen ${formatDate(activation.lastSeenAt)}` : ""}</p></div><button className="link" disabled={refreshing || revoking === activation.activationId} onClick={() => revoke(activation.activationId, activation.deviceLabel ?? "this device")} type="button">{revoking === activation.activationId ? "Revoking…" : "Revoke"}</button></li>)}</ul> : <p className="type-body mt-5 text-base leading-7">No devices are using activation slots.</p>}</section>;
  })}</div>;
}

function formatDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function refreshErrorMessage(error: CustomerLicensingError): string {
  if (error === "unauthenticated") return "Your session has expired. Sign in again to check activation status.";
  if (error === "accountUnlinked") return "No sonder customer account is connected to this identity.";
  if (error === "accountDisabled") return "This customer account is currently unavailable.";
  if (error === "emailNotVerified") return "A verified email is required before we can show your activation status.";
  if (error === "authenticationUnavailable") return "We could not verify your session. Activation status has not been refreshed.";
  return "We could not refresh activation status. Please try again.";
}
