/** Labels are presentation only; existing workspaces and permissions stay authoritative. */
export const workspaceGroups = [
  {
    label: "Übersicht",
    sections: [{ section: "Übersicht", label: "Übersicht" }],
  },
  {
    label: "Akquise",
    sections: [
      { section: "Mail-Studio", label: "Mails vorbereiten" },
      { section: "Kontakte", label: "Kontakte" },
      { section: "Kontakte finden", label: "Kontakte finden" },
      { section: "Versandhistorie", label: "Versandverlauf" },
    ],
  },
  {
    label: "Inhalte",
    sections: [
      { section: "Content-Studio", label: "Bilder, Videos & Texte" },
      { section: "Newsletter", label: "Newsletter" },
      { section: "Social Media", label: "Social Media" },
      { section: "Website", label: "Website" },
    ],
  },
  {
    label: "Projekte",
    sections: [
      { section: "Kampagnen", label: "Kampagnen" },
      { section: "Strategie & Konzepte", label: "Konzepte" },
      { section: "Kunden", label: "Kunden" },
    ],
  },
  {
    label: "Bibliothek",
    sections: [{ section: "Bibliothek", label: "Bibliothek" }],
  },
  { label: "Kalender", sections: [{ section: "Kalender", label: "Kalender" }] },
];
export function workspaceGroup(section: string) {
  const normalized = [
    "Kontakte/Akquise",
    "E-Mail-Entwürfe",
    "Freigaben",
  ].includes(section)
    ? "Mail-Studio"
    : section;
  return workspaceGroups.find((group) =>
    group.sections.some((item) => item.section === normalized),
  );
}
export function workspaceLabel(section: string) {
  return (
    workspaceGroup(section)?.sections.find((item) => item.section === section)
      ?.label || section
  );
}
