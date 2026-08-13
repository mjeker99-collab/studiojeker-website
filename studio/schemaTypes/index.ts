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
 * Content only — not wired to Next.js pages yet (except temporary /sanity-test).
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
