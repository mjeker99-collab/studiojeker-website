"use client";
import { useEffect, useState } from "react";
type Status = {
  configured: boolean;
  connection: {
    email: string;
    folderId: string | null;
    folderName: string | null;
  } | null;
};
type File = { id: string; name: string; mimeType: string };
async function api(path: string, body?: unknown) {
  const r = await fetch(`/api/drive/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Drive-Anfrage fehlgeschlagen.");
  return data;
}
export default function DriveConnection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [folder, setFolder] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    api("status")
      .then((s) => {
        if (mounted) setStatus(s);
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Drive-Anfrage fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function load(more = false) {
    const data = await api(
      `files${more && next ? `?pageToken=${encodeURIComponent(next)}` : ""}`,
    );
    setFiles((old) => (more ? [...old, ...data.files] : data.files));
    setNext(data.nextPageToken);
  }
  return (
    <section aria-labelledby="drive-heading" className="panel">
      <h3 id="drive-heading">Google Drive</h3>
      {error && <p role="alert">{error}</p>}
      {!status && !error && <p>Verbindungsstatus wird geladen …</p>}
      {status && !status.configured && (
        <p>
          Die Google-Anmeldung muss einmalig für StudioONE eingerichtet werden.
          Benötigt werden ein Google-OAuth-Client und die geschützte
          Serverkonfiguration in Render.
        </p>
      )}
      {status && !status.connection && (
        <>
          <p>
            Verbinde dein Google-Konto, um Dateien aus einem ausgewählten
            Drive-Ordner anzuzeigen. Google erteilt dabei Lesezugriff auf dein
            Drive. StudioONE fragt nur den ausgewählten Ordner ab. Dateien
            werden dadurch weder kopiert noch an KI-Anbieter übermittelt.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy || !status.configured}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Ich möchte mein Google Drive mit StudioONE verbinden.
          </label>
          <button
            type="button"
            disabled={busy || !status.configured || !consent}
            onClick={() =>
              void act(async () => {
                const data = await api("connect", {});
                window.location.assign(data.url);
              })
            }
          >
            Google Drive verbinden
          </button>
        </>
      )}
      {status?.connection && (
        <>
          <p>
            Verbunden als {status.connection.email}. Diese Verbindung gilt für
            deinen StudioONE-Benutzer.
          </p>
          <p>Ordner: {status.connection.folderName || "Noch nicht gewählt"}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const s = await api("folder", { folder });
                setStatus(s);
                setFiles([]);
                setNext(null);
                await load();
              });
            }}
          >
            <label>
              Google-Drive-Ordnerlink oder Ordner-ID
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                maxLength={2000}
                disabled={busy}
              />
            </label>
            <button disabled={busy || !folder.trim()}>Ordner auswählen</button>
          </form>
          <button
            type="button"
            disabled={busy || !status.connection.folderId}
            onClick={() => void act(() => load())}
          >
            Dateien anzeigen / aktualisieren
          </button>{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await api("disconnect", {});
                setStatus(await api("status"));
                setFiles([]);
                setNext(null);
                setConsent(false);
              })
            }
          >
            Verbindung trennen
          </button>
          <p className="muted">
            Trennen entfernt die gespeicherten Zugangsdaten aus StudioONE. Die
            Google-Freigabe kannst du zusätzlich in deinem Google-Konto
            widerrufen.
          </p>
          <ul>
            {files.map((file) => (
              <li key={file.id} style={{ overflowWrap: "anywhere" }}>
                <a
                  href={`https://drive.google.com/${file.mimeType === "application/vnd.google-apps.folder" ? "drive/folders/" : "file/d/"}${encodeURIComponent(file.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
          {next && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => load(true))}
            >
              Weitere Dateien
            </button>
          )}
          <p className="muted">
            Die Dateien öffnen sich in Google Drive. Im Content-Studio kannst du
            Bilder aus diesem Ordner und seinen Unterordnern als GPT-Referenz
            auswählen. Das Speichern generierter Medien in Drive folgt separat.
          </p>
        </>
      )}
    </section>
  );
}
