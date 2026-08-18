import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";
import { singletonTypes, structure } from "./structure";

/**
 * Studiojeker Sanity Studio (standalone).
 * Editors manage content only — design stays in Next.js.
 */
export default defineConfig({
  name: "studiojeker",
  title: "Studiojeker",
  projectId: "tgx6e6jg",
  dataset: "production",
  plugins: [
    structureTool({ structure }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    // Prevent creating extra Homepage / About / Global Settings / Service docs.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
});
