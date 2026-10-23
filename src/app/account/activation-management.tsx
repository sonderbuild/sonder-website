"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { refreshActivationStatus } from "./actions";

import type { CustomerLicensingProduct, CustomerLicensingError } from "@/lib/customer-licensing";

type ReadScope = { sourceProducts: CustomerLicensingProduct[]; sourceError?: CustomerLicensingError };

export function ActivationManagement({ products, initialError }: { products: CustomerLicensingProduct[]; initialError?: CustomerLicensingError }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [, startRefresh] = useTransition();
  const [refreshed, setRefreshed] = useState<{ scope: ReadScope; result?: Awaited<ReturnType<typeof refreshActivationStatus>> }>();
  const [readFeedbackActive, setReadFeedbackActive] = useState(true);
  const refreshInFlight = useRef<ReadScope | null>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const currentRead = refreshed?.scope.sourceProducts === products && refreshed.scope.sourceError === initialError;
  const readResult = currentRead ? refreshed.result : undefined;
  const refreshing = currentRead && refreshed.result === undefined;
  const currentError = readResult?.kind === "error" ? readResult.error : readResult?.kind === "ready" ? undefined : initialError;
  const canRetry = initialError !== undefined && (currentError === "licensingUnavailable" || currentError === "authenticationUnavailable");
  const visibleProducts = currentError ? [] : readResult?.kind === "ready" ? readResult.products : products;
  const activeProducts = visibleProducts.filter((product) => product.entitlement.status === "active" && product.license);
  const deviceLabels = activeProducts.map(product => product.license!.activations.map(activation => activation.deviceLabel?.trim() || "Unnamed device"));
  const allDeviceLabels = deviceLabels.flat();
  const displayError = refreshing ? undefined : currentError
    ? !readResult && currentError === "licensingUnavailable"
      ? "We could not load your activation details right now. Please try again shortly."
      : refreshErrorMessage(currentError)
    : error;
  const displayNotice = refreshing ? "Refreshing activation status…" : currentError ? undefined
    : readFeedbackActive && readResult?.kind === "ready"
      ? needsRefresh
        ? "Activation status refreshed. The list below shows your current account state; it does not confirm the outcome of the earlier request."
        : "Activation details loaded."
      : notice;

  useEffect(() => () => { refreshInFlight.current = null; }, [products, initialError]);
  useEffect(() => {
    if (readFeedbackActive && !refreshing && readResult) feedback.current?.focus({ preventScroll: true });
  }, [readFeedbackActive, refreshing, readResult]);

  async function revoke(activationId: string, label: string) {
    if (refreshInFlight.current) return;
    if (!window.confirm(`Revoke activation for ${label}? This frees its activation slot without revoking your product entitlement. An offline device with a valid perpetual entitlement can keep using the app until its next successful online check. Time-limited offline access ends at its signed end date.`)) return;
    setError(undefined);
    setNotice(undefined);
    setNeedsRefresh(false);
    setReadFeedbackActive(false);
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
    const scope = { sourceProducts: products, sourceError: initialError };
    refreshInFlight.current = scope;
    setRefreshed({ scope });
    setReadFeedbackActive(true);
    setError(undefined);
    setNotice(undefined);
    startRefresh(async () => {
      try {
        const result = await refreshActivationStatus();
        if (refreshInFlight.current !== scope) return;
        setRefreshed({ scope, result });
      } catch {
        if (refreshInFlight.current !== scope) return;
        setRefreshed({ scope, result: { kind: "error", error: "licensingUnavailable" } });
      } finally {
        if (refreshInFlight.current === scope) refreshInFlight.current = null;
      }
    });
  }

  return <div className="mt-5 space-y-10">{displayNotice && <p className="type-body text-base leading-7" role="status" tabIndex={-1} ref={feedback}>{displayNotice}</p>}{displayError && <p className="type-body text-base leading-7" role="alert" tabIndex={-1} ref={feedback}>{displayError}</p>}{(needsRefresh || canRetry) && <div><button className="link" type="button" onClick={refreshStatus} disabled={refreshing || !!revoking} aria-busy={refreshing}>{needsRefresh ? "Refresh activation status" : "Try again"}</button></div>}{currentError === "unauthenticated" && <p className="type-body mt-3"><a className="link" href="/login">Sign in again</a></p>}{!refreshing && !currentError && activeProducts.length === 0 && <p className="type-body mt-5 text-base leading-7">No active products with activation slots are connected to this account.</p>}{!refreshing && activeProducts.map((product, index) => {
    const license = product.license!;
    const remaining = license.remainingActivationSlots;
    return <section key={`${product.productId}-${index}`} aria-labelledby={`activations-${product.productId}-${index}`}><h3 id={`activations-${product.productId}-${index}`} className="type-body text-lg">{product.name}</h3><p className="type-body mt-2 text-base">Activations</p><p className="type-body mt-1 text-base">{license.activeActivationCount} of {license.activationLimit} used</p><p className="type-body mt-1 text-base">{remaining} {remaining === 1 ? "slot" : "slots"} available</p>{license.status !== "active" && <p className="type-body mt-1 text-sm">Activation unavailable</p>}{license.activations.length > 0 ? <ul className="mt-5 divide-y divide-black/10">{license.activations.map((activation, activationIndex) => {
      const label = deviceLabels[index][activationIndex];
      const ambiguous = !activation.deviceLabel?.trim() || allDeviceLabels.filter(candidate => candidate.toLowerCase() === label.toLowerCase()).length > 1;
      const position = deviceLabels.slice(0, index).reduce((count, labels) => count + labels.length, 0) + activationIndex + 1;
      const accessibleDevice = ambiguous ? `${label} (activation ${position})` : label;
      return <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={activation.activationId}><div><p className="type-body text-base">{accessibleDevice}</p><p className="type-body mt-1 text-sm">Activated {formatDate(activation.activatedAt)}{activation.lastSeenAt ? ` · Last seen ${formatDate(activation.lastSeenAt)}` : ""}</p></div><button className="link" aria-label={`Revoke activation for ${accessibleDevice}`} aria-busy={revoking === activation.activationId} disabled={refreshing || revoking === activation.activationId} onClick={() => revoke(activation.activationId, activation.deviceLabel ?? "this device")} type="button">{revoking === activation.activationId ? "Revoking…" : "Revoke"}</button></li>; })}</ul> : <p className="type-body mt-5 text-base leading-7">No devices are using activation slots.</p>}</section>;
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
