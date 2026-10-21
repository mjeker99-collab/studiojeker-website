"use client";
import { useState } from "react";
import type { studioState } from "@/lib/studio/service";
type State = Awaited<ReturnType<typeof studioState>>;

export default function StudioKnowledge({
  state,
  customerId,
  seriesId,
  useMemory,
  onMemoryChange,
  busy,
}: {
  state: State;
  customerId: string | null;
  seriesId: string;
  useMemory: boolean;
  onMemoryChange: (value: boolean) => void;
  busy: boolean;
}) {
  const user = state.assistantUser;
  const [text, setText] = useState(user?.studioContext || "");
  const [revision, setRevision] = useState(user?.studioContextRevision || 1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const projects = state.series
    .filter((s) => s.id !== seriesId && (s.customerId || null) === customerId)
    .slice(0, 5);
  const customer = state.customers.find((c) => c.id === customerId);
  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/studio/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, text }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Vorgaben konnten nicht gespeichert werden.",
        );
      setText(result.text);
      setRevision(result.revision);
      setNotice(
        "Deine Vorgaben sind gespeichert und gelten auch in neuen Gesprächen.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <details className="studio-knowledge">
      <summary>Was GPT über dich und die Firma weiss</summary>
      <p>
        <strong>{state.organization?.name || "Studiojeker"}</strong> ·{" "}
        {user?.name || "Dein persönlicher Zugang"}
      </p>
      <p>
        GPT verwendet das aktuelle Markenprofil mit Leistungen, Zielgruppen,
        Tonalität und Gestaltungsregeln. Diese Angaben pflegst du unter
        Bibliothek → Markenprofil.
      </p>
      {customer && (
        <p>
          Aktueller Auftrag für <strong>{customer.name}</strong>: Das
          gespeicherte Kundenwissen wird zusätzlich berücksichtigt.
        </p>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={useMemory}
          disabled={busy}
          onChange={(e) => onMemoryChange(e.target.checked)}
        />
        Frühere Projekte derselben Firma berücksichtigen
      </label>
      <p>
        Bis zu fünf frühere Projekte aus diesem gemeinsamen
        StudioONE-Arbeitsbereich werden als Textauszüge berücksichtigt. Projekte
        anderer Kunden und frühere Bilddateien werden dabei nicht übertragen.
        Die tatsächlich verwendeten Projekte stehen jeweils bei deiner
        Nachricht.
      </p>
      {useMemory &&
        (projects.length ? (
          <ul>
            {projects.map((project) => (
              <li key={project.id}>{project.title}</li>
            ))}
          </ul>
        ) : (
          <p>
            In der aktuellen Projektliste sind keine früheren Projekte dieser
            Firma enthalten.
          </p>
        ))}
      <label htmlFor="studio-user-context">
        Was soll GPT über deine Rolle und Arbeitsweise wissen?
      </label>
      <textarea
        id="studio-user-context"
        rows={3}
        maxLength={2000}
        value={text}
        disabled={busy || saving}
        onChange={(e) => {
          setText(e.target.value);
          setNotice("");
        }}
        placeholder="Zum Beispiel: Ich betreue das Marketing nebenbei. Bitte erkläre die nächsten Schritte einfach und kurz."
      />
      <p>
        Diese Vorgaben gehören zu deinem Benutzerkonto. Sie werden deinen
        GPT-Aufträgen beigefügt; Antworten im gemeinsamen Projekt können sich
        darauf beziehen.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={busy || saving || !user}
        onClick={() => void save()}
      >
        {saving ? "Wird gespeichert …" : "Meine Vorgaben speichern"}
      </button>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert">
          {error} Lade die Seite bei einem Versionskonflikt neu.
        </p>
      )}
    </details>
  );
}
