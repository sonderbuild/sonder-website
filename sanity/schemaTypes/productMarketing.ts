import { defineField, defineType } from "sanity";

const productIds = ["pulse", "frame", "crate", "cue"];

const requiredText = (title: string, max: number) => defineField({
  name: title.toLowerCase(),
  title,
  type: "string",
  validation: (rule) => rule.required().max(max),
});

export const productMarketing = defineType({
  name: "productMarketing",
  title: "Product marketing",
  type: "document",
  fields: [
    defineField({
      name: "productId",
      title: "Canonical product",
      type: "string",
      options: { list: productIds.map((value) => ({ title: value[0].toUpperCase() + value.slice(1), value })) },
      validation: (rule) => rule.required(),
    }),
    requiredText("Title", 80),
    requiredText("Tagline", 180),
    defineField({
      name: "hero",
      title: "Hero",
      type: "object",
      fields: [defineField({ name: "description", title: "Description", type: "text", rows: 3, validation: (rule) => rule.required().max(600) })],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featureSections",
      title: "Feature sections",
      type: "array",
      of: [
        defineType({ name: "marketingStatement", title: "Statement", type: "object", fields: [
          defineField({ name: "eyebrow", title: "Eyebrow", type: "string", validation: (rule) => rule.max(80) }),
          defineField({ name: "statement", title: "Statement", type: "text", rows: 3, validation: (rule) => rule.required().max(600) }),
          defineField({ name: "description", title: "Description", type: "text", rows: 3, validation: (rule) => rule.max(1_200) }),
        ] }),
        defineType({ name: "marketingFeature", title: "Feature", type: "object", fields: [
          defineField({ name: "eyebrow", title: "Eyebrow", type: "string", validation: (rule) => rule.max(80) }),
          defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.required().max(180) }),
          defineField({ name: "description", title: "Description", type: "text", rows: 3, validation: (rule) => rule.required().max(1_200) }),
        ] }),
      ],
    }),
    defineField({
      name: "media",
      title: "Media",
      type: "array",
      of: [defineType({ name: "marketingImage", title: "Image", type: "object", fields: [
        defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true }, validation: (rule) => rule.required() }),
        defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required().max(300) }),
        defineField({ name: "label", title: "Label", type: "string", validation: (rule) => rule.max(120) }),
        defineField({ name: "description", title: "Description", type: "text", rows: 3, validation: (rule) => rule.max(600) }),
      ] })],
    }),
    defineField({
      name: "faq",
      title: "FAQ",
      type: "array",
      of: [defineType({ name: "marketingFaq", title: "FAQ item", type: "object", fields: [
        defineField({ name: "question", title: "Question", type: "string", validation: (rule) => rule.required().max(240) }),
        defineField({ name: "answer", title: "Answer", type: "text", rows: 4, validation: (rule) => rule.required().max(1_200) }),
      ] })],
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "title", title: "Title", type: "string", validation: (rule) => rule.max(80) }),
        defineField({ name: "description", title: "Description", type: "text", rows: 3, validation: (rule) => rule.max(320) }),
        defineField({ name: "socialImage", title: "Social image", type: "image" }),
      ],
    }),
  ],
});
