"use client";
import { useEffect, useState } from "react";
import type { dashboardState } from "@/lib/dashboard";

type Snapshot = Awaited<ReturnType<typeof dashboardState>>;
export type DashboardTarget = { section: string; projectId?: string };
const areas = [
  [
    "Content-Studio",
    "Content erstellen",
    "Mit GPT texten, Bilder gestalten und Produktionen vorbereiten.",
    "✦",
  ],
  [
    "Kampagnen",
    "Kampagnen",
    "Ziele, Inhalte und Massnahmen gemeinsam planen.",
    "◎",
  ],
  [
    "Social Media",
    "Social Media",
    "LinkedIn, Instagram und Facebook bearbeiten.",
    "↗",
  ],
  [
    "Newsletter",
    "Newsletter",
    "Vorlagen öffnen, Inhalte bearbeiten und Ausgaben vorbereiten.",
    "✉",
  ],
  [
    "Website",
    "Websites",
    "Eigene Websites bauen und studiojeker.ch verwalten.",
    "▤",
  ],
  [
    "Kontakte/Akquise",
    "Kontakte & Akquise",
    "Kontakte pflegen, persönliche Mails prüfen und versenden.",
    "＠",
  ],
];
const shortcuts = [
  ["Kunden", "Kunden"],
  ["Strategie & Konzepte", "Strategie & Konzepte"],
  ["Bibliothek", "Bibliothek"],
  ["Kalender", "Kalender"],
  ["Einstellungen", "Einstellungen"],
];
export default function Dashboard({
  name,
  contacts,
  drafts,
  approvals,
  sent,
  onOpen,
}: {
  name: string;
  contacts: number;
  drafts: number;
  approvals: number;
  sent: number;
  onOpen: (target: DashboardTarget) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Projekte konnten nicht geladen werden.");
        const result: Snapshot = await response.json();
        if (!Array.isArray(result.projects))
          throw new Error(
            "Projektübersicht ist vorübergehend nicht verfügbar.",
          );
        if (!controller.signal.aborted) setSnapshot(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [attempt]);
  const projects = snapshot?.projects.filter(
    (project) =>
      (!filter || project.section === filter) &&
      `${project.title} ${project.customer || ""}`
        .toLocaleLowerCase("de-CH")
        .includes(search.toLocaleLowerCase("de-CH")),
  );
  return (
    <div className="dashboard-home">
      <section
        className="dashboard-welcome"
        aria-labelledby="dashboard-welcome-title"
      >
        <div>
          <p className="eyebrow">DEIN MARKETING. EIN ORT.</p>
          <h2 id="dashboard-welcome-title">
            Hallo {name.split(" ")[0]}. Was steht heute an?
          </h2>
          <p>
            Starte in deinem Arbeitsbereich oder arbeite direkt an einem Projekt
            weiter.
          </p>
        </div>
        <button
          type="button"
          className="ai-button"
          onClick={() => onOpen({ section: "Content-Studio" })}
        >
          <span aria-hidden="true">✦</span> GPT beauftragen{" "}
          <span aria-hidden="true">→</span>
        </button>
      </section>
      <section aria-labelledby="dashboard-areas-title">
        <div className="dashboard-section-heading">
          <h2 id="dashboard-areas-title">Deine Arbeitsbereiche</h2>
          <span className="muted">Mit einem Klick loslegen</span>
        </div>
        <div className="dashboard-areas">
          {areas.map(([section, title, description, icon]) => (
            <button
              type="button"
              className="dashboard-area"
              key={section}
              onClick={() => onOpen({ section })}
              aria-label={`${title} öffnen`}
            >
              <span className="dashboard-area-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="dashboard-area-copy">
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
              <span className="dashboard-area-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
        <nav
          className="dashboard-shortcuts"
          aria-label="Weitere Arbeitsbereiche"
        >
          {shortcuts.map(([section, title]) => (
            <button
              type="button"
              className="secondary"
              key={section}
              onClick={() => onOpen({ section })}
            >
              {title} <span aria-hidden="true">→</span>
            </button>
          ))}
        </nav>
      </section>
      <section
        className="panel dashboard-projects"
        aria-labelledby="dashboard-projects-title"
      >
        <div className="dashboard-section-heading">
          <div>
            <h2 id="dashboard-projects-title">Projekte & Kampagnen</h2>
            <p className="muted">
              Deine jüngsten Projekte direkt weiterbearbeiten.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => onOpen({ section: "Content-Studio" })}
          >
            Neues Content-Projekt <span aria-hidden="true">＋</span>
          </button>
        </div>
        <div className="dashboard-project-filters">
          <label>
            Projekt suchen
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Projektname oder Kunde"
            />
          </label>
          <label>
            Bereich
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">Alle Bereiche</option>
              <option value="Content-Studio">Content-Projekte</option>
              <option value="Kampagnen">Kampagnen</option>
              <option value="Website">Websites</option>
            </select>
          </label>
        </div>
        {error ? (
          <div role="alert">
            <p>{error} Die Arbeitsbereiche kannst du weiterhin öffnen.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Projekte erneut laden
            </button>
          </div>
        ) : !projects ? (
          <p role="status">Projekte werden geladen …</p>
        ) : !projects.length ? (
          <p className="empty">
            {snapshot?.projects.length
              ? "Keine Projekte für diese Auswahl gefunden."
              : "Noch keine Projekte vorhanden. Starte im Content-Studio, unter Kampagnen oder Websites."}
          </p>
        ) : (
          <ul className="dashboard-project-list">
            {projects.map((project) => (
              <li key={`${project.section}-${project.id}`}>
                <div>
                  <span className="dashboard-project-kind">
                    {project.kind}
                    {project.customer ? ` · ${project.customer}` : ""}
                  </span>
                  <h3>{project.title}</h3>
                  <span className="muted">
                    {project.dateLabel}{" "}
                    <time dateTime={project.date}>
                      {new Date(project.date).toLocaleDateString("de-CH", {
                        timeZone: "Europe/Zurich",
                      })}
                    </time>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpen({ section: project.section, projectId: project.id })
                  }
                  aria-label={`${project.kind} ${project.title} öffnen`}
                >
                  Öffnen <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="dashboard-project-note muted">
          Je Bereich bis zu 12 Projekte. Weitere findest du im jeweiligen
          Arbeitsbereich.
        </p>
      </section>
      <section aria-labelledby="dashboard-today-title">
        <div className="dashboard-section-heading">
          <h2 id="dashboard-today-title">Akquise auf einen Blick</h2>
        </div>
        <div className="dashboard-status-grid">
          {(
            [
              ["Kontakte", contacts, "Kontakte"],
              ["Mail-Entwürfe", drafts, "E-Mail-Entwürfe"],
              ["Wartende Freigaben", approvals, "Freigaben"],
              ["Versandte E-Mails", sent, "Versandhistorie"],
            ] as const
          ).map(([label, count, section]) => (
            <button
              type="button"
              className="dashboard-status"
              key={label}
              onClick={() => onOpen({ section })}
            >
              <span>{label}</span>
              <strong>{count}</strong>
              <span className="dashboard-status-link">
                Öffnen <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
