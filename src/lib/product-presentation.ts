/** Current canonical presentation; no legacy name or authorization aliases. */
export const productPresentationHeader = {} as const;
export function isMactricPresentation(productId: unknown, name: unknown): boolean { return productId === "mactric" && name === "Mactric"; }
export function currentProductName<T extends string>(_productId: string, name: T): T { return name; }
