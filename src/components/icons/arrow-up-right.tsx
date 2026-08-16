import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

export function ArrowUpRight({ title, ...props }: IconProps) {
  return <svg aria-hidden={title ? undefined : true} focusable="false" role={title ? "img" : undefined} viewBox="0 0 16 16" {...props}>{title ? <title>{title}</title> : null}<path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>;
}
