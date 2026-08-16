export type Product = {
  slug: "pulse" | "frame" | "crate";
  name: string;
  description: string;
  status: string;
  platform: string;
};

export const products: Product[] = [
  { slug: "pulse", name: "Pulse", description: "System monitoring and insights for macOS.", status: "In development", platform: "macOS" },
  { slug: "frame", name: "Frame", description: "A calmer way to move through documents and focused work.", status: "In development", platform: "macOS" },
  { slug: "crate", name: "Crate", description: "Music metadata intelligence for a more orderly library.", status: "In development", platform: "macOS" },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
