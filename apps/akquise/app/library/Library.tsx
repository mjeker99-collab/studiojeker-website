"use client";
/* eslint-disable @next/next/no-img-element -- Private authenticated asset routes. */
import { useEffect, useState, useRef } from "react";
import type { libraryState } from "@/lib/library/service";
import type { BrandProfile } from "@/lib/library/input";
import Folders, { FolderOptions } from "./Folders";
import { folderLabel, folderPath, folderVisible } from "@/lib/library/tree";
import DriveConnection from "./DriveConnection";
import { uploadProblem } from "@/lib/studio/upload-policy";
export type LibraryState = Awaited<ReturnType<typeof libraryState>>;
export type LibraryEntry = LibraryState["items"][number];
export async function libraryApi(path: string, body?: unknown) {
  const r = await fetch(`/api/library/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(35000),
  });
  const result = await r.json();
  if (!r.ok)
    throw new Error(result.error || "Bibliothek konnte nicht geladen werden.");
  return result;
}
const names: Record<string, string> = {
  IMAGE: "Bilder und Grafiken",
  DOCUMENT: "Dokumente",
  TEXT: "Texte",
  VIDEO: "Videos und Videolinks",
  LINK: "Referenzlinks",
  EXPORT: "Exporte",
  FONT: "Schriften",
};
export function LibraryPicker({
  onSelect,
  onClose,
  imagesOnly = false,
}: {
  onSelect: (item: LibraryEntry) => void;
  onClose: () => void;
  imagesOnly?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  const [state, setState] = useState<LibraryState | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    libraryApi("state")
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section
      ref={dialog}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
        if (e.key === "Tab") {
          const nodes = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]",
            ) || [],
          );
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
      className="library-picker"
      role="dialog"
      aria-modal="true"
      aria-label="Aus Bibliothek wählen"
    >
      <div className="library-picker-inner">
        <button onClick={onClose}>Auswahl schliessen</button>
        <h2>Aus Bibliothek wählen</h2>
        {error && <p role="alert">{error}</p>}
        {state ? (
          <LibraryGrid
            state={state}
            imagesOnly={imagesOnly}
            onSelect={onSelect}
          />
        ) : (
          <p>Lädt …</p>
        )}
      </div>
    </section>
  );
}
function LibraryGrid({
  state,
  onSelect,
  imagesOnly = false,
  folderId: controlledFolder,
  onNavigate,
  trash = false,
  busy = false,
  onMove,
  onRestore,
}: {
  state: LibraryState;
  onSelect: (item: LibraryEntry) => void;
  imagesOnly?: boolean;
  folderId?: string | null;
  onNavigate?: (id: string | null) => void;
  trash?: boolean;
  busy?: boolean;
  onMove?: (items: LibraryEntry[], folderId: string | null) => void;
  onRestore?: (item: LibraryEntry) => void;
}) {
  const [localFolder, setLocalFolder] = useState<string | null>(null);
  const folderId =
    controlledFolder === undefined ? localFolder : controlledFolder;
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [campaign, setCampaign] = useState(""),
    [tag, setTag] = useState(""),
    [customer, setCustomer] = useState(""),
    [project, setProject] = useState(""),
    [archive, setArchive] = useState(false),
    [checked, setChecked] = useState<string[]>([]),
    [target, setTarget] = useState("");
  const global = Boolean(
    query.trim() || kind || campaign || tag || customer || project || archive,
  );
  const matches = state.items.filter(
    (i) =>
      (trash
        ? !!i.deletedAt
        : !i.deletedAt && (archive ? !!i.archivedAt : !i.archivedAt)) &&
      folderVisible(state.folders, i.folderId) &&
      (!imagesOnly || i.asset?.mime.startsWith("image/")) &&
      (!kind || i.kind === kind) &&
      (!campaign || i.campaignId === campaign) &&
      (!customer ||
        folderPath(state.folders, i.folderId).some(
          (f) => f.customerId === customer,
        )) &&
      (!project ||
        folderPath(state.folders, i.folderId).some(
          (f) => f.projectId === project,
        )) &&
      (!tag ||
        i.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))) &&
      `${i.title} ${i.description} ${i.text} ${i.tags.join(" ")} ${folderLabel(state.folders, i.folderId)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const items = matches.filter(
    (i) => trash || global || i.folderId === folderId,
  );
  const recent =
    !folderId && !trash && !global
      ? matches.filter((i) => i.folderId).slice(0, 8)
      : [];
  const navigate = (id: string | null) => {
    setChecked([]);
    setQuery("");
    (onNavigate || setLocalFolder)(id);
  };
  const cards = (list: LibraryEntry[], selectable: boolean) => (
    <div className="library-grid">
      {list.map((i) => (
        <div key={i.id} className="library-entry">
          {selectable && onMove && !trash && (
            <label className="library-select">
              <input
                type="checkbox"
                checked={checked.includes(i.id)}
                aria-label={`${i.title} auswählen`}
                onChange={(e) =>
                  setChecked(
                    e.target.checked
                      ? [...checked, i.id]
                      : checked.filter((id) => id !== i.id),
                  )
                }
              />{" "}
              Auswählen
            </label>
          )}
          <button
            className="library-card"
            disabled={busy}
            draggable={!!onMove && !trash}
            onDragStart={(e) =>
              e.dataTransfer.setData("text/studioone-item", i.id)
            }
            onClick={() => onSelect(i)}
          >
            {i.asset?.mime.startsWith("image/") || i.thumbnailAssetId ? (
              <img
                loading="lazy"
                src={`/api/studio/assets/${i.asset?.mime.startsWith("image/") ? i.asset.id : i.thumbnailAssetId}`}
                alt={i.title}
              />
            ) : (
              <span className="library-type">{names[i.kind]}</span>
            )}
            <strong>{i.title}</strong>
            <span>
              {names[i.kind]} · {i.tags.join(", ") || "Keine Schlagwörter"}
            </span>
            <small>{folderLabel(state.folders, i.folderId)}</small>
            {i.kind === "DOCUMENT" && (
              <small>
                {i.asset?.mime.startsWith("text/plain")
                  ? "Text verfügbar (max. 16 000 Zeichen)"
                  : "Nur abgelegt · kein KI-Text"}
              </small>
            )}
          </button>
          {trash && onRestore && (
            <button disabled={busy} onClick={() => onRestore(i)}>
              Wiederherstellen
            </button>
          )}
        </div>
      ))}
    </div>
  );
  return (
    <>
      {controlledFolder === undefined && (
        <Folders state={state} folderId={folderId} onNavigate={navigate} />
      )}
      <div className="library-filters">
        <label>
          Suche
          <input
            placeholder="In der ganzen Bibliothek suchen"
            value={query}
            onChange={(e) => {
              setChecked([]);
              setQuery(e.target.value);
            }}
          />
        </label>
        <label>
          Inhaltstyp
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Alle Typen</option>
            {Object.entries(names).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kampagne
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
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
          Kunde
          <select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          >
            <option value="">Alle Kunden</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Projekt
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Alle Projekte</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Schlagwort
          <input value={tag} onChange={(e) => setTag(e.target.value)} />
        </label>
        {!trash && (
          <label>
            <input
              type="checkbox"
              checked={archive}
              onChange={(e) => setArchive(e.target.checked)}
            />{" "}
            Archiv anzeigen
          </label>
        )}
      </div>
      {onMove && !trash && (
        <div className="library-move">
          <label>
            <input
              type="checkbox"
              checked={
                items.length > 0 && items.every((i) => checked.includes(i.id))
              }
              onChange={(e) =>
                setChecked(
                  e.target.checked ? items.slice(0, 500).map((i) => i.id) : [],
                )
              }
            />{" "}
            Alle auswählen (max. 500)
          </label>
          {items.some((i) => checked.includes(i.id)) && (
            <>
              <label>
                Verschieben nach
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <FolderOptions state={state} />
                </select>
              </label>
              <button
                disabled={busy}
                onClick={() => {
                  onMove(
                    items.filter((i) => checked.includes(i.id)),
                    target || null,
                  );
                  setChecked([]);
                }}
              >
                Auswahl verschieben
              </button>
            </>
          )}
        </div>
      )}
      <p>
        {items.length} Inhalte
        {global ? " · Suche und Filter gelten für die gesamte Bibliothek" : ""}
      </p>
      {cards(items, true)}
      {!items.length && (
        <p>
          {trash
            ? "Keine einzelnen Dateien im Papierkorb."
            : "Keine passenden Inhalte in diesem Ordner."}
        </p>
      )}
      {recent.length > 0 && (
        <>
          <h3>Zuletzt hinzugefügt</h3>
          {cards(recent, false)}
        </>
      )}
    </>
  );
}

const emptyItem = {
  kind: "TEXT",
  title: "",
  description: "",
  source: "",
  rights: "",
  tags: [] as string[],
  campaignId: null as string | null,
  folderId: null as string | null,
  text: "",
  url: "",
  thumbnailAssetId: null as string | null,
};
export default function Library() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [trash, setTrash] = useState(false);
  const [state, setState] = useState<LibraryState | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState("library");
  const [item, setItem] = useState<
      (typeof emptyItem & { id?: string; revision?: number }) | null
    >(null),
    [selected, setSelected] = useState<LibraryEntry | null>(null),
    [brand, setBrand] = useState<BrandProfile | null>(null),
    [rights, setRights] = useState(false),
    [uploads, setUploads] = useState<string[]>([]);
  const reload = async () => {
    const s = (await libraryApi("state")) as LibraryState;
    setState(s);
    setBrand(s.brand);
  };
  useEffect(() => {
    libraryApi("state")
      .then((s: LibraryState) => {
        setState(s);
        setBrand(s.brand);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anfrage fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length > 8) {
      setError(
        "Höchstens acht Dateien pro Auswahl. Sie werden nacheinander verarbeitet.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setUploads(list.map((f) => `${f.name}: wartet`));
    for (let n = 0; n < list.length; n++) {
      const f = list[n];
      const status = (s: string) =>
        setUploads((old) =>
          old.map((v, j) => (j === n ? `${f.name}: ${s}` : v)),
        );
      try {
        const problem = uploadProblem(f.name, f.size);
        if (problem) throw new Error(problem);
        status("wird geprüft und gespeichert");
        const kind = /\.(ttf|otf)$/i.test(f.name)
          ? "FONT"
          : /\.(pdf|txt)$/i.test(f.name)
            ? "DOCUMENT"
            : "ORIGINAL";
        const r = await fetch("/api/studio/upload", {
          method: "POST",
          headers: {
            "x-rights-confirmed": "true",
            "x-studio-kind": kind,
            "x-file-name": encodeURIComponent(f.name),
            ...(folderId ? { "x-library-folder": folderId } : {}),
          },
          body: f,
          signal: AbortSignal.timeout(180000),
        });
        const a = await r.json();
        if (!r.ok) throw new Error(a.error);
        status(
          a.reused
            ? `Identische Datei vorhanden · wiederverwendet · ${a.existingInTrash ? "im Papierkorb" : folderLabel(state?.folders || [], a.existingFolderId ?? null)}`
            : "gespeichert",
        );
      } catch (e) {
        status(e instanceof Error ? e.message : "Upload fehlgeschlagen");
      }
    }
    try {
      await reload();
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }
  if (!state || !brand)
    return <p role="status">{error || "Bibliothek lädt …"}</p>;
  return (
    <div className="library">
      {view === "library" && <DriveConnection />}
      <div className="section-head">
        <div>
          <p className="eyebrow">STUDIOONE / INHALTE</p>
          <h2>{view === "brand" ? "Markenprofil" : "Bibliothek"}</h2>
        </div>
        <div>
          <button
            disabled={busy}
            onClick={() => {
              setView("library");
              setItem(null);
            }}
          >
            Bibliothek
          </button>{" "}
          <button
            disabled={busy}
            onClick={() => {
              setView("brand");
              setItem(null);
            }}
          >
            Markenprofil Studiojeker
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {view === "brand" ? (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await libraryApi("brand", {
                ...brand,
                revision: state.brandRevision,
              });
              setNotice(
                "Markenprofil gespeichert. Bestehende Beiträge behalten ihren bisherigen Markenstand.",
              );
            });
          }}
        >
          <h2>Inhaltsmarke Studiojeker · Version {state.brandRevision}</h2>
          <p>
            StudioONE ist die Plattformmarke. Ihr Logo wird nicht auf
            Kundenbeiträge übertragen. Leere Felder sind offen; es werden keine
            Angaben erfunden.
          </p>
          <div className="library-preview">
            <img
              src={
                brand.logoAssetId
                  ? `/api/studio/assets/${brand.logoAssetId}`
                  : "/api/studio/logo"
              }
              alt="Originales Studiojeker-Inhaltslogo"
            />
          </div>
          <div className="form-grid">
            <label>
              Original-Logo
              <select
                value={brand.logoAssetId || ""}
                onChange={(e) =>
                  setBrand({ ...brand, logoAssetId: e.target.value || null })
                }
              >
                <option value="">Mitgeliefertes Studiojeker-Original</option>
                {state.items
                  .filter(
                    (i) =>
                      i.asset?.mime.startsWith("image/") &&
                      !i.archivedAt &&
                      !i.deletedAt &&
                      folderVisible(state.folders, i.folderId),
                  )
                  .map((i) => (
                    <option key={i.id} value={i.assetId!}>
                      {i.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Lizenzierte Schrift
              <select
                value={brand.fontAssetId || ""}
                onChange={(e) =>
                  setBrand({ ...brand, fontAssetId: e.target.value || null })
                }
              >
                <option value="">Offen · keine Ersatzschrift</option>
                {state.items
                  .filter(
                    (i) =>
                      i.kind === "FONT" &&
                      !i.archivedAt &&
                      !i.deletedAt &&
                      folderVisible(state.folders, i.folderId),
                  )
                  .map((i) => (
                    <option key={i.id} value={i.assetId!}>
                      {i.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Schriftlizenz / Nachweis
              <input
                value={brand.fontLicense}
                onChange={(e) =>
                  setBrand({ ...brand, fontLicense: e.target.value })
                }
              />
            </label>
            <label>
              Ansprache
              <select
                value={brand.address}
                onChange={(e) =>
                  setBrand({
                    ...brand,
                    address: e.target.value as BrandProfile["address"],
                  })
                }
              >
                <option value="OFFEN">Offen</option>
                <option value="DU">Du</option>
                <option value="SIE">Sie</option>
              </select>
            </label>
            {(["black", "white", "cyan"] as const).map((k) => (
              <label key={k}>
                Farbe {k}
                <input
                  value={brand.colors[k]}
                  pattern="#[0-9a-fA-F]{6}"
                  onChange={(e) =>
                    setBrand({
                      ...brand,
                      colors: { ...brand.colors, [k]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          {(
            [
              ["claim", "Claim"],
              ["tone", "Tonalität"],
              ["services", "Freigegebene Leistungen"],
              ["audiences", "Zielgruppen"],
              ["examples", "Freigegebene Beispieltexte"],
            ] as const
          ).map(([k, label]) => (
            <label key={k}>
              {label}
              <textarea
                value={brand[k]}
                placeholder="Offen"
                onChange={(e) => setBrand({ ...brand, [k]: e.target.value })}
              />
            </label>
          ))}
          <fieldset>
            <legend>Freigegebene Logo-Varianten</legend>
            {state.items
              .filter(
                (i) =>
                  i.asset?.mime.startsWith("image/") &&
                  !i.archivedAt &&
                  !i.deletedAt &&
                  folderVisible(state.folders, i.folderId),
              )
              .map((i) => (
                <label key={i.id}>
                  <input
                    type="checkbox"
                    checked={brand.logoVariants.includes(i.assetId!)}
                    onChange={(e) =>
                      setBrand({
                        ...brand,
                        logoVariants: e.target.checked
                          ? [...brand.logoVariants, i.assetId!]
                          : brand.logoVariants.filter((id) => id !== i.assetId),
                      })
                    }
                  />
                  {i.title}
                </label>
              ))}
          </fieldset>
          <p>
            Schweizer Schreibweise (ss) · Schriftdateien und Logos in der
            Bibliothek hochladen. Schrift ohne Lizenznachweis kann nicht als
            Markenschrift gespeichert werden.
          </p>
          <button disabled={busy}>Markenprofil speichern</button>
        </form>
      ) : (
        <>
          <Folders
            state={state}
            folderId={folderId}
            busy={busy}
            action={action}
            trash={trash}
            onTrash={(value) => {
              setTrash(value);
              setItem(null);
              setSelected(null);
            }}
            onNavigate={(id) => {
              setFolderId(id);
              setItem(null);
              setSelected(null);
            }}
            onDrop={(id, target) => {
              const entry = state.items.find((i) => i.id === id);
              if (!entry || busy) return;
              void action(async () => {
                await libraryApi("move", {
                  items: [{ id: entry.id, revision: entry.revision }],
                  folderId: target,
                });
                setNotice("Datei verschoben.");
              });
            }}
          />
          {!trash && (
            <section className="panel">
              <h2>Inhalte hinzufügen</h2>
              <p>Ablageort: {folderLabel(state.folders, folderId)}</p>
              <p>
                Bilder (JPEG, PNG, WebP), PDF, TXT und TTF/OTF bis 8 MB; Videos
                (MP4, M4V, MOV) bis 64 MB. Höchstens 8 Dateien je Auswahl.
                Originale bleiben unverändert.
              </p>
              {state.config.storage === "DISCONNECTED" && (
                <p role="status">
                  Privater Speicher nicht verbunden. Fehlende Einstellungen:{" "}
                  {state.config.missingStorage.join(", ") ||
                    "S3-Verbindung prüfen"}
                  . Texte und Links können bereits gespeichert werden.
                </p>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={rights}
                  onChange={(e) => setRights(e.target.checked)}
                />{" "}
                Ich darf die Dateien und Schriften für diese Zwecke verwenden.
              </label>
              <label>
                Dateien hochladen
                <input
                  type="file"
                  multiple
                  // No accept filter: iPad Drive providers can label valid media
                  // as generic files. Validate after selection and on the server.
                  disabled={
                    busy || !rights || state.config.storage === "DISCONNECTED"
                  }
                  onChange={(e) => {
                    void upload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <ul aria-live="polite">
                {uploads.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <button
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setItem({ ...emptyItem, folderId });
                }}
              >
                Text erfassen
              </button>{" "}
              <button
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setItem({ ...emptyItem, kind: "LINK", folderId });
                }}
              >
                Link hinzufügen
              </button>
            </section>
          )}
          {item ? (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  await libraryApi("item", {
                    ...item,
                    tags: item.tags.filter(Boolean),
                  });
                  setItem(null);
                  setSelected(null);
                  setNotice("Bibliotheksinhalt gespeichert.");
                });
              }}
            >
              <h2>{item.id ? "Inhalt bearbeiten" : "Neuer Inhalt"}</h2>
              {!item.id && (
                <label>
                  Inhaltstyp
                  <select
                    aria-label="Inhaltstyp erfassen"
                    value={item.kind}
                    onChange={(e) => setItem({ ...item, kind: e.target.value })}
                  >
                    <option value="TEXT">Text</option>
                    <option value="LINK">Referenzlink</option>
                    <option value="VIDEO">Videolink (z. B. Vimeo)</option>
                  </select>
                </label>
              )}
              {selected?.asset?.mime.startsWith("image/") && (
                <div className="library-preview">
                  <img
                    src={`/api/studio/assets/${selected.assetId}`}
                    alt={selected.title}
                  />
                </div>
              )}
              {(
                [
                  ["title", "Titel"],
                  ["description", "Beschreibung"],
                  ["source", "Quelle / Herkunft"],
                  ["rights", "Rechte / Lizenznachweis"],
                ] as const
              ).map(([k, label]) => (
                <label key={k}>
                  {label}
                  <input
                    required={k === "title"}
                    value={item[k]}
                    onChange={(e) => setItem({ ...item, [k]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Ablageordner
                <select
                  value={item.folderId || ""}
                  onChange={(e) =>
                    setItem({ ...item, folderId: e.target.value || null })
                  }
                >
                  <FolderOptions state={state} />
                </select>
              </label>
              <label>
                Schlagwörter (mit Komma trennen)
                <input
                  value={item.tags.join(",")}
                  onChange={(e) =>
                    setItem({
                      ...item,
                      tags: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                />
              </label>
              <label>
                Kampagne
                <select
                  value={item.campaignId || ""}
                  onChange={(e) =>
                    setItem({ ...item, campaignId: e.target.value || null })
                  }
                >
                  <option value="">Ohne Kampagne</option>
                  {state.campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              {["LINK", "VIDEO"].includes(item.kind) && !selected?.asset && (
                <>
                  <label>
                    HTTPS-Link
                    <input
                      type="url"
                      required
                      value={item.url}
                      onChange={(e) =>
                        setItem({ ...item, url: e.target.value })
                      }
                    />
                  </label>
                  <p>
                    Nur Referenz · keine Verbindung zu Google Drive, kein Abruf,
                    keine automatische KI-Analyse.
                  </p>
                  <label>
                    Eigenes Vorschaubild
                    <select
                      value={item.thumbnailAssetId || ""}
                      onChange={(e) =>
                        setItem({
                          ...item,
                          thumbnailAssetId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Keines</option>
                      {state.items
                        .filter(
                          (i) =>
                            i.asset?.mime.startsWith("image/") &&
                            !i.archivedAt &&
                            !i.deletedAt &&
                            folderVisible(state.folders, i.folderId),
                        )
                        .map((i) => (
                          <option key={i.id} value={i.assetId!}>
                            {i.title}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              )}
              {item.kind === "TEXT" && (
                <label>
                  Text
                  <textarea
                    required
                    rows={8}
                    maxLength={16000}
                    value={item.text}
                    onChange={(e) => setItem({ ...item, text: e.target.value })}
                  />
                </label>
              )}
              {item.kind === "DOCUMENT" && (
                <p>
                  {selected?.asset?.mime.startsWith("text/plain")
                    ? "UTF-8-Text ist für ausdrücklich ausgewählte KI-Referenzen verfügbar (maximal 16 000 Zeichen)."
                    : "PDF nur abgelegt. Kein Text extrahiert und keine KI-Analyse durchgeführt."}
                </p>
              )}
              {selected?.asset && (
                <a href={`/api/studio/assets/${selected.assetId}?download`}>
                  Original herunterladen
                </a>
              )}
              {selected?.url && (
                <p>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Referenz öffnen
                  </a>
                </p>
              )}
              {selected?.parentAssetId && (
                <p>Abgeleitet von Asset {selected.parentAssetId}</p>
              )}
              {selected && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `«${selected.title}» in den Papierkorb verschieben? Bestehende Verwendungen bleiben erhalten.`,
                        )
                      )
                        return;
                      void action(async () => {
                        await libraryApi("trash", {
                          id: selected.id,
                          revision: selected.revision,
                          type: "item",
                          restore: false,
                        });
                        setItem(null);
                        setSelected(null);
                        setNotice("In den Papierkorb verschoben.");
                      });
                    }}
                  >
                    Inhalt löschen
                  </button>
                  <h3>Verwendung in Beiträgen</h3>
                  {selected.usage.length ? (
                    <ul>
                      {selected.usage.map((u) => (
                        <li key={`${u.id}-${u.version}`}>
                          {u.title} · Version {u.version}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Noch keine Verwendung als Motiv, Schrift oder Markenlogo.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await libraryApi("archive", {
                          id: selected.id,
                          revision: selected.revision,
                          archived: !selected.archivedAt,
                        });
                        setItem(null);
                        setSelected(null);
                      })
                    }
                  >
                    {selected.archivedAt ? "Wiederherstellen" : "Archivieren"}
                  </button>
                  <p>
                    Archivieren erhält die Originaldatei und historische
                    Versionen.
                  </p>
                </>
              )}
              <div>
                <button disabled={busy}>Speichern</button>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setItem(null);
                    setSelected(null);
                  }}
                >
                  Schliessen
                </button>
              </div>
            </form>
          ) : null}
          <LibraryGrid
            key={`${folderId}-${trash}`}
            state={state}
            folderId={folderId}
            trash={trash}
            busy={busy}
            onMove={(items, target) =>
              void action(async () => {
                await libraryApi("move", {
                  items: items.map((i) => ({ id: i.id, revision: i.revision })),
                  folderId: target,
                });
                setItem(null);
                setSelected(null);
                setNotice("Auswahl verschoben.");
              })
            }
            onRestore={(i) =>
              void action(async () => {
                await libraryApi("trash", {
                  id: i.id,
                  revision: i.revision,
                  type: "item",
                  restore: true,
                });
                setNotice("Inhalt wiederhergestellt.");
              })
            }
            onSelect={(i) => {
              if (busy || trash) return;
              setSelected(i);
              setItem({
                id: i.id,
                revision: i.revision,
                kind: i.kind,
                title: i.title,
                description: i.description,
                source: i.source,
                rights: i.rights,
                tags: i.tags,
                campaignId: i.campaignId,
                folderId: i.folderId,
                text: i.text,
                url: i.url,
                thumbnailAssetId: i.thumbnailAssetId,
              });
            }}
          />
        </>
      )}
    </div>
  );
}
