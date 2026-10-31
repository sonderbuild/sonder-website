"use client";

import Link from "next/link";
import { Container } from "@/components/ui/container";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <Container className="py-20 sm:py-28"><h1 className="display text-5xl sm:text-7xl">This page could not load.</h1><p role="alert" className="type-body mt-8 text-lg">Please try again, or return to the home page.</p><div className="mt-10 flex gap-6"><button className="link" onClick={retry} type="button">Try again</button><Link className="link" href="/">Home</Link></div></Container>;
}
