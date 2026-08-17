import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "sonder — Independent software studio", template: "%s — sonder" },
  description: "Refined software for creative professionals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body className="flex min-h-svh flex-col"><Header /><main className="flex-1">{children}</main><Footer className="site-footer" /></body></html>;
}
