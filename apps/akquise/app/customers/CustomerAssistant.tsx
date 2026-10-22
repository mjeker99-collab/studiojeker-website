"use client";
import { useRef, useState } from "react";
import {
  knowledgeFields,
  type CustomerKnowledge,
} from "@/lib/customer-knowledge";
import {
  fillEmptyKnowledge,
  type AssistantResult,
} from "@/lib/customer-assistant/input";
type Props = {
  name: string;
  website: string;
  knowledge: CustomerKnowledge;
  disabled: boolean;
  onChange: (knowledge: CustomerKnowledge) => void;
  onBusy: (busy: boolean) => void;
};
export default function CustomerAssistant({
  name,
  website,
  knowledge,
  disabled,
  onChange,
  onBusy,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<{
    value: AssistantResult;
    identity: string;
  } | null>(null);
  const lock = useRef(false);
  const identity = JSON.stringify([name, website]);
  const visible = result?.identity === identity ? result.value : null;
  async function generate(mode: "RESEARCH" | "WRITE") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    setNotice("");
    setResult(null);
    try {
      const response = await fetch("/api/customers/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: crypto.randomUUID(),
          name,
          website,
          knowledge,
          mode,
        }),
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.error || "Recherche fehlgeschlagen.");
      setResult({ value, identity });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Verbindung unterbrochen. Ergebnis/Kosten unklar; keine automatische Wiederholung.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="panel padded"
      aria-label="GPT-Unterstützung"
      aria-busy={busy}
    >
      <h3>Unternehmensprofil mit GPT vorbereiten</h3>
      <p>
        Firma und Website eintragen. GPT recherchiert öffentliche Quellen und
        erstellt Vorschläge für die Felder darunter. Du prüfst und übernimmst
        die Texte.
      </p>
      <p className="muted">
        Beim Start werden Firmenname, Website und die Wissensfelder an OpenAI
        übermittelt. Kontaktangaben und interne Notizen bleiben hier. Es gelten
        die eingerichteten KI-Tageslimits; Recherche verursacht zusätzliche
        Suchkosten.
      </p>
      <div className="actions">
        <button
          type="button"
          disabled={disabled || busy || !name.trim() || !website.trim()}
          onClick={() => generate("RESEARCH")}
        >
          Mit GPT recherchieren &amp; ausfüllen
        </button>
        <button
          type="button"
          className="secondary"
          disabled={
            disabled ||
            busy ||
            !name.trim() ||
            !Object.values(knowledge).some((v) => v.trim())
          }
          onClick={() => generate("WRITE")}
        >
          Vorhandene Angaben ausformulieren
        </button>
      </div>
      {!website.trim() && (
        <p>Für die Recherche oben die Firmenwebsite ergänzen.</p>
      )}
      {busy && (
        <p role="status">
          GPT erstellt Textvorschläge. Das kann bis zu zwei Minuten dauern …
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {visible && (
        <div>
          <h4>Vorschläge prüfen</h4>
          <p>
            {visible.mode === "RESEARCH"
              ? "Webrecherche"
              : "Aus vorhandenen Angaben formuliert – ohne Webrecherche"}{" "}
            · {new Date(visible.researchedAt).toLocaleDateString("de-CH")}. Noch
            nicht gespeichert.
          </p>
          <button
            type="button"
            className="secondary"
            disabled={disabled || busy}
            onClick={() => {
              onChange(fillEmptyKnowledge(knowledge, visible.knowledge));
              setNotice(
                "Vorschläge in leere Felder übernommen. Bitte prüfen und das Kundenprofil speichern.",
              );
            }}
          >
            Alle leeren Felder ergänzen
          </button>
          {knowledgeFields.map(
            ([key, label]) =>
              visible.knowledge[key] && (
                <div
                  key={key}
                  style={{ marginTop: "1rem", overflowWrap: "anywhere" }}
                >
                  <h4>{label}</h4>
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {visible.knowledge[key]}
                  </p>
                  {visible.citations
                    .filter((c) => c.field === key)
                    .map((c, i) => (
                      <p key={`${c.url}-${i}`}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Quelle:{" "}
                          {visible.sources.find((s) => s.url === c.url)
                            ?.title || c.url}{" "}
                          ↗
                        </a>
                      </p>
                    ))}
                  <button
                    type="button"
                    className="secondary"
                    disabled={disabled || busy}
                    onClick={() => {
                      onChange({ ...knowledge, [key]: visible.knowledge[key] });
                      setNotice(
                        `${label}: Vorschlag übernommen. Noch nicht gespeichert.`,
                      );
                    }}
                  >
                    {knowledge[key].trim()
                      ? `${label}: Text ersetzen`
                      : `${label}: Übernehmen`}
                  </button>
                </div>
              ),
          )}
          {!!visible.questions.length && (
            <div>
              <h4>Noch zu klären</h4>
              <ul>
                {visible.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
