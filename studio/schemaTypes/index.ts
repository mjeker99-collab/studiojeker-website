import type { SchemaTypeDefinition } from "sanity";
import { about } from "./about";
import { client } from "./client";
import { contact } from "./contact";
import { globalSettings } from "./globalSettings";
import { homepage } from "./homepage";
import { project } from "./project";
import { service } from "./service";
import { teamMember } from "./teamMember";
import {
  ctaField,
  editorialColor,
  homepageBenefitItem,
  homepageServiceItem,
  localizedString,
  localizedText,
  mediaField,
} from "./shared";

/**
 * Studiojeker editorial schema registry.
 * Homepage and Contact are wired to Next.js for DE and EN.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  localizedString,
  localizedText,
  editorialColor,
  mediaField,
  ctaField,
  homepageBenefitItem,
  homepageServiceItem,
  homepage,
  about,
  contact,
  service,
  project,
  teamMember,
  client,
  globalSettings,
];
