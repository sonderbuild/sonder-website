import type { Metadata } from "next";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { ApprovalControls } from "@/components/activation/approval-controls";
import { Container } from "@/components/ui/container";
import { activationLoginPath, isActivationRequestId, previewActivationRequest, type ActivationApiError } from "@/lib/activation-approval";

export const metadata: Metadata = {
  title: "Approve activation",
  description: "Review a software activation request.",
};

export default async function ActivationApprovalPage({ params }: { params: Promise<{ activationRequestId: string }> }) {
  const { activationRequestId } = await params;
  if (!isActivationRequestId(activationRequestId)) return <TerminalPage title="Activation request unavailable" message="This activation request is unavailable or no longer valid." />;

  const { user, accessToken } = await withAuth();
  if (!user || !accessToken) redirect(activationLoginPath(activationRequestId));

  const result = await previewActivationRequest(accessToken, activationRequestId);
  if (result.kind === "error") {
    if (result.error === "unauthenticated") redirect(activationLoginPath(activationRequestId));
    return <TerminalPage {...terminalCopy(result.error)} />;
  }

  const { preview } = result;
  const requestedAt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.requestedAt * 1_000));
  const limit = preview.activeActivationCount + preview.remainingActivationSlots;
  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Activation</p><div className="lg:col-span-6 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">Activate {preview.name}?</h1><dl className="type-body mt-10 grid gap-6 border-y border-[color:var(--color-line)] py-8 text-base leading-7"><div><dt className="text-sm font-medium">Device</dt><dd className="mt-1">{preview.deviceLabel ?? "This device"}</dd></div><div><dt className="text-sm font-medium">Activations</dt><dd className="mt-1">{preview.activeActivationCount} of {limit} used</dd></div><div><dt className="text-sm font-medium">Requested</dt><dd className="mt-1">{requestedAt}</dd></div></dl><ApprovalControls activationRequestId={activationRequestId} productName={preview.name} /></div></div></Container>;
}

function TerminalPage({ title, message }: { title: string; message: string }) {
  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Activation</p><div className="lg:col-span-6 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">{title}</h1><p className="type-body mt-8 max-w-xl text-lg leading-8">{message}</p></div></div></Container>;
}

function terminalCopy(error: ActivationApiError): { title: string; message: string } {
  if (error === "accountUnlinked") return { title: "Account not connected", message: "This signed-in identity is not connected to a sonder customer account." };
  if (error === "accountDisabled") return { title: "Account unavailable", message: "This customer account is currently unavailable." };
  if (error === "emailNotVerified") return { title: "Email verification required", message: "A verified email is required before this activation can be reviewed." };
  if (error === "activationRequestUnavailable") return { title: "Activation request unavailable", message: "This activation request is unavailable or no longer valid." };
  if (error === "activationRequestFinalized") return { title: "Activation request finished", message: "This activation request has expired, was denied, or has already been completed." };
  if (error === "activationLimitReached") return { title: "No activation slots available", message: "There are no activation slots available for this product." };
  if (error === "entitlementUnavailable") return { title: "Activation unavailable", message: "This product is not currently available for activation." };
  return { title: "Activation unavailable", message: "We could not load this activation request. Please try again shortly." };
}
