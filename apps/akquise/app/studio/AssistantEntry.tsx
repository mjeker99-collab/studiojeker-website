"use client";

import { useEffect, useId, useState } from "react";
import StudioChat from "./StudioChat";
import type { studioState } from "@/lib/studio/service";

type State = Awaited<ReturnType<typeof studioState>>;
const sections = {
  Kampagnen: {
    description:
      "Ideen entwickeln, Zielgruppen schärfen und deine nächste Kampagne planen.",
    message:
      "Ich möchte eine Kampagne planen. Bitte hilf mir Schritt für Schritt und frage zuerst nach meinem Vorhaben.",
  },
  "Social Media": {
    description:
      "Beiträge, Bildideen und einen Redaktionsplan mit GPT vorbereiten.",
    message:
      "Ich möchte Inhalte für Social Media vorbereiten. Bitte hilf mir Schritt für Schritt und frage zuerst nach meinem Vorhaben.",
  },
  Website: {
    description:
      "Website-Texte, Seitenideen und Verbesserungen mit GPT vorbereiten.",
    message:
      "Ich möchte Inhalte für meine Website vorbereiten. Bitte hilf mir Schritt für Schritt und frage zuerst nach meinem Vorhaben.",
  },
};

export default function AssistantEntry({
  section,
}: {
  section: keyof typeof sections;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const id = useId();
  const entry = sections[section];

  async function refresh() {
    const response = await fetch("/api/studio/state", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || "GPT-Arbeitsbereich konnte nicht geladen werden.",
      );
    setState(data);
  }

  useEffect(() => {
    if (!open || state) return;
    const controller = new AbortController();
    fetch("/api/studio/state", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "GPT-Arbeitsbereich konnte nicht geladen werden.",
          );
        if (!controller.signal.aborted) setState(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Laden fehlgeschlagen.",
          );
      });
    return () => controller.abort();
  }, [open, attempt, state]);

  return (
    <section
      className="panel assistant-entry"
      aria-label={`GPT für ${section}`}
    >
      <div className="assistant-entry-intro">
        <div>
          <p className="eyebrow">DEIN KI-ASSISTENT</p>
          <h2>Was möchtest du machen?</h2>
          <p>{entry.description}</p>
        </div>
        <button
          type="button"
          className="ai-button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setError("");
            setOpen((value) => !value);
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          >
            <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" />
            <path d="M20 2v4M18 4h4" />
          </svg>
          {open ? "GPT-Dialog einklappen" : "GPT beauftragen"}
        </button>
      </div>
      <div id={id} hidden={!open} className="assistant-entry-dialog">
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Erneut laden
            </button>
          </div>
        ) : !state ? (
          <p role="status">GPT-Arbeitsbereich wird geladen …</p>
        ) : (
          <>
            <p className="muted">
              Vorschläge bleiben im GPT-Projekt gespeichert.{" "}
              {section === "Website"
                ? "Freigegebene Texte kannst du anschliessend im Website-Editor übernehmen."
                : "Übernimm passende Vorschläge anschliessend in deine Planung."}
            </p>
            <StudioChat
              state={state}
              refresh={refresh}
              initialRequest={{ seriesId: "", message: entry.message }}
            />
          </>
        )}
      </div>
    </section>
  );
}
