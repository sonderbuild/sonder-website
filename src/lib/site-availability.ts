/** Explicit deployment scope, independent from customer authentication.
 * Unset preserves existing consumers. Misspelled/configured modes fail closed.
 * Marketing builds must use the same mode at build and runtime. */
export function customerPlatformAvailable(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.SONDER_SITE_MODE === undefined || env.SONDER_SITE_MODE === "customer-platform";
}
