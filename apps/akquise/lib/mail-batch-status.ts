export const permanentPreparationIssues = [
  "Team-Postfach. Für den persönlichen Versand nicht freigabefähig.",
  "Allgemeine E-Mail-Adressen sind nicht freigabefähig.",
  "Kontakt ist gesperrt.",
  "Antwort erfasst. Keine weitere automatische Akquise.",
  "Gültige E-Mail-Adresse fehlt.",
  "Adresse auf Sperrliste.",
];
export function isPermanentPreparationBlock(issues: string[]) {
  return issues.some((issue) => permanentPreparationIssues.includes(issue));
}
export function summarizeDeferred(
  items: {
    organisation: string;
    name: string;
    issues: string[];
    changed: boolean;
  }[],
) {
  const counts = new Map<string, number>();
  const lines = items.map((item) => {
    const reasons = item.issues.length
      ? [...new Set(item.issues)]
      : [
          item.changed
            ? "Vorgeschlagene Ergänzungen müssen zuerst bestätigt werden."
            : "Prüfangaben fehlen.",
        ];
    for (const reason of reasons)
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    return `${item.organisation} · ${item.name}: ${reasons.join(" ")}`;
  });
  return {
    lines,
    counts: [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"),
    ),
  };
}
