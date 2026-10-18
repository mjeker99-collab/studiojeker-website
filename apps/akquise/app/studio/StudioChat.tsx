"use client";
import { useState } from "react";
import DriveImagePicker, { type SelectedDriveImage } from "./DriveImagePicker";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [driveImages, setDriveImages] = useState<SelectedDriveImage[]>([]);
  const referenceCount = referenceIds.length + driveImages.length;
  const [uploadRights, setUploadRights] = useState(false);
  const images = state.assets.filter((a) =>
    ["image/jpeg", "image/png", "image/webp"].includes(a.mime),
  );
  const storageReady = state.config.storage !== "DISCONNECTED";
  async function uploadImage(file: File) {
    if (busy || !uploadRights || !storageReady || referenceCount >= 4) return;
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
        contentId: null,
        requestKey: crypto.randomUUID(),
        referenceIds,
        driveReferenceIds: driveImages.map((file) => file.id),
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
  return (
    <section className="studio-chat" aria-labelledby="studio-chat-heading">
      <h2 id="studio-chat-heading">Mit GPT entwickeln</h2>
      <p>
        Beschreibe deine Idee. Entwickle Texte, Bildideen und Animationsprompts
        im Gespräch.
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
              setDriveImages([]);
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
            request?: { message?: string; referenceIds?: string[] };
            driveSelection?: { files: SelectedDriveImage[] };
          };
          const result = j.result as { reply?: string } | null;
          return (
            <article key={j.id}>
              <p>
                <strong>Du</strong>
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
              {!!input.driveSelection?.files.length && (
                <p className="muted">
                  Drive-Bildreferenzen:{" "}
                  {input.driveSelection.files
                    .map((file) => file.name)
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
            </article>
          );
        })}
      </div>
      <p className="muted">
        Bild- und Videoausführung über Higgsfield: noch nicht verbunden. Dieser
        Chat erstellt Texte und Prompts. Die letzten 12 erfolgreichen
        Gesprächsrunden werden als Textkontext verwendet. Nur die aktuell
        ausgewählten Bilder werden übermittelt. Die Bildauswahl bleibt für
        weitere Nachrichten dieses Gesprächs bestehen, bis du sie entfernst.
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
        <label htmlFor="studio-chat-message">Deine Nachricht</label>
        <textarea
          id="studio-chat-message"
          value={message}
          maxLength={4000}
          rows={4}
          disabled={busy}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p>Bildreferenzen: {referenceCount}/4</p>
        <DriveImagePicker
          selected={driveImages}
          remaining={4 - referenceCount}
          disabled={busy}
          onChange={(files) => {
            setDriveImages(files);
            setConfirmed(false);
          }}
        />
        <fieldset disabled={busy || !storageReady}>
          <legend>Bilder aus der Bibliothek</legend>
          {!storageReady && (
            <p>
              Der Speicher für Uploads ist noch nicht eingerichtet. Bilder aus
              Google Drive kannst du oben auswählen.
            </p>
          )}
          {images.length === 0 && <p>Noch keine Bilder in der Bibliothek.</p>}
          {images.map((a) => (
            <label className="check" key={a.id}>
              <input
                type="checkbox"
                checked={referenceIds.includes(a.id)}
                disabled={!referenceIds.includes(a.id) && referenceCount >= 4}
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
              disabled={!uploadRights || referenceCount >= 4}
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
          Serienbriefing, Referenztexten und {referenceCount} ausgewählten
          Bildern an OpenAI. Bildanalyse verursacht zusätzliche Eingabetokens.
          Budgetreservierung: USD {state.config.textReserve.toFixed(2)} pro
          Nachricht, kein garantierter Preis.
        </label>
        <button
          disabled={
            busy || !confirmed || !message.trim() || !state.config.connected
          }
        >
          {busy ? "GPT antwortet …" : "An GPT senden"}
        </button>
      </form>
    </section>
  );
}
