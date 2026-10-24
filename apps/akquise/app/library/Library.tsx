"use client";
/* eslint-disable @next/next/no-img-element -- Private authenticated asset routes. */
import { useEffect, useState, useRef } from "react";
import type { libraryState } from "@/lib/library/service";
import type { BrandProfile } from "@/lib/library/input";
import DriveConnection from "./DriveConnection";
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
  VIDEO: "Videolinks",
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
}: {
  state: LibraryState;
  onSelect: (item: LibraryEntry) => void;
  imagesOnly?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [campaign, setCampaign] = useState(""),
    [tag, setTag] = useState(""),
    [archive, setArchive] = useState(false);
  const items = state.items.filter(
    (i) =>
      (archive ? !!i.archivedAt : !i.archivedAt) &&
      (!imagesOnly || i.asset?.mime.startsWith("image/")) &&
      (!kind || i.kind === kind) &&
      (!campaign || i.campaignId === campaign) &&
      (!tag ||
        i.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))) &&
      `${i.title} ${i.description} ${i.text} ${i.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="library-filters">
        <label>
          Suche
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
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
          Marke/Kunde
          <select aria-label="Marke/Kunde">
            <option>{state.organization.name}</option>
          </select>
        </label>
        <label>
          Schlagwort
          <input value={tag} onChange={(e) => setTag(e.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
          />{" "}
          Archiv anzeigen
        </label>
      </div>
      <p>
        {items.length} Inhalte · Nur interner Studiojeker-Bereich. Kundenzugänge
        sind nicht freigeschaltet.
      </p>
      <div className="library-grid">
        {items.map((i) => (
          <button
            className="library-card"
            key={i.id}
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
            {i.kind === "DOCUMENT" && (
              <small>
                {i.asset?.mime.startsWith("text/plain")
                  ? "Text verfügbar (max. 16 000 Zeichen)"
                  : "Nur abgelegt · kein KI-Text"}
              </small>
            )}
          </button>
        ))}
      </div>
      {!items.length && <p>Keine passenden Inhalte.</p>}
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
  text: "",
  url: "",
  thumbnailAssetId: null as string | null,
};
export default function Library() {
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
        if (f.size > 8 * 1024 * 1024) throw new Error("Maximal 8 MB");
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
          },
          body: f,
          signal: AbortSignal.timeout(35000),
        });
        const a = await r.json();
        if (!r.ok) throw new Error(a.error);
        status(
          a.reused
            ? "Identische Datei vorhanden · wiederverwendet"
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
                    (i) => i.asset?.mime.startsWith("image/") && !i.archivedAt,
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
                  .filter((i) => i.kind === "FONT" && !i.archivedAt)
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
                (i) => i.asset?.mime.startsWith("image/") && !i.archivedAt,
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
          <section className="panel">
            <h2>Inhalte hinzufügen</h2>
            <p>
              JPEG, PNG, WebP, PDF, TXT, TTF/OTF · höchstens 8 MB je Datei und 8
              Dateien je Auswahl. Originale bleiben unverändert.
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
                accept="image/jpeg,image/png,image/webp,.pdf,.txt,.ttf,.otf"
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
                setItem({ ...emptyItem });
              }}
            >
              Text erfassen
            </button>{" "}
            <button
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setItem({ ...emptyItem, kind: "LINK" });
              }}
            >
              Link hinzufügen
            </button>
          </section>
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
              {["LINK", "VIDEO"].includes(item.kind) && (
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
                            i.asset?.mime.startsWith("image/") && !i.archivedAt,
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
            state={state}
            onSelect={(i) => {
              if (busy) return;
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
