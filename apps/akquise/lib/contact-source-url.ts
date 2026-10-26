/** Accept ordinary website input without inventing a source or fetching it. */
export function normalizeSourceUrl(value: string): string {
  const text = value.trim();
  if (!text || /^https?:\/\//i.test(text)) return text;
  if (text.startsWith("//")) return `https:${text}`;
  if (/^[^\s/:@]+\.[^\s/:@]+(?::\d+)?(?:[/?#].*)?$/u.test(text))
    return `https://${text}`;
  return text;
}
export function sourceUrlIssue(value: string): string | null {
  const normalized = normalizeSourceUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (
      normalized.length <= 4000 &&
      !/\s/.test(normalized) &&
      ["http:", "https:"].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
    )
      return null;
  } catch {
    /* Report a field-level message below. */
  }
  return "Bitte eine gültige Website-Adresse eingeben, zum Beispiel firma.ch/team.";
}
