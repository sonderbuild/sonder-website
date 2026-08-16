export type Product = {
  slug: "pulse" | "frame" | "crate";
  name: string;
  tagline: string;
  description: string;
  status: string;
  platform: string;
  category: "macOS App";
  problem: string;
  philosophy: string;
  audience: string;
  direction: {
    statement: string;
    description: string;
  };
  media: {
    label: string;
    description: string;
  };
};

export const products: Product[] = [
  {
    slug: "pulse",
    name: "Pulse",
    tagline: "Understand your Mac.",
    description: "A quiet system monitor for people who want insight without distraction.",
    status: "In development",
    platform: "macOS",
    category: "macOS App",
    problem: "The health of a Mac is usually hidden behind dense diagnostics, scattered utilities, and notifications that ask for attention before they offer understanding.",
    philosophy: "Pulse is designed to make the essential state of a system legible at a glance. It keeps the signal close and lets the rest recede.",
    audience: "For people who care about their tools, from developers and designers to anyone who wants a clearer relationship with the machine they use every day.",
    direction: {
      statement: "A system monitor that knows when to be quiet.",
      description: "Pulse is being shaped around calm visibility: a considered utility that makes room for focus while keeping a Mac understandable.",
    },
    media: {
      label: "A look at Pulse",
      description: "Product screens and demonstrations are being prepared.",
    },
  },
  {
    slug: "frame",
    name: "Frame",
    tagline: "Make room for the document.",
    description: "A focused workspace for moving through documents with greater clarity.",
    status: "In development",
    platform: "macOS",
    category: "macOS App",
    problem: "Document-heavy work often asks people to manage windows, versions, and context before they can get back to the thought in front of them.",
    philosophy: "Frame treats organization as a support for concentration, not another layer of administration. Its workspace is intended to feel composed, direct, and out of the way.",
    audience: "For writers, researchers, producers, and teams whose work takes shape across a considered collection of documents.",
    direction: {
      statement: "A clearer place to return to the work in progress.",
      description: "Frame is being developed as a quieter rhythm for documents — helping the surrounding structure stay present without becoming the focus.",
    },
    media: {
      label: "A look at Frame",
      description: "Product screens and workflow studies are being prepared.",
    },
  },
  {
    slug: "crate",
    name: "Crate",
    tagline: "Know the music you keep.",
    description: "Metadata intelligence for a more useful, more personal music library.",
    status: "In development",
    platform: "macOS",
    category: "macOS App",
    problem: "A music library can hold years of listening, yet its details are often incomplete, inconsistent, or difficult to explore when a new creative thread begins.",
    philosophy: "Crate approaches metadata as creative material. It brings the information around music into focus so collections can be trusted, navigated, and used with more intention.",
    audience: "For DJs, selectors, producers, and devoted listeners who see a music library as an ongoing, living practice.",
    direction: {
      statement: "More context for the music already close at hand.",
      description: "Crate is being shaped to reveal the patterns within a collection and make the small acts of library care feel more rewarding.",
    },
    media: {
      label: "A look at Crate",
      description: "Product screens and library explorations are being prepared.",
    },
  },
];

export type CreativeTool = {
  name: string;
  description: string;
  format: string;
};

export const creativeTools: CreativeTool[] = [
  { name: "Max for Live devices", description: "Purposeful devices for performance, composition, and happy accidents.", format: "Ableton Live" },
  { name: "Experimental music tools", description: "Small software studies for sound, rhythm, and the spaces between.", format: "In progress" },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
