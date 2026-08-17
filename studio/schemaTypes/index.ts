import type { SchemaTypeDefinition } from "sanity";
import { about } from "./about";
import { client } from "./client";
import { globalSettings } from "./globalSettings";
import { homepage } from "./homepage";
import { project } from "./project";
import { service } from "./service";
import { teamMember } from "./teamMember";

/**
 * Studiojeker editorial schema registry.
 * Homepage, About and the four service pages are wired to Next.js at build time.
 * Other types are editorial structure only until explicitly connected.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  homepage,
  about,
  service,
  project,
  teamMember,
  client,
  globalSettings,
];
