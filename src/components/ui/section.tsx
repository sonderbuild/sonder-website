import type { ComponentPropsWithoutRef } from "react";

type SectionProps = ComponentPropsWithoutRef<"section"> & { atmosphere?: "studio" | "apps" | "creative" | "neutral" };

export function Section({ atmosphere = "studio", className = "", ...props }: SectionProps) {
  return <section className={`section-atmosphere atmosphere-${atmosphere} ${className}`} {...props} />;
}
