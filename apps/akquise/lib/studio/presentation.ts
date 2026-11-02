/** Keep provider payloads and diagnostics out of the creative workspace. */
export function studioError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (
    /studio\.|Invalid input|expected |received undefined|ZodError/i.test(
      message,
    )
  )
    return "Der Beitrag konnte nicht übernommen werden. Dein Ergebnis bleibt gespeichert. Öffne den Beitrag erneut und versuche die Übernahme nochmals.";
  if (/SyntaxError|TypeError|Prisma|SQL|stack trace/i.test(message))
    return "Die Verarbeitung ist fehlgeschlagen. Dein gespeicherter Arbeitsstand bleibt erhalten. Bitte lade den Status neu.";
  return (
    message ||
    "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut."
  );
}

export function readableReply(value: string): string {
  const trimmed = value.trim();
  const unwrapped = trimmed
    .replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, "$1")
    .trim();
  if (/^[\[{]/.test(unwrapped)) {
    try {
      const parsed: unknown = JSON.parse(unwrapped);
      const extract = (item: unknown): string[] => {
        if (Array.isArray(item)) return item.flatMap(extract);
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        return [
          "reply",
          "headline",
          "text",
          "body",
          "cta",
          "hashtags",
          "imageIdea",
          "posts",
          "variants",
        ].flatMap((key) =>
          typeof record[key] === "string"
            ? [record[key] as string]
            : extract(record[key]),
        );
      };
      return (
        extract(parsed).join("\n\n") ||
        "Hier wurde keine lesbare Antwort geliefert. Bitte formuliere deinen Auftrag nochmals in einem kurzen Satz."
      );
    } catch {
      /* Ordinary prose starting with a bracket is still readable. */
    }
  }
  return trimmed.replace(
    /```[\s\S]*?```/g,
    "[Technische Ausgabe ausgeblendet. Bitte GPT um einen ausformulierten Vorschlag bitten.]",
  );
}
