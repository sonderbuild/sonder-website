export const canonicalProductIds = ["monitor", "frame", "crate", "cue"] as const;

export type CanonicalProductId = (typeof canonicalProductIds)[number];
export type ProductMarketingFeatureSection =
  | { kind: "statement"; eyebrow?: string; statement: string; description?: string }
  | { kind: "feature"; eyebrow?: string; title: string; description: string };
export type ProductMarketingMedia = { url?: string; alt: string; label?: string; description?: string };
export type ProductMarketingContent = {
  productId: CanonicalProductId;
  title: string;
  tagline: string;
  hero: { description: string };
  featureSections: ProductMarketingFeatureSection[];
  media: ProductMarketingMedia[];
  faq: Array<{ question: string; answer: string }>;
  seo: { title?: string; description?: string; socialImageUrl?: string };
};

type RecordValue = Record<string, unknown>;

export function isCanonicalProductId(value: unknown): value is CanonicalProductId {
  return typeof value === "string" && canonicalProductIds.includes(value as CanonicalProductId);
}

export function normalizeProductMarketingContent(value: unknown): ProductMarketingContent | null {
  if (!isRecord(value) || !isCanonicalProductId(value.productId)) return null;
  const title = requiredString(value.title, 80);
  const tagline = requiredString(value.tagline, 180);
  const hero = normalizeHero(value.hero);
  const featureSections = normalizeFeatureSections(value.featureSections);
  const media = normalizeMedia(value.media);
  const faq = normalizeFaq(value.faq);
  const seo = normalizeSeo(value.seo);
  if (!title || !tagline || !hero || !featureSections || !media || !faq || !seo) return null;
  return { productId: value.productId, title, tagline, hero, featureSections, media, faq, seo };
}

function normalizeHero(value: unknown): { description: string } | null {
  if (!isRecord(value)) return null;
  const description = requiredString(value.description, 600);
  return description ? { description } : null;
}

function normalizeFeatureSections(value: unknown): ProductMarketingFeatureSection[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const sections = value.map((section) => {
    if (!isRecord(section)) return null;
    const eyebrow = optionalString(section.eyebrow, 80);
    if (eyebrow === null) return null;
    if (section._type === "marketingStatement") {
      const statement = requiredString(section.statement, 600);
      const description = optionalString(section.description, 1_200);
      return statement && description !== null ? { kind: "statement" as const, ...(eyebrow ? { eyebrow } : {}), statement, ...(description ? { description } : {}) } : null;
    }
    if (section._type === "marketingFeature") {
      const title = requiredString(section.title, 180);
      const description = requiredString(section.description, 1_200);
      return title && description ? { kind: "feature" as const, ...(eyebrow ? { eyebrow } : {}), title, description } : null;
    }
    return null;
  });
  return sections.every((section): section is ProductMarketingFeatureSection => section !== null) ? sections : null;
}

function normalizeMedia(value: unknown): ProductMarketingMedia[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const media = value.map((item) => {
    if (!isRecord(item)) return null;
    const url = requiredUrl(item.url);
    const alt = requiredString(item.alt, 300);
    const label = optionalString(item.label, 120);
    const description = optionalString(item.description, 600);
    return url && alt && label !== null && description !== null ? { url, alt, ...(label ? { label } : {}), ...(description ? { description } : {}) } : null;
  });
  if (media.some((item) => item === null)) return null;
  return media as ProductMarketingMedia[];
}

function normalizeFaq(value: unknown): Array<{ question: string; answer: string }> | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const faq = value.map((item) => {
    if (!isRecord(item)) return null;
    const question = requiredString(item.question, 240);
    const answer = requiredString(item.answer, 1_200);
    return question && answer ? { question, answer } : null;
  });
  return faq.every((item): item is { question: string; answer: string } => item !== null) ? faq : null;
}

function normalizeSeo(value: unknown): ProductMarketingContent["seo"] | null {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const title = optionalString(value.title, 80);
  const description = optionalString(value.description, 320);
  const socialImageUrl = value.socialImageUrl === undefined ? undefined : requiredUrl(value.socialImageUrl);
  return title !== null && description !== null && socialImageUrl !== null
    ? { ...(title ? { title } : {}), ...(description ? { description } : {}), ...(socialImageUrl ? { socialImageUrl } : {}) }
    : null;
}

function isRecord(value: unknown): value is RecordValue { return typeof value === "object" && value !== null && !Array.isArray(value); }
function requiredString(value: unknown, max: number): string | null { return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value : null; }
function optionalString(value: unknown, max: number): string | undefined | null { return value === undefined ? undefined : requiredString(value, max); }
function requiredUrl(value: unknown): string | null { try { return typeof value === "string" && new URL(value).protocol === "https:" ? value : null; } catch { return null; } }
