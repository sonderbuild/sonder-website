import { defineConfig } from "sanity";

import { schemaTypes } from "./sanity/schemaTypes";

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET;

if (!projectId || !dataset) {
  throw new Error("SANITY_PROJECT_ID and SANITY_DATASET are required to run Sanity Studio.");
}

export default defineConfig({
  name: "sonder-marketing",
  title: "sonder Marketing",
  projectId,
  dataset,
  schema: { types: schemaTypes },
});
