import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Draft from "@/content/legal-drafts/impressum";
import { legalDraftPreviewAvailable } from "@/lib/legal-publication";

export const metadata: Metadata = { title: "Impressum — Entwurf", robots: { index: false, follow: false } };

export default function LegalPage() {
  if (!legalDraftPreviewAvailable()) notFound();
  return <Draft />;
}
