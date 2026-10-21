// Safe, one-way mapping of the current Studiojeker Google master list.
// Research notes and mail drafts are kept as text, never as approvals.
const masterHeaders = [
  "Person", "Funktion", "Organisation", "Ort", "E-Mail",
  "Prüfstatus", "Prüfdatum", "Priorität", "Quellen-URL",
  "Newsletter-Einwilligung", "Akquise-Status", "Betreff",
  "E-Mail-Entwurf", "Herkunft", "Hinweise",
];

export function mapMasterSheet(values: string[][]) {
  const [headers, ...rows] = values;
  if (!headers || headers.length !== masterHeaders.length ||
      !masterHeaders.every((header, i) => headers[i]?.trim() === header)) {
    throw new Error("Masterliste: erwartet Kontakte!A:O mit 15 Spalten in der bekannten Reihenfolge.");
  }
  const mapped: Record<string, string>[] = [];
  for (const [i, raw] of rows.entries()) {
    const cells = masterHeaders.map((_, col) => (raw[col] ?? "").trim());
    if (!cells.some(Boolean)) continue;
    const person = cells[0].replace(/^(?:Dr\.|Prof\.)\s+/i, "").split(/\s+/);
    if (!cells[0] || !cells[2] || person.length < 2) {
      throw new Error(`Masterliste Zeile ${i + 2}: Person oder Organisation fehlt.`);
    }
    const notes = [
      `Originalname: ${cells[0]}`,
      ...[5, 6, 7, 9, 10, 11, 12, 13, 14]
        .filter((col) => cells[col])
        .map((col) => `${masterHeaders[col]}: ${cells[col]}`),
    ].join("\n");
    if (notes.length > 4000)
      throw new Error(`Masterliste Zeile ${i + 2}: Notizen zu lang.`);
    mapped.push({
      organisation: cells[2],
      region: cells[3],
      firstName: person[0],
      lastName: person.slice(1).join(" "),
      position: cells[1],
      email: cells[4],
      sourceUrl: cells[8],
      notes,
      // Conservative categorisation. Never grants legal approval.
      legalCategory: /^(?:Kanton Solothurn|Stadt |Bürgergemeinde )/i.test(cells[2])
        ? "PUBLIC_AUTHORITY" : "UNASSESSED",
    });
  }
  return mapped;
}
