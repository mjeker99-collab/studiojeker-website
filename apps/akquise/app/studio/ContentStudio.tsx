"use client";
import StudioChat from "./StudioChat";
/* eslint-disable @next/next/no-img-element -- Authenticated private image routes do not use a public image loader. */
import {
  LibraryPicker,
  libraryApi,
  type LibraryEntry,
} from "../library/Library";
import { useEffect, useState } from "react";
import { contentInput, type ContentInput } from "@/lib/hub/input";
import {
  briefingSchema,
  studioChannels,
  formats,
  type Briefing,
  type StudioSnapshot,
  type StudioFormat,
} from "@/lib/studio/input";
import { displayTime, zurichInstant, zurichInput } from "@/lib/hub/time";
import type { studioState } from "@/lib/studio/service";
type State = Awaited<ReturnType<typeof studioState>>;
type Series = State["series"][number];
type Content = Series["contents"][number];
const blank: Briefing = {
  title: "",
  topic: "",
  offer: "",
  goal: "",
  audience: "",
  tone: "Persönlich, professionell, Schweizer Hochdeutsch",
  channels: ["LINKEDIN", "INSTAGRAM", "FACEBOOK"],
  count: 1,
  formats: ["1:1"],
  campaignId: null,
  customerId: null,
  referenceAssetIds: [],
};
async function api(path: string, body?: unknown) {
  const r = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(115000),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "Anfrage fehlgeschlagen.");
  return result;
}
const statusLabel: Record<string, string> = {
  DRAFT: "Entwurf",
  IN_REVIEW: "In Prüfung",
  APPROVED: "Freigegeben",
  DONE: "Erledigt",
  QUEUED: "Wartet auf Start",
  RUNNING: "Läuft",
  SUCCEEDED: "Ergebnis bereit",
  APPLIED: "Übernommen",
  FAILED: "Fehler",
  UNKNOWN: "Ergebnis/Kosten unklar",
  CANCELLED: "Abgebrochen",
};
export default function ContentStudio({ userId }: { userId: string }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState<Briefing>(blank),
    [creating, setCreating] = useState(false),
    [seriesId, setSeriesId] = useState(""),
    [editing, setEditing] = useState<Content | null>(null),
    [form, setForm] = useState<ContentInput | null>(null);
  const [rights, setRights] = useState(false),
    [transfer, setTransfer] = useState(false),
    [costs, setCosts] = useState(false),
    [refs, setRefs] = useState<string[]>([]),
    [read, setRead] = useState(false),
    [preview, setPreview] = useState(""),
    [format, setFormat] = useState<StudioFormat>("1:1"),
    [encoding, setEncoding] = useState<"png" | "jpg">("png");
  const [picking, setPicking] = useState<"motif" | "reference" | null>(null);
  const [libraryRefs, setLibraryRefs] = useState<LibraryEntry[]>([]);
  const dirty = !!(
    editing &&
    form &&
    JSON.stringify(form) !==
      JSON.stringify(contentInput.parse(editing.versions[0].payload))
  );
  async function refresh(selectId?: string, selectSeries?: string) {
    const s: State = await api("studio/state");
    setState(s);
    if (selectId || selectSeries) {
      const series = s.series.find((x) =>
        selectSeries
          ? x.id === selectSeries
          : x.contents.some((c) => c.id === selectId),
      );
      const c = series?.contents.find((x) =>
        selectId ? x.id === selectId : true,
      );
      if (c) {
        setSeriesId(series!.id);
        setEditing(c);
        setForm(contentInput.parse(c.versions[0].payload));
        setRead(false);
        setPreview("");
      }
    }
  }
  useEffect(() => {
    let live = true;
    api("studio/state")
      .then((s) => {
        if (live) setState(s);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verarbeitung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  function select(series: Series, c: Content) {
    if (dirty && !window.confirm("Ungespeicherte Eingaben verlassen?")) return;
    setSeriesId(series.id);
    setEditing(c);
    setForm(contentInput.parse(c.versions[0].payload));
    setRead(false);
    setPreview("");
    setCreating(false);
    setRefs([]);
    setTransfer(false);
  }
  function update(data: Partial<ContentInput>) {
    setForm((p) =>
      p
        ? {
            ...p,
            ...data,
            ...("scheduledAt" in data
              ? {
                  variants: p.variants.map((v) => ({
                    ...v,
                    scheduledAt: data.scheduledAt ?? null,
                  })),
                }
              : {}),
          }
        : p,
    );
    setRead(false);
    setPreview("");
  }
  function studio(data: Partial<StudioSnapshot>) {
    if (form?.studio) update({ studio: { ...form.studio, ...data } });
  }
  async function upload(file: File) {
    if (!rights)
      throw new Error("Bitte Nutzungsrechte an der Datei bestätigen.");
    if (file.size > 8 * 1024 * 1024)
      throw new Error("Maximale Dateigrösse: 8 MB.");
    const font = /\.(ttf|otf)$/i.test(file.name);
    const r = await fetch("/api/studio/upload", {
      method: "POST",
      headers: {
        "x-file-name": encodeURIComponent(file.name),
        "x-studio-kind": font ? "FONT" : "ORIGINAL",
        "x-rights-confirmed": "true",
      },
      body: file,
      signal: AbortSignal.timeout(30000),
    });
    const a = await r.json();
    if (!r.ok) throw new Error(a.error || "Upload fehlgeschlagen.");
    await refresh();
    setNotice(`${file.name} privat gespeichert.`);
  }
  async function generate(kind: "TEXT" | "IMAGE") {
    if (!state || !editing) return;
    if (dirty) throw new Error("Zuerst Änderungen speichern.");
    const job = await api("studio/jobs", {
      seriesId,
      kind,
      contentId: kind === "IMAGE" ? editing.id : null,
      requestKey: crypto.randomUUID(),
      referenceIds: kind === "IMAGE" ? refs : [],
      referenceRights: rights,
      referenceTransfer: transfer,
      confirmedCosts: costs,
    });
    await refresh();
    await api(`studio/run/${job.id}`, { confirmedCosts: true });
    await refresh();
    setNotice(
      "Auftragsstatus aktualisiert. Erfolgreiches Ergebnis gezielt übernehmen.",
    );
  }
  function download(text: string, name: string) {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const series = state?.series.find((s) => s.id === seriesId),
    snapshot = form?.studio;
  const originalAssets =
    state?.assets.filter((a) => a.kind === "ORIGINAL") || [];
  const imageAssets =
    state?.assets.filter(
      (a) => a.mime.startsWith("image/") && a.kind !== "EXPORT",
    ) || [];
  if (!state)
    return <p role="status">{error || "Content-Studio wird geladen …"}</p>;
  return (
    <div className="studio-workspace">
      <StudioChat state={state} refresh={() => refresh()} />
      {picking && (
        <LibraryPicker
          imagesOnly={picking === "motif"}
          onClose={() => setPicking(null)}
          onSelect={(i) => {
            if (
              picking === "motif" &&
              form?.studio &&
              i.asset?.mime.startsWith("image/")
            ) {
              update({
                studio: {
                  ...form.studio,
                  motifAssetId: i.asset.id,
                  motifSha256: i.asset.sha256,
                  source: i.asset.kind === "MOTIF" ? "AI" : "OWN",
                },
                variants: form.variants.map((v) => ({
                  ...v,
                  mediaType: "IMAGE",
                  mediaUrl: "",
                  mediaReference: `Studio-Asset ${i.asset!.id} · ${i.asset!.sha256}`,
                })),
              });
            } else if (picking === "reference") {
              if (
                i.asset?.mime.startsWith("image/") &&
                ["ORIGINAL", "MOTIF", "EXPORT"].includes(i.asset.kind)
              )
                setBrief({
                  ...brief,
                  referenceAssetIds: Array.from(
                    new Set([...brief.referenceAssetIds, i.asset.id]),
                  ).slice(0, 4),
                });
              else {
                setLibraryRefs((old) =>
                  Array.from(
                    new Map([...old, i].map((x) => [x.id, x])).values(),
                  ).slice(0, 4),
                );
                setBrief({
                  ...brief,
                  libraryReferenceIds: Array.from(
                    new Set([...(brief.libraryReferenceIds || []), i.id]),
                  ).slice(0, 4),
                });
              }
            }
            setPicking(null);
          }}
        />
      )}

      <div className="hub-toolbar">
        <div>
          <p className="eyebrow">STUDIOONE / CONTENT-STUDIO</p>
          <p>
            Briefing → Ideen → Bild & Text → Layout → Prüfung → Export & Planung
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            if (dirty && !window.confirm("Ungespeicherte Eingaben verlassen?"))
              return;
            setCreating(true);
            setForm(null);
            setEditing(null);
            setBrief(blank);
          }}
        >
          Neues Briefing
        </button>
      </div>
      <div className="studio-connections">
        <span>
          Text & Bild:{" "}
          <strong>
            {state.config.connected ? "OpenAI konfiguriert" : "Nicht verbunden"}
          </strong>
        </span>
        <span>
          Privater Speicher:{" "}
          <strong>
            {state.config.storage === "LOCAL"
              ? "Lokal · nur Entwicklung"
              : state.config.storage === "S3"
                ? "S3 konfiguriert"
                : "Nicht verbunden"}
          </strong>
        </span>
        <span>
          Veröffentlichung: <strong>Nicht verbunden</strong>
        </span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <details className="studio-upload">
        <summary>Eigene Bilder und freigegebene Schriftdateien</summary>
        <p>
          JPEG, PNG oder WebP bis 8 MB / 20 Megapixel. TTF/OTF nur mit
          entsprechender Lizenz. Uploads bleiben privat. Sie werden ohne
          gesonderten Generierungsauftrag nicht an OpenAI übermittelt.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={rights}
            onChange={(e) => setRights(e.target.checked)}
          />
          Ich darf diese Dateien für Studiojeker verwenden.
        </label>
        <label>
          Datei hochladen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.ttf,.otf"
            disabled={busy || state.config.storage === "DISCONNECTED"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void act(() => upload(file));
              e.target.value = "";
            }}
          />
        </label>
      </details>
      {creating && (
        <form
          className="studio-brief"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const b = briefingSchema.parse(brief);
              const s = await api("studio/series", b);
              await refresh(undefined, s.id);
              setCreating(false);
              setNotice(
                "Serie als eigene Entwürfe gespeichert. Noch keine KI-Generierung gestartet.",
              );
            });
          }}
        >
          <h2>Briefing</h2>
          <div className="studio-fields">
            {(
              [
                ["title", "Serientitel"],
                ["topic", "Thema"],
                ["offer", "Angebot · ausschliesslich belegte Angaben"],
                ["goal", "Kommunikationsziel"],
                ["audience", "Zielgruppe"],
                ["tone", "Tonalität"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  required={key !== "offer"}
                  rows={key === "offer" || key === "topic" ? 3 : 2}
                  value={brief[key]}
                  onChange={(e) =>
                    setBrief({ ...brief, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Anzahl Beiträge
              <input
                type="number"
                min={1}
                max={6}
                value={brief.count}
                onChange={(e) =>
                  setBrief({ ...brief, count: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Kunde
              <select
                value={brief.customerId || ""}
                onChange={(e) =>
                  setBrief({
                    ...brief,
                    customerId: e.target.value || null,
                    campaignId: null,
                  })
                }
              >
                <option value="">Intern / nicht zugeordnet</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kampagne
              <select
                value={brief.campaignId || ""}
                onChange={(e) =>
                  setBrief({ ...brief, campaignId: e.target.value || null })
                }
              >
                <option value="">Ohne Kampagne</option>
                {state.campaigns
                  .filter((c) => c.customerId === brief.customerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>Kanäle</legend>
            {studioChannels.map((c) => (
              <label className="check" key={c}>
                <input
                  type="checkbox"
                  checked={brief.channels.includes(c)}
                  onChange={(e) =>
                    setBrief({
                      ...brief,
                      channels: e.target.checked
                        ? [...brief.channels, c]
                        : brief.channels.filter((x) => x !== c),
                    })
                  }
                />
                {c}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Formate</legend>
            {formats.map((f) => (
              <label className="check" key={f}>
                <input
                  type="checkbox"
                  checked={brief.formats.includes(f)}
                  onChange={(e) =>
                    setBrief({
                      ...brief,
                      formats: e.target.checked
                        ? [...brief.formats, f]
                        : brief.formats.filter((x) => x !== f),
                    })
                  }
                />
                {f}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Optionale eigene Referenzbilder</legend>
            <button type="button" onClick={() => setPicking("reference")}>
              Aus Bibliothek wählen · Referenzen
            </button>
            {libraryRefs.map((r) => (
              <p key={r.id}>
                {r.title} ·{" "}
                {r.text
                  ? "Text für KI ausgewählt"
                  : "Nur Referenz, kein Text verfügbar"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setLibraryRefs((old) => old.filter((x) => x.id !== r.id));
                    setBrief({
                      ...brief,
                      libraryReferenceIds: (
                        brief.libraryReferenceIds || []
                      ).filter((id) => id !== r.id),
                    });
                  }}
                >
                  Entfernen
                </button>
              </p>
            ))}
            <p>
              PDF, Vimeo und Drive werden nicht automatisch gelesen. Nur
              ausdrücklich ausgewählte Textinhalte werden übermittelt.
            </p>
            <fieldset>
              <legend>Markenregeln für KI auswählen</legend>
              {(
                [
                  "tone",
                  "services",
                  "audiences",
                  "examples",
                  "address",
                ] as const
              ).map((k) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={(brief.brandRules || []).includes(k)}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        brandRules: e.target.checked
                          ? [...(brief.brandRules || []), k]
                          : (brief.brandRules || []).filter((v) => v !== k),
                      })
                    }
                  />
                  {
                    {
                      tone: "Tonalität",
                      services: "Leistungen",
                      audiences: "Zielgruppen",
                      examples: "Beispieltexte",
                      address: "Ansprache",
                    }[k]
                  }
                </label>
              ))}
            </fieldset>
            {originalAssets.map((a) => (
              <label className="check" key={a.id}>
                <input
                  type="checkbox"
                  checked={brief.referenceAssetIds.includes(a.id)}
                  disabled={
                    !brief.referenceAssetIds.includes(a.id) &&
                    brief.referenceAssetIds.length >= 4
                  }
                  onChange={(e) =>
                    setBrief({
                      ...brief,
                      referenceAssetIds: e.target.checked
                        ? [...brief.referenceAssetIds, a.id]
                        : brief.referenceAssetIds.filter((x) => x !== a.id),
                    })
                  }
                />
                {a.name}
              </label>
            ))}
          </fieldset>
          <button disabled={busy}>
            Briefing und Entwürfe speichern · kostenlos
          </button>
        </form>
      )}
      <div className="studio-columns">
        <aside className="studio-series" aria-label="Beitragsserien">
          <h2>Serien</h2>
          {!state.series.length && (
            <p>Noch keine Serie. Mit einem Briefing beginnen.</p>
          )}
          {state.series.map((s) => (
            <section key={s.id}>
              <h3>{s.title}</h3>
              {s.contents.map((c, i) => (
                <button
                  className={`secondary ${editing?.id === c.id ? "studio-active" : ""}`}
                  key={c.id}
                  disabled={busy}
                  onClick={() => select(s, c)}
                >
                  <span>
                    {String(i + 1).padStart(2, "0")} · {c.title}
                  </span>
                  <small>
                    {statusLabel[c.status]} · V{c.version}
                  </small>
                </button>
              ))}
            </section>
          ))}
        </aside>
        {form && snapshot && editing && series ? (
          <section className="studio-editor" aria-label="Beitragseditor">
            <div className="hub-toolbar">
              <h2>{form.title}</h2>
              <span className="badge">
                {statusLabel[editing.status]} · V{editing.version}
                {dirty ? " · ungespeichert" : ""}
              </span>
            </div>
            <details>
              <summary>Gespeichertes Briefing</summary>
              <dl>
                {Object.entries(briefingSchema.parse(series.briefing))
                  .filter(
                    ([k]) => !["referenceAssetIds", "campaignId"].includes(k),
                  )
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                    </div>
                  ))}
              </dl>
            </details>
            <section className="studio-generation">
              <h3>KI-Auftrag ausdrücklich starten</h3>
              <p>{state.config.costNote}</p>
              <details>
                <summary>Welche Inhalte werden an OpenAI übertragen?</summary>
                <p>
                  Textauftrag: gespeichertes Briefing, ausdrücklich ausgewählte
                  Markenregeln und ausgewählte Texte/TXT-Auszüge. Keine PDF-
                  oder Linkanalyse, keine gesamte Bibliothek. Bildauftrag:
                  Bildidee und unten ausgewählte Bildreferenzen.
                </p>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(
                    {
                      briefing: series.briefing,
                      markenregeln: Object.fromEntries(
                        (
                          briefingSchema.parse(series.briefing).brandRules || []
                        ).map((k) => [
                          k,
                          snapshot.brandProfile?.[k] || "Offen",
                        ]),
                      ),
                    },
                    null,
                    2,
                  )}
                </pre>
                <button
                  type="button"
                  onClick={() =>
                    void libraryApi("state")
                      .then((s) =>
                        setLibraryRefs(
                          s.items.filter((i: LibraryEntry) =>
                            (
                              briefingSchema.parse(series.briefing)
                                .libraryReferenceIds || []
                            ).includes(i.id),
                          ),
                        ),
                      )
                      .catch((e) => setError(e.message))
                  }
                >
                  Ausgewählte Bibliothekstexte anzeigen
                </button>
                {libraryRefs
                  .filter((r) =>
                    (
                      briefingSchema.parse(series.briefing)
                        .libraryReferenceIds || []
                    ).includes(r.id),
                  )
                  .map((r) => (
                    <div key={r.id}>
                      <strong>{r.title}</strong>
                      <pre style={{ whiteSpace: "pre-wrap" }}>
                        {r.text || "Kein Text verfügbar; keine Analyse."}
                      </pre>
                    </div>
                  ))}
              </details>
              <p>
                Textauftrag: {series.contents.length} Beitrag/Beiträge,
                Budgetreservierung USD {state.config.textReserve.toFixed(2)}.
                Bildauftrag: 1 Motiv, USD {state.config.imageReserve.toFixed(2)}
                . Tageslimit: {state.config.dailyRequests} Aufträge / USD{" "}
                {state.config.dailyBudget.toFixed(2)} Reservierungen (UTC).
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={costs}
                  onChange={(e) => setCosts(e.target.checked)}
                />
                Ich starte bewusst einen kostenpflichtigen API-Auftrag. Die
                tatsächlichen Kosten hängen vom Modell und Verbrauch ab.
              </label>
              <div className="actions">
                <button
                  disabled={busy || dirty || !costs || !state.config.connected}
                  onClick={() => void act(() => generate("TEXT"))}
                >
                  Ideen & Kanaltexte erstellen
                </button>
                <button
                  disabled={
                    busy ||
                    dirty ||
                    !costs ||
                    !state.config.connected ||
                    state.config.storage === "DISCONNECTED" ||
                    !snapshot.imageIdea ||
                    (refs.length > 0 && (!rights || !transfer))
                  }
                  onClick={() => void act(() => generate("IMAGE"))}
                >
                  Ein Bildmotiv erstellen
                </button>
              </div>
              <p className="muted">
                Modell: {state.config.textModel} / {state.config.imageModel}.
                Ohne API-Zugang bleiben eigene Inhalte, Layouts und Planung
                nutzbar.
              </p>
              <fieldset>
                <legend>
                  Bewusst ausgewählte Bildreferenzen für diesen Bildauftrag
                </legend>
                {briefingSchema
                  .parse(series.briefing)
                  .referenceAssetIds.map((id) => {
                    const a = state.assets.find((a) => a.id === id);
                    return (
                      <label className="check" key={id}>
                        <input
                          type="checkbox"
                          checked={refs.includes(id)}
                          onChange={(e) => {
                            setRefs(
                              e.target.checked
                                ? [...refs, id]
                                : refs.filter((x) => x !== id),
                            );
                            setTransfer(false);
                          }}
                        />
                        {a?.name || id}
                      </label>
                    );
                  })}
              </fieldset>
              {refs.length > 0 && (
                <>
                  <p>
                    Nur die gewählten Dateien werden an OpenAI übermittelt.
                    Generative Bearbeitung kann das Aussehen von Personen
                    verändern; eine unveränderte Identität wird nicht
                    garantiert.
                  </p>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={transfer}
                      onChange={(e) => setTransfer(e.target.checked)}
                    />
                    Ich habe die erforderlichen Rechte und bestätige die
                    Übermittlung dieser Referenzen an OpenAI.
                  </label>
                </>
              )}
            </section>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await api(`hub/contents/${editing.id}`, {
                    version: editing.version,
                    data: contentInput.parse(form),
                  });
                  await refresh(editing.id);
                  setNotice(
                    "Neue Version gespeichert. Bisherige Freigaben sind ungültig.",
                  );
                });
              }}
            >
              <div className="studio-fields">
                <label>
                  Beitragstitel
                  <input
                    value={form.title}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </label>
                <label>
                  Verantwortlich
                  <select
                    value={form.ownerId || userId}
                    onChange={(e) => update({ ownerId: e.target.value })}
                  >
                    {state.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Kampagne
                  <select
                    value={form.campaignId || ""}
                    onChange={(e) =>
                      update({ campaignId: e.target.value || null })
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
                <label>
                  Geplant · Europe/Zurich
                  <input
                    type="datetime-local"
                    value={zurichInput(form.scheduledAt)}
                    onChange={(e) => {
                      try {
                        update({
                          scheduledAt: e.target.value
                            ? zurichInstant(e.target.value)
                            : null,
                        });
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  />
                </label>
              </div>
              <label>
                Bildidee
                <textarea
                  rows={3}
                  value={snapshot.imageIdea}
                  onChange={(e) => studio({ imageIdea: e.target.value })}
                />
              </label>
              <label>
                Headline
                <input
                  maxLength={160}
                  value={snapshot.headline}
                  onChange={(e) => studio({ headline: e.target.value })}
                />
              </label>
              <label>
                Hashtags
                <input
                  value={snapshot.hashtags}
                  onChange={(e) => studio({ hashtags: e.target.value })}
                />
              </label>
              {form.variants.map((v, i) => (
                <fieldset key={v.channel}>
                  <legend>{v.channel}</legend>
                  <label>
                    Begleittext
                    <textarea
                      rows={5}
                      value={v.text}
                      onChange={(e) =>
                        update({
                          variants: form.variants.map((old, j) =>
                            j === i ? { ...old, text: e.target.value } : old,
                          ),
                        })
                      }
                    />
                  </label>
                  <div className="studio-fields">
                    <label>
                      CTA
                      <input
                        value={v.cta}
                        onChange={(e) =>
                          update({
                            variants: form.variants.map((old, j) =>
                              j === i ? { ...old, cta: e.target.value } : old,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Link · HTTPS
                      <input
                        type="url"
                        value={v.link}
                        onChange={(e) =>
                          update({
                            variants: form.variants.map((old, j) =>
                              j === i ? { ...old, link: e.target.value } : old,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                </fieldset>
              ))}
              <h3>Motiv und reproduzierbares Layout</h3>
              <div className="studio-fields">
                <div>
                  <button type="button" onClick={() => setPicking("motif")}>
                    Aus Bibliothek wählen · Motiv
                  </button>
                </div>
                <label>
                  Eigenes oder generiertes Motiv
                  <select
                    value={snapshot.motifAssetId || ""}
                    onChange={(e) => {
                      const a = state.assets.find(
                        (a) => a.id === e.target.value,
                      );
                      if (!a) return;
                      update({
                        studio: {
                          ...snapshot,
                          motifAssetId: a.id,
                          motifSha256: a.sha256,
                          source: a.kind === "MOTIF" ? "AI" : "OWN",
                        },
                        variants: form.variants.map((v) => ({
                          ...v,
                          mediaType: "IMAGE",
                          mediaUrl: "",
                          mediaReference: `Studio-Asset ${a.id} · ${a.sha256}`,
                        })),
                      });
                    }}
                  >
                    <option value="">Motiv wählen</option>
                    {imageAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Layoutvorlage · V1 zur Freigabe
                  <select
                    value={snapshot.template}
                    onChange={(e) =>
                      studio({
                        template: e.target.value as StudioSnapshot["template"],
                      })
                    }
                  >
                    <option value="PANEL">
                      Fotografie / schwarzes Textfeld
                    </option>
                    <option value="PHOTO">
                      Fotografie / transparente Textfläche
                    </option>
                  </select>
                </label>
                <label>
                  Freigegebene Schriftdatei
                  <select
                    value={snapshot.fontAssetId || ""}
                    onChange={(e) => {
                      const a = state.assets.find(
                        (a) => a.id === e.target.value,
                      );
                      studio({
                        fontAssetId: a?.id || null,
                        fontSha256: a?.sha256 || "",
                      });
                    }}
                  >
                    <option value="">
                      Nicht vorhanden · Textebene gesperrt
                    </option>
                    {state.assets
                      .filter((a) => a.kind === "FONT")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {!snapshot.fontAssetId && (
                <p className="notice">
                  Original-Schriftdatei fehlt. Keine Ersatzschrift im
                  Bildexport. Headline und Claim lassen sich erst mit
                  freigegebener TTF/OTF rendern.
                </p>
              )}
              <div className="studio-fields">
                {(
                  [
                    ["cropX", "Bildausschnitt horizontal", 0, 1, 0.01],
                    ["cropY", "Bildausschnitt vertikal", 0, 1, 0.01],
                    ["zoom", "Vergrösserung", 1, 3, 0.05],
                  ] as const
                ).map(([key, label, min, max, step]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={snapshot[key]}
                      onChange={(e) =>
                        studio({ [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
              <fieldset>
                <legend>Ebenen und Formate</legend>
                {(
                  [
                    ["showLogo", "Original-Logo"],
                    ["showHeadline", "Headline"],
                    [
                      "showClaim",
                      snapshot.brandProfile
                        ? `Claim: ${snapshot.brandProfile.claim || "offen"}`
                        : "We create visibility",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <label className="check" key={key}>
                    <input
                      type="checkbox"
                      checked={snapshot[key]}
                      onChange={(e) => studio({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
                {formats.map((f) => (
                  <label className="check" key={f}>
                    <input
                      type="checkbox"
                      checked={snapshot.formats.includes(f)}
                      onChange={(e) =>
                        studio({
                          formats: e.target.checked
                            ? [...snapshot.formats, f]
                            : snapshot.formats.filter((x) => x !== f),
                        })
                      }
                    />
                    {f}
                  </label>
                ))}
              </fieldset>
              <button disabled={busy || !dirty}>Version speichern</button>
            </form>
            <section className="studio-preview" aria-label="Layoutvorschau">
              <h3>Vorschau der gespeicherten Version</h3>
              {snapshot.motifAssetId && (
                <img
                  alt="Zugeordnetes Bildmotiv ohne Layout"
                  src={`/api/studio/assets/${snapshot.motifAssetId}`}
                  style={{
                    objectPosition: `${snapshot.cropX * 100}% ${snapshot.cropY * 100}%`,
                  }}
                />
              )}
              <div className="actions">
                <label>
                  Format
                  <select
                    value={format}
                    onChange={(e) => {
                      setFormat(e.target.value as StudioFormat);
                      setPreview("");
                    }}
                  >
                    {formats
                      .filter((f) => snapshot.formats.includes(f))
                      .map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Dateityp
                  <select
                    value={encoding}
                    onChange={(e) =>
                      setEncoding(e.target.value as "png" | "jpg")
                    }
                  >
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                  </select>
                </label>
                <button
                  disabled={busy || dirty || !snapshot.motifAssetId}
                  onClick={() =>
                    void act(async () => {
                      const r = await api(`studio/export/${editing.id}`, {
                        version: editing.version,
                        format: snapshot.formats.includes(format)
                          ? format
                          : snapshot.formats[0],
                        encoding,
                        preview: true,
                      });
                      setPreview(r.url);
                      await refresh();
                    })
                  }
                >
                  Layoutvorschau rendern
                </button>
              </div>
              {preview && (
                <img
                  alt="Gerenderte Layoutvorschau der gespeicherten Version"
                  src={preview}
                />
              )}
              <p>
                Bild und Layout sind getrennt. Änderungen an Text, Ausschnitt,
                Ebenen oder Vorlage benötigen keine neue Bildgenerierung.
              </p>
              <h4>{snapshot.headline}</h4>
              {form.variants.map((v) => (
                <article key={v.channel}>
                  <strong>{v.channel}</strong>
                  <p className="preserve-lines">{v.text}</p>
                  <p>
                    {v.cta} {v.link}
                  </p>
                  <p>{snapshot.hashtags}</p>
                </article>
              ))}
            </section>
            <section>
              <h3>Freigabe und Export</h3>
              <p>
                Jede Speicherung ist bereits ein Social-Entwurf in der
                gemeinsamen Planung. Ein Termin oder Export ist keine
                Veröffentlichung.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={read}
                  disabled={dirty}
                  onChange={(e) => setRead(e.target.checked)}
                />
                Ich habe diese gespeicherte Version mit allen Kanaltexten,
                Motiv, Ebenen und ausgewählten Layoutformaten vollständig
                geprüft.
              </label>
              <div className="actions">
                {(
                  [
                    ["PENDING", "Zur Prüfung"],
                    ["APPROVED", "Version freigeben"],
                    ["REJECTED", "Ablehnen"],
                  ] as const
                ).map(([decision, label]) => (
                  <button
                    key={decision}
                    className={decision === "APPROVED" ? "" : "secondary"}
                    disabled={
                      busy || dirty || (decision === "APPROVED" && !read)
                    }
                    onClick={() =>
                      void act(async () => {
                        await api(`hub/review/${editing.id}`, {
                          version: editing.version,
                          decision,
                          read,
                        });
                        await refresh(editing.id);
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="actions">
                <button
                  disabled={busy || dirty || editing.status !== "APPROVED"}
                  onClick={() =>
                    void act(async () => {
                      const r = await api(`studio/export/${editing.id}`, {
                        version: editing.version,
                        format: snapshot.formats.includes(format)
                          ? format
                          : snapshot.formats[0],
                        encoding,
                        preview: false,
                      });
                      window.location.assign(r.url + "?download");
                    })
                  }
                >
                  Freigegebenes Sujet exportieren
                </button>
                <button
                  className="secondary"
                  disabled={busy || dirty}
                  onClick={() =>
                    void act(async () => {
                      const r = await api(`studio/texts/${editing.id}`, {
                        version: editing.version,
                      });
                      download(r.text, r.name);
                    })
                  }
                >
                  Kanaltexte als TXT
                </button>
                <button
                  className="secondary"
                  disabled={busy || dirty}
                  onClick={() =>
                    void act(async () => {
                      const r = await api(`studio/texts/${editing.id}`, {
                        version: editing.version,
                      });
                      await navigator.clipboard.writeText(r.text);
                      setNotice("Kanaltexte kopiert.");
                    })
                  }
                >
                  Texte kopieren
                </button>
                {snapshot.motifAssetId && (
                  <button
                    className="secondary"
                    disabled={busy || dirty}
                    onClick={() =>
                      void act(async () => {
                        const r = await api(`studio/motif/${editing.id}`, {
                          version: editing.version,
                          encoding,
                        });
                        window.location.assign(r.url + "?download");
                      })
                    }
                  >
                    Reines Motiv als PNG/JPG
                  </button>
                )}
                <button
                  disabled={
                    busy ||
                    dirty ||
                    series.contents.some((c) => c.status !== "APPROVED")
                  }
                  onClick={() =>
                    void act(async () => {
                      const r = await api(`studio/zip/${seriesId}`, {});
                      window.location.assign(r.url + "?download");
                    })
                  }
                >
                  Freigegebene Serie als ZIP
                </button>
              </div>
              <p>
                Geplant: {displayTime(form.scheduledAt)} · keine automatische
                Veröffentlichung
              </p>
              <details>
                <summary>Freigabehistorie</summary>
                {editing.approvals.map((a) => (
                  <p key={a.id}>
                    {a.user.name} · V{a.version} · {a.status} ·{" "}
                    {displayTime(a.createdAt.toString())}
                  </p>
                ))}
              </details>
            </section>
          </section>
        ) : (
          <section>
            <h2>Eigene Inhalte und KI in einem Ablauf</h2>
            <p>
              Eine Serie links öffnen oder ein Briefing anlegen. Es wird nichts
              automatisch generiert, versendet oder veröffentlicht.
            </p>
          </section>
        )}
      </div>
      <section className="studio-jobs">
        <div className="hub-toolbar">
          <h2>Aufträge und Nutzung</h2>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void act(() => refresh())}
          >
            Auftragsstatus neu laden
          </button>
        </div>
        <p>
          Aufträge und Ergebnisse bleiben nach Browser-Neuladen gespeichert. Es
          erfolgt kein automatischer Neustart. Bei unklarem Ergebnis zuerst den
          Anbieter-Verbrauch prüfen.
        </p>
        {state.jobs.map((j) => (
          <article key={j.id}>
            <strong>
              {j.kind} · {statusLabel[j.status] || j.status}
            </strong>
            <span>
              {" "}
              {j.model} · reserviert USD {j.reserveUsd.toFixed(2)} ·{" "}
              {displayTime(j.createdAt.toString())}
            </span>
            {j.error && <p role="status">{j.error}</p>}
            <div className="actions">
              {j.status === "QUEUED" && (
                <button
                  disabled={busy || !costs}
                  onClick={() =>
                    void act(async () => {
                      await api(`studio/run/${j.id}`, { confirmedCosts: true });
                      await refresh();
                    })
                  }
                >
                  Wartenden Auftrag bewusst starten
                </button>
              )}
              {j.status === "SUCCEEDED" && j.kind !== "CHAT" && (
                <button
                  disabled={busy || dirty}
                  onClick={() =>
                    void act(async () => {
                      await api(`studio/apply/${j.id}`, {});
                      await refresh(editing?.id);
                      setNotice(
                        "Ergebnis als neue Entwurfsversion übernommen. Bitte prüfen.",
                      );
                    })
                  }
                >
                  Ergebnis als Entwurf übernehmen
                </button>
              )}
              {["QUEUED", "RUNNING"].includes(j.status) && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api(`studio/reconcile/${j.id}`, {});
                      await refresh();
                    })
                  }
                >
                  Abbrechen / abgelaufenen Auftrag prüfen
                </button>
              )}
            </div>
            {j.result && (
              <details>
                <summary>Gespeichertes Ergebnis</summary>
                <pre>{JSON.stringify(j.result, null, 2)}</pre>
              </details>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
