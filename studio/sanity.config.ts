import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";

/**
 * Studiojeker Sanity Studio (standalone).
 * Content models will be added incrementally — schema is intentionally minimal.
 */
export default defineConfig({
  name: "studiojeker",
  title: "Studiojeker",
  projectId: "tgx6e6jg",
  dataset: "production",
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
