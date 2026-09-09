"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { SocialProvider } from "@/lib/auth/social-auth";

type Step = "email" | "code";

type ApiResult = {
  error?: "invalidEmail" | "invalidCode" | "invalidRequest" | "providerUnavailable" | "temporarilyUnavailable" | "tryAgainLater";
  url?: string;
};

const errorMessages: Record<NonNullable<ApiResult["error"]>, string> = {
  invalidCode: "That code is not valid or has expired. Request a new one and try again.",
  invalidEmail: "Enter a valid email address.",
  invalidRequest: "Your sign-in session expired. Please refresh the page and try again.",
  providerUnavailable: "That sign-in method is not available.",
  temporarilyUnavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
  tryAgainLater: "Please wait a moment before trying again.",
};

export function LoginForm({ initialError, socialProviders }: { initialError?: "socialCancelled" | "socialFailed"; socialProviders: SocialProvider[] }) {
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState<string>();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState<string | undefined>(initialError === "socialCancelled" ? "Sign-in was cancelled. You can try again or use email." : initialError === "socialFailed" ? "We could not complete that sign-in. Please try again or use email." : undefined);
  const [notice, setNotice] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/csrf", { cache: "no-store" });
        const body = await response.json() as { token?: string };
        if (!response.ok || !body.token) throw new Error("Could not create CSRF token");
        if (active) setCsrfToken(body.token);
      } catch {
        if (active) setError("Your sign-in session could not be started. Refresh the page and try again.");
      }
    })();

    return () => { active = false; };
  }, []);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setNotice(undefined);
    if (!csrfToken) {
      setError("Your sign-in session is still starting. Please try again in a moment.");
      return;
    }

    setIsPending(true);
    try {
      const result = await post("/api/auth/magic/request", { email }, csrfToken);
      if (!result.ok) return setError(messageFor(result.body));
      setStep("code");
      setNotice("We sent a six-digit code. It expires in 10 minutes.");
    } catch {
      setError(errorMessages.temporarilyUnavailable);
    } finally {
      setIsPending(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setNotice(undefined);
    if (!csrfToken) {
      setError("Your sign-in session expired. Refresh the page and try again.");
      return;
    }

    setIsPending(true);
    try {
      const result = await post("/api/auth/magic/verify", { code, email }, csrfToken);
      if (!result.ok) return setError(messageFor(result.body));
      router.replace("/account");
    } catch {
      setError(errorMessages.temporarilyUnavailable);
    } finally {
      setIsPending(false);
    }
  }

  async function startSocial(provider: SocialProvider) {
    setError(undefined);
    setNotice(undefined);
    if (!csrfToken) {
      setError("Your sign-in session is still starting. Please try again in a moment.");
      return;
    }

    setIsPending(true);
    try {
      const result = await post(`/api/auth/social/${provider}/start`, {}, csrfToken);
      if (!result.ok || !result.body.url) {
        setError(messageFor(result.body));
        setIsPending(false);
        return;
      }
      window.location.assign(result.body.url);
    } catch {
      setError(errorMessages.temporarilyUnavailable);
      setIsPending(false);
    }
  }

  return <div className="border-y border-[color:var(--color-line)] py-10 sm:py-14">
    {step === "email" && socialProviders.length > 0 ? <div className="grid gap-3">
      {socialProviders.includes("google") ? <button className="flex w-full items-center justify-center gap-3 border border-black/20 bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-55" disabled={isPending || !csrfToken} onClick={() => void startSocial("google")} type="button"><GoogleMark />{isPending ? "Opening sign-in…" : "Continue with Google"}</button> : null}
      {socialProviders.includes("apple") ? <button className="flex w-full items-center justify-center gap-3 bg-black px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55" disabled={isPending || !csrfToken} onClick={() => void startSocial("apple")} type="button"><AppleMark />{isPending ? "Opening sign-in…" : "Sign in with Apple"}</button> : null}
      <div aria-hidden="true" className="my-4 flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-black/50 before:h-px before:flex-1 before:bg-black/15 after:h-px after:flex-1 after:bg-black/15">or</div>
    </div> : null}
    {step === "email" ? <form className="grid gap-6" onSubmit={submitEmail}>
      <label className="grid gap-2 text-sm font-medium" htmlFor="email">Email address
        <input autoComplete="email" className="border-b border-[color:var(--color-ink)] bg-transparent px-0 py-3 text-lg outline-none transition-colors placeholder:text-black/35 focus:border-black" disabled={isPending} id="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
      </label>
      <button className="w-fit bg-[color:var(--color-ink)] px-5 py-3 text-sm font-medium text-[color:var(--color-paper)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55" disabled={isPending || !csrfToken} type="submit">{isPending ? "Sending code…" : "Continue with email"}</button>
    </form> : <form className="grid gap-6" onSubmit={submitCode}>
      <div className="grid gap-1"><p className="text-sm font-medium">Enter your code</p><p className="type-body text-sm">Sent to {email}</p></div>
      <label className="grid gap-2 text-sm font-medium" htmlFor="code">Six-digit code
        <input autoComplete="one-time-code" className="border-b border-[color:var(--color-ink)] bg-transparent px-0 py-3 text-lg tracking-[0.25em] outline-none transition-colors placeholder:text-black/35 focus:border-black" disabled={isPending} id="code" inputMode="numeric" maxLength={6} name="code" onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} pattern="[0-9]{6}" placeholder="000000" required value={code} />
      </label>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3"><button className="w-fit bg-[color:var(--color-ink)] px-5 py-3 text-sm font-medium text-[color:var(--color-paper)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55" disabled={isPending || code.length !== 6} type="submit">{isPending ? "Signing in…" : "Sign in"}</button><button className="link text-sm" disabled={isPending} onClick={() => { setCode(""); setError(undefined); setNotice(undefined); setStep("email"); }} type="button">Request a new code</button><button className="link text-sm" disabled={isPending} onClick={() => { setCode(""); setError(undefined); setNotice(undefined); setStep("email"); }} type="button">Use a different email</button></div>
    </form>}
    {notice ? <p aria-live="polite" className="type-body mt-6 text-sm">{notice}</p> : null}
    {error ? <p aria-live="assertive" className="mt-6 text-sm text-red-800">{error}</p> : null}
    <p className="type-body mt-10 max-w-md text-sm leading-6">Passwords are not used. Sign-in methods shown here are configured for this environment. Passkey sign-in is not yet available in WorkOS’s custom authentication flow.</p>
  </div>;
}

function GoogleMark() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 18 18"><path d="M17.64 9.205c0-.638-.057-1.251-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.91-2.258c-.805.54-1.835.86-3.046.86-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 0 0 9 18Z" fill="#34A853"/><path d="M3.963 10.712A5.41 5.41 0 0 1 3.681 9c0-.594.102-1.172.282-1.712V4.956H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.044l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.578c1.322 0 2.508.454 3.44 1.345l2.58-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.956l3.007 2.332C4.672 5.162 6.656 3.578 9 3.578Z" fill="#EA4335"/></svg>;
}

function AppleMark() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 12.536c-.024-2.366 1.936-3.515 2.025-3.57-1.106-1.618-2.826-1.84-3.435-1.858-1.448-.152-2.853.866-3.59.866-.752 0-1.888-.85-3.111-.825-1.575.024-3.047.936-3.855 2.348-1.668 2.888-.424 7.132 1.174 9.466.8 1.143 1.733 2.419 2.954 2.374 1.195-.05 1.641-.763 3.084-.763 1.43 0 1.848.763 3.094.734 1.282-.02 2.09-1.148 2.862-2.301a9.42 9.42 0 0 0 1.31-2.667c-3.015-1.147-3.512-3.72-3.512-3.808ZM14.695 5.573c.643-.804 1.083-1.897.96-3.01-.93.04-2.094.644-2.764 1.43-.593.693-1.122 1.827-.984 2.898 1.047.079 2.121-.53 2.788-1.318Z"/></svg>;
}

async function post(path: string, body: object, csrfToken: string): Promise<{ ok: boolean; body: ApiResult }> {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "X-Sonder-Csrf": csrfToken },
    method: "POST",
  });
  return { ok: response.ok, body: await response.json() as ApiResult };
}

function messageFor(body: ApiResult): string {
  return body.error ? errorMessages[body.error] : errorMessages.temporarilyUnavailable;
}
