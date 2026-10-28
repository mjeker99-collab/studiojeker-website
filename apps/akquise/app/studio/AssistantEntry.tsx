"use client";

import { useEffect, useId, useState } from "react";
import StudioChat from "./StudioChat";
import type { studioState } from "@/lib/studio/service";

type State = Awaited<ReturnType<typeof studioState>>;
const sections = {
  "Mail-Studio": {
    description: "Persönliche Mailtexte und Betreffzeilen mit GPT vorbereiten.",
    message:
      "Ich möchte persönliche Akquise-Mails vorbereiten. Frage zuerst nach Zielgruppe und Angebot. Erfinde keine Kontaktdaten oder Recherchebelege. Erstelle Textvorschläge; versende keine Mails.",
  },
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
  campaignRequest,
  initialTask,
  onProjectAssigned,
}: {
  section: keyof typeof sections;
  campaignRequest?: { id: string; request: number };
  initialTask?: { prompt: string; request: number };
  onProjectAssigned?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [campaignId, setCampaignId] = useState(campaignRequest?.id || "");
  const [query, setQuery] = useState("");
  const [chatKey, setChatKey] = useState(0);
  const [chatRequest, setChatRequest] = useState<{
    seriesId: string;
    message: string;
    campaignId: string;
    customerId: string;
  } | null>(null);
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
    if (state) return;
    const controller = new AbortController();
    fetch("/api/studio/state", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "GPT-Arbeitsbereich konnte nicht geladen werden.",
          );
        if (!controller.signal.aborted) {
          setState(data);
          if (campaignRequest)
            setProjectId(
              (data as State).series.find(
                (s) =>
                  (s.briefing as { campaignId?: string }).campaignId ===
                  campaignRequest.id,
              )?.id || "",
            );
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Laden fehlgeschlagen.",
          );
      });
    return () => controller.abort();
  }, [open, attempt, state, campaignRequest]);

  useEffect(() => {
    if (!initialTask) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setChatKey((key) => key + 1);
      setProjectId("");
      setCampaignId("");
      setChatRequest({
        seriesId: "",
        message: initialTask.prompt,
        campaignId: "",
        customerId: "",
      });
      setOpen(true);
    });
    return () => {
      active = false;
    };
  }, [initialTask]);
  useEffect(() => {
    if (!campaignRequest) return;
    document
      .getElementById(id)
      ?.closest("section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [campaignRequest, id]);
  const campaign = state?.campaigns.find((c) => c.id === campaignId);
  const projects =
    state?.series.filter((s) => {
      const assigned = (s.briefing as { campaignId?: string | null })
        .campaignId;
      return (
        (!campaignId || assigned === campaignId || !assigned) &&
        s.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      );
    }) || [];

  function openProject() {
    if (
      chatRequest &&
      !window.confirm(
        "Projekt wechseln? Ungesendete Eingaben werden verworfen. Gespeicherte Gespräche bleiben erhalten.",
      )
    )
      return;
    setChatKey((key) => key + 1);
    setChatRequest({
      seriesId: projectId,
      message: projectId
        ? ""
        : campaign
          ? `Ich möchte die Kampagne «${campaign.title}» weiterentwickeln. Ziel: ${campaign.goal}. Zielgruppe: ${campaign.audience}.`
          : entry.message,
      campaignId,
      customerId: campaign?.customerId || "",
    });
    setOpen(true);
    setError("");
  }

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
            if (!open && !chatRequest) openProject();
            else setOpen((value) => !value);
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
      {state && (
        <div className="assistant-project-picker">
          <label>
            Kampagne für GPT
            <select
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setProjectId(
                  state.series.find(
                    (s) =>
                      (s.briefing as { campaignId?: string }).campaignId ===
                      e.target.value,
                  )?.id || "",
                );
              }}
            >
              <option value="">Alle Kampagnen</option>
              {state.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gespeichertes Projekt suchen
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setProjectId("");
              }}
              placeholder="Zum Beispiel Visibility"
            />
          </label>
          <label>
            Gespeichertes GPT-Projekt
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">
                Neues Gespräch{campaign ? ` für ${campaign.title}` : ""}
              </option>
              {projects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {!(s.briefing as { campaignId?: string }).campaignId
                    ? " · Noch ohne Kampagne"
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={openProject}>
            {projectId
              ? "Projekt und GPT-Verlauf öffnen"
              : "Neues GPT-Projekt öffnen"}
          </button>
          <p className="muted">
            Auch Projekte ohne Kampagnenzuordnung sind auffindbar. Öffne sie und
            wähle «Projektname und Zuordnung ändern».
          </p>
        </div>
      )}
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
            {chatRequest && (
              <StudioChat
                key={chatKey}
                projectArea={section}
                state={state}
                refresh={refresh}
                onProjectAssigned={onProjectAssigned}
                initialRequest={chatRequest}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
