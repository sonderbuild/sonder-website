/** Exact server-owned origins; never infer trust from forwarded request headers. */
export function parseServerOrigin(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const origin = new URL(value);
    return Boolean(origin.hostname) && !origin.hostname.includes("*") && !origin.username && !origin.password && origin.pathname === "/" && !origin.search && !origin.hash
      && (origin.protocol === "https:" || process.env.NODE_ENV !== "production" && origin.protocol === "http:" && origin.hostname === "localhost") ? origin : undefined;
  } catch {
    return undefined;
  }
}
