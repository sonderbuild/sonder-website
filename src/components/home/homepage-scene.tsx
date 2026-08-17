import type { ComponentPropsWithoutRef } from "react";

import { Section } from "@/components/ui/section";

type HomepageSceneProps = ComponentPropsWithoutRef<"section"> & {
  align?: "start" | "center" | "end";
  atmosphere?: "studio" | "apps" | "creative" | "neutral";
};

export function HomepageScene({ align = "center", atmosphere, className = "", ...props }: HomepageSceneProps) {
  return <Section atmosphere={atmosphere} className={`homepage-scene homepage-scene--${align} ${className}`} {...props} />;
}
