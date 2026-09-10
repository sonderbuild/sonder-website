import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Container } from "@/components/ui/container";
import { configuredSocialProviders } from "@/lib/auth/social-auth";
import { activationReturnPath } from "@/lib/activation-approval";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your sonder account.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ authError?: string; returnTo?: string }> }) {
  const { authError, returnTo } = await searchParams;
  const initialError = authError === "socialCancelled" || authError === "socialFailed" ? authError : undefined;

  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Account</p><div className="lg:col-span-6 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">Welcome back.</h1><p className="type-body mt-8 max-w-lg text-lg leading-8">Sign in with the email connected to your software.</p><div className="mt-12"><LoginForm initialError={initialError} returnTo={activationReturnPath(returnTo)} socialProviders={configuredSocialProviders()} /></div></div></div></Container>;
}
