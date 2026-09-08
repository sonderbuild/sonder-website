"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "email" | "code";

type ApiResult = {
  error?: "invalidEmail" | "invalidCode" | "invalidRequest" | "temporarilyUnavailable" | "tryAgainLater";
};

const errorMessages: Record<NonNullable<ApiResult["error"]>, string> = {
  invalidCode: "That code is not valid or has expired. Request a new one and try again.",
  invalidEmail: "Enter a valid email address.",
  invalidRequest: "Your sign-in session expired. Please refresh the page and try again.",
  temporarilyUnavailable: "Sign-in is temporarily unavailable. Please try again shortly.",
  tryAgainLater: "Please wait a moment before trying again.",
};

export function LoginForm() {
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState<string>();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState<string>();
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

  return <div className="border-y border-[color:var(--color-line)] py-10 sm:py-14">
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
    <p className="type-body mt-10 max-w-md text-sm leading-6">Passwords and social sign-in are not used. Passkey sign-in is not yet available in WorkOS’s custom authentication flow.</p>
  </div>;
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
