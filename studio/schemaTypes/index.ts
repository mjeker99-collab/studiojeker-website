import type { SchemaTypeDefinition } from "sanity";
import { abo } from "./abo";
import { about } from "./about";
import { client } from "./client";
import { contact } from "./contact";
import { globalSettings } from "./globalSettings";
import { homepage } from "./homepage";
import { project } from "./project";
import { service } from "./service";
import { teamMember } from "./teamMember";
import { work } from "./work";
import {
  ctaField,
  editorialColor,
  homepageBenefitItem,
  homepageServiceItem,
  localizedString,
  localizedText,
  mediaField,
  workCategory,
  workMediaField,
  workProjectItem,
} from "./shared";

/**
 * Studiojeker editorial schema registry.
 * Homepage, Contact and Content Abo are wired to Next.js for DE and EN.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  localizedString,
  localizedText,
  editorialColor,
  mediaField,
  workMediaField,
  workProjectItem,
  workCategory,
  ctaField,
  homepageBenefitItem,
  homepageServiceItem,
  homepage,
  about,
  abo,
  contact,
  work,
  service,
  project,
  teamMember,
  client,
  globalSettings,
];
