import type { SchemaTypeDefinition } from "sanity";
import { homepage } from "./homepage";

/**
 * Sanity schema registry.
 * Website content in lib/content/* is not migrated here yet.
 */
export const schemaTypes: SchemaTypeDefinition[] = [homepage];
