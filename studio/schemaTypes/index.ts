import type { SchemaTypeDefinition } from "sanity";
import { about } from "./about";
import { client } from "./client";
import { globalSettings } from "./globalSettings";
import { homepage } from "./homepage";
import { project } from "./project";
import { service } from "./service";
import { teamMember } from "./teamMember";
import {
  ctaField,
  homepageBenefitItem,
  homepageServiceItem,
  localizedString,
  localizedText,
  mediaField,
} from "./shared";

/**
 * Studiojeker editorial schema registry.
 * Homepage is wired to Next.js at build time for DE and EN.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  localizedString,
  localizedText,
  mediaField,
  ctaField,
  homepageBenefitItem,
  homepageServiceItem,
  homepage,
  about,
  service,
  project,
  teamMember,
  client,
  globalSettings,
];
