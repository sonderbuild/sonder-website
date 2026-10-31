import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Account availability", robots: { index: false, follow: false } };

export default function AvailabilityPage() {
  return <Container className="py-20 sm:py-28"><p className="eyebrow">Account</p><h1 className="display mt-6 text-5xl sm:text-7xl">Accounts are not available yet.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8">Sign-in, purchases and software activation are not available on this website yet. You can explore the apps while they are in development.</p><div className="mt-10 flex flex-wrap gap-6"><Link className="link" href="/apps">Explore the apps</Link><a className="link" href={`mailto:${site.email}`}>Contact sonder</a></div></Container>;
}
