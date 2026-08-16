import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Account",
  description: "Your sonder account, licenses, and downloads.",
};

export default function AccountPage() {
  return <Container className="py-20 sm:py-28"><div className="grid gap-10 lg:grid-cols-12"><p className="eyebrow lg:col-span-3">Account</p><div className="lg:col-span-8 lg:col-start-5"><h1 className="display text-6xl leading-[0.94] sm:text-8xl">A place for your software.</h1><p className="mt-8 max-w-xl text-lg leading-8 text-black/65 sm:text-xl">Account access, licenses, and downloads are on their way.</p></div></div></Container>;
}
