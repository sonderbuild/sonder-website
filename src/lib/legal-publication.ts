/** Drafts never enter a production page or public navigation. Legal approval is
 * deliberately independent from technical account/commerce implementation. */
export function legalDraftPreviewAvailable(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.NODE_ENV !== "production" && env.SONDER_LEGAL_PREVIEW === "local-draft";
}
