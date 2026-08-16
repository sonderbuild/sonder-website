import type { ComponentPropsWithoutRef } from "react";

type ContainerProps = ComponentPropsWithoutRef<"div">;

export function Container({ className = "", ...props }: ContainerProps) {
  return <div className={`mx-auto w-full max-w-7xl px-6 sm:px-10 ${className}`} {...props} />;
}
