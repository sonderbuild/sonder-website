// Website projection of sonder-system/PRODUCTS.md and contracts/customer-products.json.
// Changes require shared-contract reconciliation; CMS documents cannot add identities.
export const canonicalProductIds = ["monitor", "frame", "crate", "cue"] as const;

export type CanonicalProductId = (typeof canonicalProductIds)[number];
