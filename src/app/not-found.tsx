import Link from "next/link";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return <Container className="py-20 sm:py-28"><p className="eyebrow">404</p><h1 className="display mt-6 text-5xl sm:text-7xl">Page not found.</h1><p className="type-body mt-8 text-lg">The page may have moved or may not be available yet.</p><Link className="link mt-10 inline-block" href="/apps">Explore the apps</Link></Container>;
}
