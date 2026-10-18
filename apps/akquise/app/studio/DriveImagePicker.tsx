"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export type SelectedDriveImage = { id: string; name: string };
type DriveFile = SelectedDriveImage & { mimeType: string; size?: string };
type Connection = { folderId: string | null; folderName: string | null };
const folderMime = "application/vnd.google-apps.folder";
const imageMimes = ["image/jpeg", "image/png", "image/webp"];

async function get(path: string, signal: AbortSignal) {
  const response = await fetch(`/api/drive/${path}`, {
    signal,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Google Drive konnte nicht geladen werden.");
  return data;
}

function Preview({ file }: { file: SelectedDriveImage }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p role="status">
      Vorschau nicht verfügbar. Datei und Drive-Verbindung prüfen.
    </p>
  ) : (
    <Image
      src={`/api/drive/preview/${encodeURIComponent(file.id)}`}
      alt={`Vorschau: ${file.name}`}
      width={160}
      height={120}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

export default function DriveImagePicker({
  selected,
  onChange,
  remaining,
  disabled,
}: {
  selected: SelectedDriveImage[];
  onChange: (files: SelectedDriveImage[]) => void;
  remaining: number;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const [folders, setFolders] = useState<SelectedDriveImage[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [pageToken, setPageToken] = useState("");
  const [nextPage, setNextPage] = useState("");
  const [reload, setReload] = useState(0);
  const folderId = folders.at(-1)?.id || "";

  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const status = await get("status", abort.signal);
        if (!active) return;
        setConnection(status.connection);
        if (!status.connection?.folderId) {
          setFiles([]);
          setNextPage("");
          return;
        }
        const query = new URLSearchParams();
        if (folderId) query.set("folderId", folderId);
        if (pageToken) query.set("pageToken", pageToken);
        const result = await get(`files?${query}`, abort.signal);
        if (!active) return;
        setFiles(result.files);
        setNextPage(result.nextPageToken || "");
      } catch (e) {
        if (active) {
          setFiles([]);
          setNextPage("");
          setError(
            e instanceof Error
              ? e.message
              : "Google Drive konnte nicht geladen werden.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      abort.abort();
    };
  }, [open, folderId, pageToken, reload]);

  return (
    <fieldset className="drive-picker" disabled={disabled}>
      <legend>Bilder aus Google Drive</legend>
      <p>
        JPEG, PNG oder WebP, maximal 8 MB und 20 Megapixel. Insgesamt bis zu
        vier Bilder pro Nachricht.
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="drive-image-browser"
        onClick={() => setOpen(!open)}
      >
        {open ? "Drive-Auswahl schliessen" : "Bilder aus Google Drive wählen"}
      </button>
      {open && (
        <div id="drive-image-browser" aria-busy={loading}>
          {loading && <p role="status">Google Drive wird geladen …</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !connection?.folderId && !error && (
            <p>
              Verbinde Google Drive und wähle deinen Ordner in der Bibliothek
              aus.
            </p>
          )}
          {connection?.folderId && (
            <>
              <p>
                <strong>Ordner:</strong>{" "}
                {[
                  connection.folderName || "Google Drive",
                  ...folders.map((f) => f.name),
                ].join(" / ")}
              </p>
              <div className="actions">
                {!!folders.length && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setFolders(folders.slice(0, -1));
                      setPageToken("");
                    }}
                  >
                    Übergeordneter Ordner
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setFolders([]);
                    setPageToken("");
                    setReload((n) => n + 1);
                  }}
                >
                  Startordner aktualisieren
                </button>
              </div>
              {!loading && !error && !files.length && (
                <p>Dieser Ordner ist leer.</p>
              )}
              {!loading &&
                files.map((file) => {
                  if (file.mimeType === folderMime)
                    return (
                      <div className="drive-picker-row" key={file.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFolders([
                              ...folders,
                              { id: file.id, name: file.name },
                            ]);
                            setPageToken("");
                          }}
                        >
                          Ordner öffnen: {file.name}
                        </button>
                      </div>
                    );
                  const checked = selected.some((s) => s.id === file.id);
                  const supported =
                    imageMimes.includes(file.mimeType) &&
                    Number(file.size) > 0 &&
                    Number(file.size) <= 8 * 1024 * 1024;
                  return (
                    <label className="check drive-picker-row" key={file.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!supported || (!checked && remaining <= 0)}
                        onChange={(e) =>
                          onChange(
                            e.target.checked
                              ? [...selected, { id: file.id, name: file.name }]
                              : selected.filter((s) => s.id !== file.id),
                          )
                        }
                      />
                      <span>
                        {file.name}
                        {!supported && (
                          <span className="muted">
                            {" "}
                            · Kein unterstütztes Bild bis 8 MB
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              <div className="actions">
                {pageToken && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPageToken("")}
                  >
                    Erste Seite
                  </button>
                )}
                {nextPage && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPageToken(nextPage)}
                  >
                    Weitere Dateien
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {!!selected.length && (
        <div className="drive-selected" aria-label="Ausgewählte Drive-Bilder">
          {selected.map((file) => (
            <div key={file.id}>
              <Preview file={file} />
              <p>{file.name}</p>
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((s) => s.id !== file.id))
                }
                aria-label={`Drive-Bild entfernen: ${file.name}`}
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="muted">
        Die ausgewählten Bilder werden beim Senden aus deinem Drive geladen und
        an OpenAI übermittelt. Die Originale bleiben unverändert. Es wird keine
        Kopie in der Bibliothek gespeichert.
      </p>
    </fieldset>
  );
}
