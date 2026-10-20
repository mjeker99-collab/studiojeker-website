"use client";
/* eslint-disable @next/next/no-img-element -- Private authenticated image routes. */
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
  initialRequest,
  hasUnsavedContent = false,
}: {
  state: State;
  refresh: () => Promise<void>;
  initialRequest?: {
    seriesId: string;
    message: string;
    intent?: "EDIT";
    sourceAssetId?: string;
    contentId?: string;
  };
  hasUnsavedContent?: boolean;
}) {
  const [seriesId, setSeriesId] = useState(initialRequest?.seriesId || "");
  const [campaignId, setCampaignId] = useState("");
  const [message, setMessage] = useState(initialRequest?.message || "");
  const [mediaIntent, setMediaIntent] = useState<
    "TEXT" | "IMAGE" | "VIDEO" | "EDIT"
  >(initialRequest?.intent || "TEXT");
  const [contentId, setContentId] = useState(initialRequest?.contentId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [referenceIds, setReferenceIds] = useState<string[]>(
    initialRequest?.sourceAssetId ? [initialRequest.sourceAssetId] : [],
  );
  const [driveImages, setDriveImages] = useState<SelectedDriveImage[]>([]);
  const referenceCount = referenceIds.length + driveImages.length;
  const editingImage = mediaIntent === "EDIT";
  const referenceLimit = editingImage ? 1 : 4;
  const [uploadRights, setUploadRights] = useState(false);
  const [copiedJob, setCopiedJob] = useState("");
  const [replyToJobId, setReplyToJobId] = useState("");
  const replyToJob = state.jobs.find((job) => job.id === replyToJobId);
  const replyToText = (replyToJob?.result as { reply?: string } | undefined)
    ?.reply;
  const images = state.assets.filter((a) =>
    ["image/jpeg", "image/png", "image/webp"].includes(a.mime),
  );
  const storageReady = state.config.storage !== "DISCONNECTED";
  async function uploadImage(file: File) {
    if (
      busy ||
      !uploadRights ||
      !storageReady ||
      referenceCount >= referenceLimit
    )
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
      setReferenceIds((ids) =>
        Array.from(new Set([...ids, a.id])).slice(0, referenceLimit),
      );
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const jobs = state.jobs
    .filter(
      (j) =>
        (j.kind === "CHAT" ||
          (j.input as { request?: { photoEdit?: boolean } }).request
            ?.photoEdit) &&
        j.seriesId === seriesId,
    )
    .slice()
    .reverse();
  function continueFrom(job: (typeof jobs)[number], execute: boolean) {
    const input = job.input as {
      request?: { referenceIds?: string[]; contentId?: string | null };
      driveSelection?: { files: SelectedDriveImage[] };
    };
    setReplyToJobId(job.id);
    setMediaIntent(execute ? "EDIT" : "TEXT");
    setReferenceIds(input.request?.referenceIds || []);
    setDriveImages(input.driveSelection?.files || []);
    setContentId(input.request?.contentId || "");
    setMessage(execute ? "Bitte so ausführen." : "");
    setConfirmed(false);
    setError("");
    document.getElementById("studio-chat-message")?.focus();
  }
  async function send() {
    if (busy || !message.trim() || !confirmed || !state.config.connected)
      return;
    if (editingImage && (!storageReady || referenceCount !== 1)) {
      setError(
        "Bitte genau ein Bild auswählen. Der private Speicher muss verbunden sein.",
      );
      return;
    }
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
        kind: editingImage ? "IMAGE" : "CHAT",
        message: message.trim(),
        ...(replyToJobId ? { replyToJobId } : {}),
        ...(editingImage
          ? { photoEdit: true }
          : mediaIntent !== "TEXT"
            ? { mediaIntent }
            : {}),
        contentId: editingImage
          ? contentId ||
            state.series.find((s) => s.id === id)?.contents[0]?.id ||
            null
          : null,
        requestKey: crypto.randomUUID(),
        referenceIds,
        driveReferenceIds: driveImages.map((file) => file.id),
        referenceRights: confirmed,
        referenceTransfer: confirmed,
        confirmedCosts: true,
      });
      queued = true;
      setMessage("");
      setReplyToJobId("");
      setConfirmed(false);
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
  async function applyImage(id: string) {
    setBusy(true);
    setError("");
    try {
      await post(`apply/${id}`, {});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Übernahme fehlgeschlagen.");
    } finally {
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
      driveSelection?: { files: SelectedDriveImage[] };
    };
    const result = job.result as { reply?: string } | null;
    if (!input.request?.mediaIntent || !result?.reply) return;
    const type = input.request.mediaIntent === "IMAGE" ? "Bild" : "Video";
    const referenceNames = [
      ...(input.request.referenceIds || []).map(
        (id) =>
          state.assets.find((asset) => asset.id === id)?.name || "Bildreferenz",
      ),
      ...(input.driveSelection?.files || []).map((file) => file.name),
    ];
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
        Beschreibe deine Idee oder bearbeite ein Bild direkt. Wähle es vom
        Gerät, aus der Bibliothek oder aus Google Drive.
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
              setContentId("");
              setReplyToJobId("");
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
            editTargetId?: string;
            replyTo?: { reply: string };
            request?: {
              message?: string;
              mediaIntent?: "IMAGE" | "VIDEO";
              referenceIds?: string[];
              photoEdit?: boolean;
            };
            driveSelection?: { files: SelectedDriveImage[] };
          };
          const result = j.result as {
            reply?: string;
            assetId?: string;
            sourceAssetIds?: string[];
          } | null;
          const canExecuteImage =
            input.request?.mediaIntent !== "VIDEO" &&
            (input.request?.referenceIds?.length || 0) +
              (input.driveSelection?.files.length || 0) ===
              1;
          return (
            <article key={j.id}>
              <p>
                <strong>
                  Du
                  {input.request?.photoEdit
                    ? " · Bildbearbeitung"
                    : input.request?.mediaIntent
                      ? ` · ${input.request.mediaIntent === "IMAGE" ? "Bildauftrag" : "Videoauftrag"}`
                      : ""}
                </strong>
              </p>
              <p className="studio-chat-message">{input.request?.message}</p>
              {input.replyTo && (
                <details>
                  <summary>Bezug: ausgewählter GPT-Vorschlag</summary>
                  <p className="studio-chat-message">{input.replyTo.reply}</p>
                </details>
              )}
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
                {result?.assetId
                  ? "Bearbeitetes Bild bereit. Vergleiche es mit dem Ausgangsbild."
                  : result?.reply ||
                    j.error ||
                    (j.status === "QUEUED"
                      ? "Auftrag wartet auf Start. Siehe KI-Aufträge unten."
                      : j.status === "RUNNING"
                        ? "Antwort wird erstellt …"
                        : "Keine Antwort verfügbar.")}
              </p>
              {j.status === "SUCCEEDED" &&
                j.kind === "CHAT" &&
                result?.reply && (
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => continueFrom(j, false)}
                    >
                      Darauf antworten
                    </button>
                    {canExecuteImage && (
                      <button
                        type="button"
                        disabled={
                          busy || !storageReady || !state.config.connected
                        }
                        onClick={() => continueFrom(j, true)}
                      >
                        Vorschlag am Bild ausführen
                      </button>
                    )}
                  </div>
                )}
              {result?.assetId && input.request?.photoEdit && (
                <div className="studio-photo-result">
                  <div className="studio-fields">
                    <figure>
                      <figcaption>Vorher · Ausgangsbild</figcaption>
                      {result.sourceAssetIds?.[0] && (
                        <img
                          alt="Ausgangsbild vor der Bearbeitung"
                          src={`/api/studio/assets/${result.sourceAssetIds[0]}`}
                        />
                      )}
                    </figure>
                    <figure>
                      <figcaption>Nachher · KI-Bearbeitung</figcaption>
                      <img
                        alt="Ergebnis der Bildbearbeitung"
                        src={`/api/studio/assets/${result.assetId}`}
                      />
                    </figure>
                  </div>
                  <p>
                    Original und Ergebnis sind separat in der Bibliothek
                    gespeichert. Prüfe auch Details und Personen; generative
                    Bearbeitung kann sie verändern.
                  </p>
                  <div className="actions">
                    <a href={`/api/studio/assets/${result.assetId}?download`}>
                      Bearbeitetes Bild herunterladen
                    </a>
                    {j.status === "SUCCEEDED" && (
                      <button
                        type="button"
                        disabled={busy || hasUnsavedContent}
                        onClick={() => void applyImage(j.id)}
                      >
                        Als neue Version übernehmen
                      </button>
                    )}
                    {j.status === "APPLIED" && (
                      <span>Als neue Entwurfsversion übernommen.</span>
                    )}
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setReferenceIds([result.assetId!]);
                        setContentId(input.editTargetId || "");
                        setDriveImages([]);
                        setMediaIntent("EDIT");
                        setReplyToJobId("");
                        setMessage("");
                        setConfirmed(false);
                        document.getElementById("studio-chat-message")?.focus();
                      }}
                    >
                      Dieses Ergebnis weiter bearbeiten
                    </button>
                  </div>
                  {hasUnsavedContent && (
                    <p>
                      Speichere zuerst deine offenen Änderungen im
                      Beitragseditor.
                    </p>
                  )}
                </div>
              )}
              {j.status === "SUCCEEDED" &&
                input.request?.mediaIntent &&
                !canExecuteImage &&
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
        «Bild bearbeiten» führt deine Anweisung direkt am ausgewählten Bild aus.
        Das Ergebnis bleibt als separate Datei erhalten. Bildideen und
        Videoaufträge lassen sich weiterhin als Text vorbereiten. Die letzten 12
        erfolgreichen Gesprächsrunden werden als Textkontext verwendet. Nur die
        aktuell ausgewählten Bilder werden übermittelt. Die Bildauswahl bleibt
        für weitere Nachrichten dieses Gesprächs bestehen, bis du sie entfernst.
      </p>
      {!state.config.connected && (
        <p>
          GPT ist noch nicht verbunden. API-Schlüssel und KI-Aktivierung müssen
          in der Serverkonfiguration eingerichtet werden.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <h3>
          {replyToJobId
            ? "Mit diesem Vorschlag weiterarbeiten"
            : "Deine nächste Nachricht"}
        </h3>
        {replyToText && (
          <div
            role="group"
            className="studio-chat-reply"
            aria-label="Ausgewählter GPT-Vorschlag"
          >
            <p>
              <strong>
                {editingImage
                  ? "Diesen Vorschlag am ausgewählten Bild ausführen"
                  : "Deine Antwort bezieht sich auf diesen Vorschlag"}
              </strong>
            </p>
            <p className="studio-chat-message">{replyToText}</p>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setReplyToJobId("");
                setConfirmed(false);
              }}
            >
              Bezug entfernen
            </button>
          </div>
        )}
        <label htmlFor="studio-chat-intent">Auftrag</label>
        <select
          id="studio-chat-intent"
          value={mediaIntent}
          disabled={busy}
          onChange={(e) => {
            setMediaIntent(
              e.target.value as "TEXT" | "IMAGE" | "VIDEO" | "EDIT",
            );
            setConfirmed(false);
            setReplyToJobId("");
          }}
        >
          <option value="TEXT">Gespräch / Text</option>
          <option value="EDIT">Bild bearbeiten · direkt ausführen</option>
          <option value="IMAGE">Bildidee vorbereiten</option>
          <option value="VIDEO">Videoauftrag vorbereiten</option>
        </select>
        {editingImage && (
          <p>
            Wähle genau ein Ausgangsbild und beschreibe die gewünschte Änderung.
            Zum Beispiel: «Schatten aufhellen und den Hund hervorheben». Nur
            Bild, Anweisung und gegebenenfalls der oben ausgewählte Vorschlag
            werden für diese Bearbeitung übermittelt.
          </p>
        )}
        {editingImage && !!seriesId && (
          <label>
            Zielbeitrag
            <select
              value={
                contentId ||
                state.series.find((s) => s.id === seriesId)?.contents[0]?.id ||
                ""
              }
              disabled={busy}
              onChange={(e) => {
                setContentId(e.target.value);
                setConfirmed(false);
              }}
            >
              {state.series
                .find((s) => s.id === seriesId)
                ?.contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label htmlFor="studio-chat-message">Deine Nachricht</label>
        <textarea
          id="studio-chat-message"
          value={message}
          maxLength={4000}
          rows={4}
          placeholder={
            replyToJobId
              ? "Zum Beispiel: Bitte etwas heller und mit weniger Vignette."
              : "Was möchtest du erstellen oder ändern?"
          }
          disabled={busy}
          onChange={(e) => {
            setMessage(e.target.value);
            setConfirmed(false);
          }}
        />
        <p>
          Bildreferenzen: {referenceCount}/{referenceLimit}
        </p>
        {editingImage && referenceCount !== 1 && (
          <p role="status">
            Für die Bearbeitung genau ein Bild auswählen. Entferne
            gegebenenfalls zusätzliche Referenzen.
          </p>
        )}
        <fieldset disabled={busy || !storageReady}>
          <legend>Bild vom Gerät · Computer, iPad oder Smartphone</legend>
          <p>
            Direkt aus Fotos oder Dateien wählen. JPEG, PNG und WebP bis 8 MB /
            20 Megapixel. HEIC bitte zuvor als JPEG exportieren.
          </p>
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
              disabled={!uploadRights || referenceCount >= referenceLimit}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadImage(file);
              }}
            />
          </label>
        </fieldset>
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
                disabled={
                  !referenceIds.includes(a.id) &&
                  referenceCount >= referenceLimit
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
              {referenceIds.includes(a.id) && (
                <img
                  className="studio-reference-thumb"
                  alt={`Ausgewählt: ${a.name}`}
                  src={`/api/studio/assets/${a.id}`}
                />
              )}
            </label>
          ))}
        </fieldset>
        <DriveImagePicker
          selected={driveImages}
          remaining={Math.max(0, referenceLimit - referenceCount)}
          disabled={busy}
          onChange={(files) => {
            setDriveImages(files);
            setConfirmed(false);
          }}
        />
        {editingImage && driveImages.length > 0 && (
          <p>
            Das ausgewählte Drive-Bild wird für den Vorher/Nachher-Vergleich
            zusätzlich privat in der Bibliothek gespeichert.
          </p>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          {editingImage ? (
            <>
              Ich bestätige die Nutzungsrechte, die Übermittlung des
              ausgewählten Bildes, meiner Anweisung
              {replyToJobId ? " und des ausgewählten GPT-Vorschlags" : ""} an
              OpenAI sowie die kostenpflichtige Bearbeitung. Budgetreservierung:
              USD {state.config.imageReserve.toFixed(2)}, kein garantierter
              Preis.
            </>
          ) : (
            <>
              Ich bestätige die Nutzungsrechte und die Übermittlung von
              Gespräch, Serienbriefing, Referenztexten und {referenceCount}{" "}
              ausgewählten Bildern an OpenAI. Bildanalyse verursacht zusätzliche
              Eingabetokens. Budgetreservierung: USD{" "}
              {state.config.textReserve.toFixed(2)} pro Nachricht, kein
              garantierter Preis.
            </>
          )}
        </label>
        <button
          disabled={
            busy ||
            !confirmed ||
            !message.trim() ||
            !state.config.connected ||
            (editingImage && (!storageReady || referenceCount !== 1))
          }
        >
          {busy
            ? editingImage
              ? "Bild wird bearbeitet …"
              : "GPT antwortet …"
            : editingImage
              ? replyToJobId
                ? "Vorschlag jetzt am Bild ausführen"
                : "Bild jetzt bearbeiten"
              : mediaIntent === "TEXT"
                ? "An GPT senden"
                : "Auftrag mit GPT vorbereiten"}
        </button>
      </form>
    </section>
  );
}
