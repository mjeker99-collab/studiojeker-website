"use client";
import { useState } from "react";
import type { studioState } from "@/lib/studio/service";
type State = Awaited<ReturnType<typeof studioState>>;
async function post(path: string, body: unknown) {
  const r = await fetch(`/api/studio/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(115000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Anfrage fehlgeschlagen.");
  return data;
}
export default function StudioChat({
  state,
  refresh,
}: {
  state: State;
  refresh: () => Promise<void>;
}) {
  const [seriesId, setSeriesId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [message, setMessage] = useState("");
  const [mediaIntent, setMediaIntent] = useState<"TEXT" | "IMAGE" | "VIDEO">(
    "TEXT",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [uploadRights, setUploadRights] = useState(false);
  const [copiedJob, setCopiedJob] = useState("");
  const images = state.assets.filter((a) =>
    ["image/jpeg", "image/png", "image/webp"].includes(a.mime),
  );
  const storageReady = state.config.storage !== "DISCONNECTED";
  async function uploadImage(file: File) {
    if (busy || !uploadRights || !storageReady || referenceIds.length >= 4)
      return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 8 * 1024 * 1024)
        throw new Error("Maximale Dateigrösse: 8 MB.");
      const r = await fetch("/api/studio/upload", {
        method: "POST",
        headers: {
          "x-file-name": encodeURIComponent(file.name),
          "x-studio-kind": "ORIGINAL",
          "x-rights-confirmed": "true",
        },
        body: file,
        signal: AbortSignal.timeout(30000),
      });
      const a = await r.json();
      if (!r.ok) throw new Error(a.error || "Upload fehlgeschlagen.");
      await refresh();
      setReferenceIds((ids) => Array.from(new Set([...ids, a.id])).slice(0, 4));
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const jobs = state.jobs
    .filter((j) => j.kind === "CHAT" && j.seriesId === seriesId)
    .slice()
    .reverse();
  async function send() {
    if (busy || !message.trim() || !confirmed || !state.config.connected)
      return;
    setBusy(true);
    setError("");
    let queued = false;
    try {
      let id = seriesId;
      if (!id) {
        const series = await post("series", {
          title: message.trim().slice(0, 80),
          topic: message.trim().slice(0, 2000),
          offer: "",
          goal: "Im Gespräch klären",
          audience: "Im Gespräch klären",
          tone: "Persönlich, professionell, Schweizer Hochdeutsch",
          channels: ["INSTAGRAM"],
          count: 1,
          formats: ["4:5"],
          campaignId: campaignId || null,
          referenceAssetIds: [],
          brandRules: ["tone", "services", "audiences"],
        });
        id = series.id;
        setSeriesId(id);
      }
      const job = await post("jobs", {
        seriesId: id,
        kind: "CHAT",
        message: message.trim(),
        ...(mediaIntent !== "TEXT" ? { mediaIntent } : {}),
        contentId: null,
        requestKey: crypto.randomUUID(),
        referenceIds,
        referenceRights: confirmed,
        referenceTransfer: confirmed,
        confirmedCosts: true,
      });
      queued = true;
      setMessage("");
      await post(`run/${job.id}`, { confirmedCosts: true });
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Chat-Anfrage fehlgeschlagen.") +
          (queued
            ? " Auftrag gespeichert. Status vor einem neuen Versuch aktualisieren."
            : ""),
      );
    } finally {
      try {
        await refresh();
      } catch {
        setError(
          "Status konnte nicht geladen werden. Bitte aktualisieren, bevor du erneut sendest.",
        );
      }
      setBusy(false);
    }
  }
  async function copyForChatGPT(job: (typeof jobs)[number]) {
    const input = job.input as {
      request?: {
        message?: string;
        mediaIntent?: "IMAGE" | "VIDEO";
        referenceIds?: string[];
      };
    };
    const result = job.result as { reply?: string } | null;
    if (!input.request?.mediaIntent || !result?.reply) return;
    const type = input.request.mediaIntent === "IMAGE" ? "Bild" : "Video";
    const referenceNames = (input.request.referenceIds || []).map(
      (id) =>
        state.assets.find((asset) => asset.id === id)?.name || "Bildreferenz",
    );
    const handoff = [
      `Bitte erstelle ein ${type} für Studiojeker. Entscheide selbst, welches deiner verfügbaren Werkzeuge und Modelle (gegebenenfalls Higgsfield) dafür geeignet ist. Prüfe vor einer kostenpflichtigen Generierung die Credits und frage mich nach der Freigabe. Behaupte keine Ausführung, bevor ein Ergebnis vorliegt.`,
      `Mein ursprünglicher Auftrag: ${input.request.message}`,
      `Ausgearbeitetes Briefing aus StudioONE:\n${result.reply}`,
      ...(referenceNames.length
        ? [
            `Die Bildreferenzen (${referenceNames.join(", ")}) füge ich in ChatGPT erneut als Dateien hinzu; sie wurden nicht mit diesem Text übertragen.`,
          ]
        : []),
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(handoff);
      setCopiedJob(job.id);
      setError("");
    } catch {
      setError(
        "Kopieren fehlgeschlagen. Bitte den Auftrag und die GPT-Antwort manuell übernehmen.",
      );
    }
  }
  return (
    <section className="studio-chat" aria-labelledby="studio-chat-heading">
      <h2 id="studio-chat-heading">Mit GPT entwickeln</h2>
      <p>
        Beschreibe deine Idee oder bereite einen Bild- oder Videoauftrag mit GPT
        vor.
      </p>
      <div className="studio-chat-controls">
        <label>
          Gespräch / Content-Serie
          <select
            value={seriesId}
            disabled={busy}
            onChange={(e) => {
              setSeriesId(e.target.value);
              setConfirmed(false);
              setReferenceIds([]);
              setError("");
            }}
          >
            <option value="">Neues Gespräch</option>
            {state.series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        {!seriesId && (
          <label>
            Kampagne
            <select
              disabled={busy}
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Ohne Kampagne</option>
              {state.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError("");
            void refresh().catch(() =>
              setError("Status konnte nicht geladen werden."),
            );
          }}
        >
          Status aktualisieren
        </button>
      </div>
      <div
        className="studio-chat-transcript"
        role="log"
        aria-label="Gespräch mit GPT"
        aria-live="polite"
      >
        {!jobs.length && (
          <p>
            Zum Beispiel: «Entwickle einen Social-Post zu Sichtbarkeit im Abo
            mit einer türkisfarbenen Papierpflanze.»
          </p>
        )}
        {jobs.map((j) => {
          const input = j.input as {
            request?: {
              message?: string;
              mediaIntent?: "IMAGE" | "VIDEO";
              referenceIds?: string[];
            };
          };
          const result = j.result as { reply?: string } | null;
          return (
            <article key={j.id}>
              <p>
                <strong>
                  Du
                  {input.request?.mediaIntent
                    ? ` · ${input.request.mediaIntent === "IMAGE" ? "Bildauftrag" : "Videoauftrag"}`
                    : ""}
                </strong>
              </p>
              <p className="studio-chat-message">{input.request?.message}</p>
              {!!input.request?.referenceIds?.length && (
                <p className="muted">
                  Bildreferenzen:{" "}
                  {input.request.referenceIds
                    .map(
                      (id) =>
                        state.assets.find((a) => a.id === id)?.name ||
                        "Nicht mehr verfügbar",
                    )
                    .join(", ")}
                </p>
              )}
              <p>
                <strong>GPT</strong>
              </p>
              <p className="studio-chat-message">
                {result?.reply ||
                  j.error ||
                  (j.status === "QUEUED"
                    ? "Auftrag wartet auf Start. Siehe KI-Aufträge unten."
                    : j.status === "RUNNING"
                      ? "Antwort wird erstellt …"
                      : "Keine Antwort verfügbar.")}
              </p>
              {j.status === "SUCCEEDED" &&
                input.request?.mediaIntent &&
                result?.reply && (
                  <div className="studio-chat-handoff">
                    <button
                      type="button"
                      onClick={() => void copyForChatGPT(j)}
                    >
                      Auftrag für ChatGPT kopieren
                    </button>
                    <a
                      href="https://chatgpt.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ChatGPT öffnen ↗
                    </a>
                    {copiedJob === j.id && (
                      <span role="status">Kopiert. In ChatGPT einfügen.</span>
                    )}
                  </div>
                )}
            </article>
          );
        })}
      </div>
      <p className="muted">
        GPT in StudioONE bereitet Bild- und Videoaufträge vor. Zur Ausführung
        den Auftrag kopieren und in ChatGPT mit deiner Higgsfield-Verbindung
        einfügen. Ergebnisse werden noch nicht automatisch in StudioONE
        übernommen. Die letzten 12 erfolgreichen Gesprächsrunden werden als
        Textkontext verwendet. Nur die aktuell ausgewählten Bilder werden
        übermittelt. Die Bildauswahl bleibt für weitere Nachrichten dieses
        Gesprächs bestehen, bis du sie entfernst.
      </p>
      {!state.config.connected && (
        <p>
          GPT ist noch nicht verbunden. Der OpenAI-Zugang muss in StudioONE
          eingerichtet werden.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="studio-chat-intent">Auftrag</label>
        <select
          id="studio-chat-intent"
          value={mediaIntent}
          disabled={busy}
          onChange={(e) => {
            setMediaIntent(e.target.value as "TEXT" | "IMAGE" | "VIDEO");
            setConfirmed(false);
          }}
        >
          <option value="TEXT">Gespräch / Text</option>
          <option value="IMAGE">Bild erstellen</option>
          <option value="VIDEO">Video erstellen</option>
        </select>
        <label htmlFor="studio-chat-message">Deine Nachricht</label>
        <textarea
          id="studio-chat-message"
          value={message}
          maxLength={4000}
          rows={4}
          disabled={busy}
          onChange={(e) => setMessage(e.target.value)}
        />
        <fieldset disabled={busy || !storageReady}>
          <legend>Bildreferenzen ({referenceIds.length}/4)</legend>
          {!storageReady && (
            <p>
              Bildspeicher noch nicht eingerichtet. Textgespräche sind weiterhin
              möglich.
            </p>
          )}
          {images.length === 0 && <p>Noch keine Bilder in der Bibliothek.</p>}
          {images.map((a) => (
            <label className="check" key={a.id}>
              <input
                type="checkbox"
                checked={referenceIds.includes(a.id)}
                disabled={
                  !referenceIds.includes(a.id) && referenceIds.length >= 4
                }
                onChange={(e) => {
                  setReferenceIds(
                    e.target.checked
                      ? [...referenceIds, a.id]
                      : referenceIds.filter((id) => id !== a.id),
                  );
                  setConfirmed(false);
                }}
              />
              {a.name}
            </label>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={uploadRights}
              onChange={(e) => setUploadRights(e.target.checked)}
            />
            Ich darf das hochgeladene Bild verwenden und in der Bibliothek
            speichern.
          </label>
          <label>
            Bild hochladen (JPEG, PNG oder WebP, maximal 8 MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!uploadRights || referenceIds.length >= 4}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadImage(file);
              }}
            />
          </label>
        </fieldset>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Ich bestätige die Nutzungsrechte und die Übermittlung von Gespräch,
          Serienbriefing, Referenztexten und {referenceIds.length} ausgewählten
          Bildern an OpenAI. Bildanalyse verursacht zusätzliche Eingabetokens.
          Budgetreservierung: USD {state.config.textReserve.toFixed(2)} pro
          Nachricht, kein garantierter Preis.
        </label>
        <button
          disabled={
            busy || !confirmed || !message.trim() || !state.config.connected
          }
        >
          {busy
            ? "GPT antwortet …"
            : mediaIntent === "TEXT"
              ? "An GPT senden"
              : "Auftrag mit GPT vorbereiten"}
        </button>
      </form>
    </section>
  );
}
