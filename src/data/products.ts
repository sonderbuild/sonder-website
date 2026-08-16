export type ProductMedia = {
  kind: "image" | "video" | "gif" | "demo";
  label: string;
  description?: string;
  src?: string;
  alt?: string;
};

export type ProductSection =
  | { type: "statement"; eyebrow?: string; statement: string; description?: string }
  | { type: "text"; eyebrow?: string; title?: string; items: Array<{ title: string; text: string }> }
  | { type: "media"; media: ProductMedia }
  | { type: "feature-highlight"; eyebrow?: string; title: string; description: string };

export type Product = {
  slug: "pulse" | "frame" | "crate";
  name: string;
  tagline: string;
  description: string;
  status: string;
  platform: string;
  category: "macOS App";
  sections: ProductSection[];
};

export const products: Product[] = [
  {
    slug: "pulse", name: "Pulse", tagline: "Understand your Mac.", description: "A quiet system monitoring and insights app designed to reveal what is happening beneath your workflow.", status: "In development", platform: "macOS", category: "macOS App",
    sections: [
      {
        type: "statement",
        eyebrow: "A considered utility",
        statement: "Understanding your Mac should not mean watching it all day.",
        description: "Pulse turns the activity beneath your workflow into useful context—not a stream of alerts. It stays clear, quiet, and ready when a closer look matters.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          label: "Pulse, in use",
          description: "Future screenshots, dashboard views, animations, and product films will live here.",
        },
      },
      {
        type: "feature-highlight",
        eyebrow: "Live system awareness",
        title: "See the state of your Mac as it changes.",
        description: "Pulse brings the signals worth noticing into one calm view, so CPU, memory, storage, and network activity can be understood without digging through utilities or interrupting the task at hand.",
      },
      {
        type: "feature-highlight",
        eyebrow: "Historical patterns",
        title: "Notice the shape of a day, not just a moment.",
        description: "A single reading rarely tells the whole story. Pulse makes room for patterns to emerge, helping you understand what is normal for your Mac and what has genuinely changed.",
      },
      {
        type: "feature-highlight",
        eyebrow: "Clear diagnostics",
        title: "Find the cause without the noise.",
        description: "When something feels off, Pulse is there to help make sense of it. The goal is not more data, but a clearer path from a question to an answer.",
      },
      {
        type: "feature-highlight",
        eyebrow: "Thoughtful presentation",
        title: "A technical tool with a quieter presence.",
        description: "Pulse is designed to be useful at a glance and unobtrusive the rest of the time. Its information is precise, but its presence is deliberately restrained.",
      },
      {
        type: "statement",
        eyebrow: "In direction",
        statement: "A clearer relationship with the machine you use every day.",
        description: "Pulse is being shaped as a companion for people who care about their tools: a more attentive way to understand a Mac without asking it to become the centre of attention.",
      },
    ],
  },
  {
    slug: "frame", name: "Frame", tagline: "Make room for the document.", description: "A focused workspace for moving through documents with greater clarity.", status: "In development", platform: "macOS", category: "macOS App",
    sections: [
      {
        type: "statement",
        eyebrow: "A calmer workspace",
        statement: "A calmer way to move through documents and focused work.",
        description: "Frame gives documents a more considered place to live, so the work around them feels easier to enter, follow, and return to.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          label: "Frame, in use",
          description: "Future document views, workspace screenshots, and workflow demonstrations will live here.",
        },
      },
      {
        type: "feature-highlight",
        eyebrow: "Documents without friction",
        title: "Let the document stay at the centre of the work.",
        description: "Documents accumulate complexity: versions, references, loose threads, and the effort of finding a way back in. Frame creates a calmer environment for focused work, clearing space for the thought in front of you.",
      },
      {
        type: "feature-highlight",
        eyebrow: "Structure that supports thought",
        title: "Keep the shape of unfinished work within reach.",
        description: "Organization should preserve continuity, not demand attention. Frame is designed to hold the relationships between documents and make it natural to return to a line of thinking before it has fully resolved.",
      },
      {
        type: "feature-highlight",
        eyebrow: "A workspace that stays quiet",
        title: "Make room for creative flow.",
        description: "A focused workspace does not need to be empty; it needs to know what to leave out. Frame reduces distraction around the work so attention can settle, move, and stay with the task for longer.",
      },
      {
        type: "statement",
        eyebrow: "In direction",
        statement: "Focused work deserves a clearer place to unfold.",
        description: "Frame is being shaped as a thoughtful structure around the document—present when it helps, quiet when the work needs room.",
      },
    ],
  },
  {
    slug: "crate", name: "Crate", tagline: "Know the music you keep.", description: "Metadata intelligence for a more useful, more personal music library.", status: "In development", platform: "macOS", category: "macOS App",
    sections: [
      {
        type: "statement",
        eyebrow: "A considered collection",
        statement: "A way to understand and care for a music collection.",
        description: "Crate brings the details around music into view, helping a library become easier to trust, explore, and keep close over time.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          label: "Crate, in use",
          description: "Future library views, metadata comparisons, artwork and discovery views, and workflow demonstrations will live here.",
        },
      },
      {
        type: "feature-highlight",
        eyebrow: "A library is more than files",
        title: "Keep the history and relationships in the music close at hand.",
        description: "A collection holds more than tracks. It carries listening history, small discoveries, and the connections that form between artists, releases, and moments. Crate treats those relationships as part of the library itself.",
      },
      {
        type: "feature-highlight",
        eyebrow: "Metadata as creative context",
        title: "Let the details open new paths through a collection.",
        description: "Metadata can do more than sort a library. When it is clear and complete, it becomes context for discovery—helping you organize what you have, notice what belongs together, and understand the collection from another angle.",
      },
      {
        type: "feature-highlight",
        eyebrow: "Tools for people who care about music",
        title: "Built for the many ways a collection is used.",
        description: "For DJs, producers, collectors, and listeners, a music library is an ongoing practice. Crate is being made for the patient work of knowing it well, whether that leads to a set, a session, or simply another listen.",
      },
      {
        type: "statement",
        eyebrow: "In direction",
        statement: "A more attentive relationship with the music you keep.",
        description: "Crate is being shaped to make library care feel meaningful: a tool for seeing more clearly what a collection contains, remembers, and might lead to next.",
      },
    ],
  },
];

export type CreativeTool = { name: string; description: string; format: string };

export const creativeTools: CreativeTool[] = [
  { name: "Max for Live devices", description: "Purposeful devices for performance, composition, and happy accidents.", format: "Ableton Live" },
  { name: "Experimental music tools", description: "Small software studies for sound, rhythm, and the spaces between.", format: "In progress" },
];

export function getProduct(slug: string) { return products.find((product) => product.slug === slug); }
