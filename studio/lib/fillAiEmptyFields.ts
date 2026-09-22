/**
 * Deep-fill empty KI/AI Sanity fields from approved defaults.
 * Shared by `scripts/fill-ai-page-defaults.ts` and Studio document action.
 * Never overwrites non-empty localized text, CTAs, or media assets.
 * Never invents visualMedia / landscapeBreaks uploads.
 */

export type UnknownRecord = Record<string, unknown>;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmptyLocalized(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const record = value as UnknownRecord;
  return !clean(record.de) && !clean(record.en);
}

function hasMediaContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const media = value as UnknownRecord;
  if (clean(media.vimeoUrl)) return true;
  const image = media.image as UnknownRecord | undefined;
  const poster = media.poster as UnknownRecord | undefined;
  const imageAsset = image?.asset as UnknownRecord | undefined;
  const posterAsset = poster?.asset as UnknownRecord | undefined;
  return Boolean(imageAsset?._ref || posterAsset?._ref);
}

function isEmptyCta(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const cta = value as UnknownRecord;
  return isEmptyLocalized(cta.label) && !clean(cta.href);
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-fill: copy from defaults only where existing is missing/blank.
 */
export function fillAiEmptyFields(
  existing: unknown,
  defaults: unknown,
  path = "",
): { value: unknown; filled: string[] } {
  const filled: string[] = [];

  if (defaults === undefined) {
    return { value: existing, filled };
  }

  // Localized string/text objects
  if (
    isPlainObject(defaults) &&
    ("de" in defaults || "en" in defaults) &&
    !("mediaType" in defaults) &&
    !("href" in defaults) &&
    !(
      "_type" in defaults &&
      (defaults as UnknownRecord)._type === "mediaField"
    )
  ) {
    const looksLocalized = Object.keys(defaults).every((key) =>
      ["de", "en", "_type"].includes(key),
    );
    if (looksLocalized) {
      if (isEmptyLocalized(existing)) {
        filled.push(path || "(root)");
        return { value: defaults, filled };
      }
      return { value: existing, filled };
    }
  }

  // mediaField
  if (
    isPlainObject(defaults) &&
    (defaults._type === "mediaField" || "mediaType" in defaults)
  ) {
    if (hasMediaContent(existing)) {
      return { value: existing, filled };
    }
    if (!hasMediaContent(defaults)) {
      return { value: existing ?? defaults, filled };
    }
    filled.push(path || "media");
    return { value: defaults, filled };
  }

  // CTA
  if (
    isPlainObject(defaults) &&
    "href" in defaults &&
    ("label" in defaults || defaults._type === "ctaField")
  ) {
    if (isEmptyCta(existing)) {
      filled.push(path || "cta");
      return { value: defaults, filled };
    }
    const existingCta = (existing as UnknownRecord) || {};
    const next: UnknownRecord = { ...defaults, ...existingCta };
    if (isEmptyLocalized(existingCta.label) && defaults.label) {
      next.label = defaults.label;
      filled.push(`${path}.label`);
    }
    if (!clean(existingCta.href) && defaults.href) {
      next.href = defaults.href;
      filled.push(`${path}.href`);
    }
    return { value: next, filled };
  }

  // Arrays (steps / applications)
  if (Array.isArray(defaults)) {
    if (!Array.isArray(existing) || existing.length === 0) {
      filled.push(path || "array");
      return { value: defaults, filled };
    }
    const next = existing.map((item, index) => {
      const def = defaults[index];
      if (!def) return item;
      const result = fillAiEmptyFields(item, def, `${path}[${index}]`);
      filled.push(...result.filled);
      return result.value;
    });
    return { value: next, filled };
  }

  // Nested objects / sections
  if (isPlainObject(defaults)) {
    if (!isPlainObject(existing)) {
      filled.push(path || "(section)");
      return { value: defaults, filled };
    }
    const next: UnknownRecord = { ...existing };
    for (const [key, defValue] of Object.entries(defaults)) {
      // Never invent visualMedia or landscapeBreaks uploads.
      if (path === "" && (key === "visualMedia" || key === "landscapeBreaks")) {
        continue;
      }
      const childPath = path ? `${path}.${key}` : key;
      const result = fillAiEmptyFields(existing[key], defValue, childPath);
      if (result.filled.length > 0) {
        next[key] = result.value;
        filled.push(...result.filled);
      }
    }
    return { value: next, filled };
  }

  if (existing === null || existing === undefined || existing === "") {
    filled.push(path || "(value)");
    return { value: defaults, filled };
  }
  return { value: existing, filled };
}
