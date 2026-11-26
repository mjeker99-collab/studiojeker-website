"use client";
import { useEffect, useState } from "react";
import "./studioone-dashboard.css";
import type { dashboardState } from "@/lib/dashboard";

type Snapshot = Awaited<ReturnType<typeof dashboardState>>;
export type DashboardTarget = { section: string; projectId?: string };
export default function Dashboard({
  drafts,
  approvals,
  onOpen,
  onStartTask,
}: {
  name: string;
  contacts: number;
  drafts: number;
  approvals: number;
  sent: number;
  onOpen: (target: DashboardTarget) => void;
  onStartTask: (task: string, section: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [task, setTask] = useState("");
  const quickTasks = [
    {
      label: "Neue Kunden gewinnen",
      prompt: "Ich möchte neue Kunden gewinnen.",
    },
    {
      label: "Angebot bekannt machen",
      prompt: "Ich möchte unser Angebot bekannt machen.",
    },
    {
      label: "Social Media erstellen",
      prompt: "Ich möchte einen Social Media Post erstellen.",
    },
    {
      label: "Newsletter erstellen",
      prompt: "Ich möchte einen Newsletter erstellen.",
    },
    {
      label: "Website aktualisieren",
      prompt: "Ich möchte unsere Website aktualisieren.",
    },
    {
      label: "Bilder & Videos erstellen",
      prompt: "Ich möchte ein neues Bild erstellen.",
    },
  ];
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
      <div className="simple-welcome">
        <h1>Was möchtest du heute erledigen?</h1>
        <p>
          Eine Aufgabe beginnen oder an einem bestehenden Projekt
          weiterarbeiten.
        </p>
      </div>
      {snapshot?.projects[0] && (
        <section className="simple-resume" aria-labelledby="resume-title">
          <div>
            <p>Zuletzt bearbeitet oder erstellt</p>
            <h2 id="resume-title">{snapshot.projects[0].title}</h2>
            <p>
              {snapshot.projects[0].kind}
              {snapshot.projects[0].customer
                ? ` · ${snapshot.projects[0].customer}`
                : ""}
            </p>
          </div>
          <button
            onClick={() =>
              onOpen({
                section: snapshot.projects[0].section,
                projectId: snapshot.projects[0].id,
              })
            }
          >
            Projekt weiterbearbeiten
          </button>
        </section>
      )}
      <section
        className="panel studio-task-start"
        aria-labelledby="studio-task-start-title"
      >
        <h2 id="studio-task-start-title">
          {snapshot?.projects.length
            ? "Oder eine neue Aufgabe beginnen"
            : "Eine Aufgabe beginnen"}
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (task.trim()) onStartTask(task.trim(), "auto");
          }}
        >
          <label htmlFor="studio-task-input">Deine Aufgabe</label>
          <textarea
            id="studio-task-input"
            rows={3}
            maxLength={2000}
            placeholder="Zum Beispiel: Ich möchte unser neues Angebot bekannt machen."
            value={task}
            onChange={(event) => setTask(event.target.value)}
          />
          <button
            type="submit"
            className={snapshot?.projects.length ? "secondary" : undefined}
            disabled={!task.trim()}
          >
            Aufgabe beginnen
          </button>
        </form>
        <p className="muted">Oder wähle eine häufige Aufgabe:</p>
        <div className="studio-quick-tasks">
          {quickTasks.map((item) => (
            <button
              type="button"
              className="secondary"
              key={item.label}
              onClick={() => {
                setTask(item.prompt);
                onStartTask(item.prompt, "auto");
              }}
            >
              {item.label} <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        <p className="muted">
          Du prüfst das Ergebnis, bevor etwas versandt oder veröffentlicht wird.
        </p>
      </section>
      {error && (
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
      )}
      <details
        className="panel dashboard-projects"
        aria-labelledby="dashboard-projects-title"
      >
        <summary id="dashboard-projects-title">Weitere Projekte finden</summary>
        <div className="dashboard-section-heading">
          <div>
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
        {!projects ? (
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
                  className="secondary"
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
      </details>
      {(drafts > 0 || approvals > 0) && (
        <section aria-labelledby="dashboard-today-title">
          <h2 id="dashboard-today-title">Offene Aufgaben</h2>
          <div className="simple-open-tasks">
            {drafts > 0 && (
              <button
                className="secondary"
                onClick={() => onOpen({ section: "E-Mail-Entwürfe" })}
              >
                {drafts} Mail-Entwürfe weiterbearbeiten →
              </button>
            )}
            {approvals > 0 && (
              <button
                className="secondary"
                onClick={() => onOpen({ section: "Freigaben" })}
              >
                {approvals} Mails prüfen →
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
