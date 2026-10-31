"use client";

import { useEffect, useState } from "react";

type DecisionState = "idle" | "approving" | "denying" | "approved" | "denied";

type ApiResult = { state?: "approved" | "denied"; error?: "activationRequestFinalized" | "activationLimitReached" | "entitlementUnavailable" | "licensingUnavailable" | "unauthenticated" };

export function ApprovalControls({ activationRequestId, productName }: { activationRequestId: string; productName: string }) {
  const [csrfToken, setCsrfToken] = useState<string>();
  const [state, setState] = useState<DecisionState>("idle");
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/csrf", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json() as { token?: string } }))
      .then((result) => {
        if (!result.ok || !result.body.token) throw new Error("csrf");
        if (active) setCsrfToken(result.body.token);
      })
      .catch(() => { if (active) setMessage("This approval session could not be started. Refresh the page and try again."); });
    return () => { active = false; };
  }, []);

  async function decide(action: "approve" | "deny") {
    if (!csrfToken || state !== "idle") return;
    setState(action === "approve" ? "approving" : "denying");
    setMessage(undefined);
    try {
      const response = await fetch(`/api/account/activation-requests/${activationRequestId}/${action}`, {
        body: "{}",
        headers: { "Content-Type": "application/json", "X-Sonder-Csrf": csrfToken },
        method: "POST",
      });
      const body = await response.json() as ApiResult;
      if (response.ok && (body.state === "approved" || body.state === "denied")) {
        setState(body.state);
        return;
      }
      setState("idle");
      setMessage(messageFor(body.error));
    } catch {
      setState("idle");
      setMessage("We could not complete this request. Please try again shortly.");
    }
  }

  if (state === "approved") return <p aria-live="polite" className="type-body mt-10 text-lg leading-8">{productName} approved for this device. Return to the app to finish activation.</p>;
  if (state === "denied") return <p aria-live="polite" className="type-body mt-10 text-lg leading-8">Activation request denied. Return to the app to request activation again if needed.</p>;

  const pending = state === "approving" || state === "denying";
  return <div className="mt-10"><div className="flex flex-wrap gap-4"><button className="border border-black/20 px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-55" disabled={pending || !csrfToken} onClick={() => void decide("deny")} type="button">{state === "denying" ? "Cancelling…" : "Cancel"}</button><button className="bg-[color:var(--color-ink)] px-5 py-3 text-sm font-medium text-[color:var(--color-paper)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55" disabled={pending || !csrfToken} onClick={() => void decide("approve")} type="button">{state === "approving" ? "Approving…" : `Activate ${productName}`}</button></div>{message ? <p aria-live="assertive" className="mt-5 text-sm text-red-800">{message}</p> : null}</div>;
}

function messageFor(error: ApiResult["error"]): string {
  if (error === "activationLimitReached") return "There are no activation slots available for this product.";
  if (error === "entitlementUnavailable") return "This product is not currently available for activation.";
  if (error === "activationRequestFinalized") return "This activation request is no longer available.";
  if (error === "unauthenticated") return "Your sign-in session expired. Sign in again and retry.";
  return "We could not complete this request. Please try again shortly.";
}
