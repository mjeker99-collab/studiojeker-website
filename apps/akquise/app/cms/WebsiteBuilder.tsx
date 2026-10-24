"use client";
import { useEffect, useState } from "react";
import ProjectSave from "../projects/ProjectSave";
import {
  blankWebsite,
  blankPage,
  blankSection,
  validatedDocument,
  type WebsiteDocument,
  type WebsitePage,
} from "@/lib/websites/input";
import { websiteHtml } from "@/lib/websites/render";
import type { websiteList, websiteState } from "@/lib/websites/service";
import WebsitePublication from "./WebsitePublication";
type List = Awaited<ReturnType<typeof websiteList>>;
type Project = Awaited<ReturnType<typeof websiteState>>;
async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api/websites${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "Website konnte nicht geladen werden.");
  return data;
}
export default function WebsiteBuilder() {
  const [list, setList] = useState<List | null>(null),
    [project, setProject] = useState<Project | null>(null);
  const [doc, setDoc] = useState<WebsiteDocument>(
    structuredClone(blankWebsite),
  );
  const [customerId, setCustomerId] = useState<string | null>(null),
    [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false),
    [previewJob, setPreviewJob] = useState("");
  const [proposalPage, setProposalPage] = useState(0);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [mediaError, setMediaError] = useState("");
  const [mobile, setMobile] = useState(false),
    [restoreVersion, setRestoreVersion] = useState("");
  const dirty = project
    ? JSON.stringify(project.document) !== JSON.stringify(doc)
    : JSON.stringify(doc) !== JSON.stringify(blankWebsite);
  useEffect(() => {
    let active = true;
    api<List>("")
      .then((d) => {
        if (active) setList(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: MouseEvent) => {
      if (
        (e.target as Element).closest(
          'nav[aria-label="Hauptnavigation"] button',
        ) &&
        !window.confirm("Ungespeicherte Website-Änderungen verwerfen?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function load(id: string) {
    const p = await api<Project>(`/${id}`);
    setProject(p);
    setDoc(p.document);
    setCustomerId(p.customerId);
    setPageIndex(0);
    setPreviewJob("");
    setRestoreVersion("");
    setMessage("");
    setConsent(false);
  }
  async function reloadList() {
    setList(await api<List>(""));
  }
  function canLeave() {
    return (
      !dirty || window.confirm("Ungespeicherte Website-Änderungen verwerfen?")
    );
  }
  function updatePage(change: Partial<WebsitePage>) {
    setPreviewJob("");
    setDoc({
      ...doc,
      pages: doc.pages.map((p, i) =>
        i === pageIndex ? { ...p, ...change } : p,
      ),
    });
  }
  async function save() {
    const result = await api<{ id: string }>(
      project ? `/${project.id}` : "",
      project
        ? { version: project.version, document: doc }
        : { customerId, document: doc },
    );
    const pendingMessage = message;
    await load(result.id);
    setMessage(pendingMessage);
    await reloadList();
    setStatus("Website als neue Version gespeichert.");
  }
  const page = doc.pages[pageIndex] || doc.pages[0];
  const proposal = project?.jobs.find((j) => j.id === previewJob)?.result
    ?.document;
  const shown = proposal || doc;
  const assetIds = JSON.stringify([
    ...new Set(
      shown.pages.flatMap((p) =>
        p.sections.flatMap((s) => (s.imageAssetId ? [s.imageAssetId] : [])),
      ),
    ),
  ]);
  useEffect(() => {
    const controller = new AbortController();
    async function resolveImages() {
      const resolved: Record<string, string> = {};
      let totalBytes = 0;
      for (const id of JSON.parse(assetIds) as string[]) {
        const response = await fetch(
          `/api/studio/assets/${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error("Ein Mediathek-Bild konnte nicht geladen werden.");
        const blob = await response.blob();
        totalBytes += blob.size;
        if (totalBytes > 32 * 1024 * 1024)
          throw new Error(
            "Website-Bilder dürfen zusammen höchstens 32 MB umfassen.",
          );
        if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type))
          throw new Error("Bildformat nicht unterstützt.");
        resolved[id] = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (!controller.signal.aborted) {
        setMedia(resolved);
        setMediaError("");
      }
    }
    void resolveImages().catch((e) => {
      if (!controller.signal.aborted) setMediaError(e.message);
    });
    return () => controller.abort();
  }, [assetIds]);
  const checked = validatedDocument.safeParse(shown);
  const preview = checked.success
    ? websiteHtml(
        checked.data,
        checked.data.pages[proposal ? proposalPage : pageIndex]?.slug ||
          "index",
        media,
      )
    : "";
  return (
    <section className="panel website-builder" aria-label="Website-Studio">
      <div className="assistant-entry-intro">
        <div>
          <p className="eyebrow">WEBSITE-STUDIO</p>
          <h2>Webseiten mit GPT bauen</h2>
          <p>Idee beschreiben. Entwurf prüfen. Gemeinsam weiterentwickeln.</p>
        </div>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            if (canLeave()) {
              setProject(null);
              setDoc(structuredClone(blankWebsite));
              setCustomerId(null);
              setPageIndex(0);
              setPreviewJob("");
              setMessage("");
              setStatus("");
            }
          }}
        >
          Neue Website
        </button>
      </div>

      <ProjectSave
        area="Website-Studio"
        identity={project?.id || ""}
        suggestedTitle={doc.name || "Neue Website"}
        busy={busy}
        value={{
          nativeId: project?.id || "",
          nativeVersion: project?.version || 0,
          doc,
          customerId,
          pageIndex,
          message,
          previewJob,
          proposalPage,
          mobile,
        }}
        restore={async (draft) => {
          const next = draft.nativeId
            ? await api<Project>(`/${draft.nativeId}`)
            : null;
          setProject(next ? { ...next, version: draft.nativeVersion } : null);
          setDoc(draft.doc);
          setCustomerId(draft.customerId);
          setPageIndex(draft.pageIndex);
          setMessage(draft.message);
          setPreviewJob(draft.previewJob);
          setProposalPage(draft.proposalPage);
          setMobile(draft.mobile);
          setConsent(false);
          setRestoreVersion("");
        }}
      />
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
      {!list ? (
        <button type="button" disabled={busy} onClick={() => run(reloadList)}>
          Projekte laden
        </button>
      ) : (
        <label>
          Gespeicherte Website
          <select
            aria-label="Gespeicherte Website"
            value={project?.id || ""}
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              if (id && canLeave()) void run(() => load(id));
            }}
          >
            <option value="">Neues Projekt</option>
            {list.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · Version {p.version}
              </option>
            ))}
          </select>
        </label>
      )}
      <fieldset disabled={busy} className="website-fields">
        <div className="website-grid">
          <label>
            Projektname
            <input
              value={doc.name}
              maxLength={160}
              onChange={(e) => setDoc({ ...doc, name: e.target.value })}
            />
          </label>
          <label>
            Kunde
            <select
              value={customerId || ""}
              disabled={!!project}
              onChange={(e) => setCustomerId(e.target.value || null)}
            >
              <option value="">Studiojeker</option>
              {list?.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {project?.customerId &&
                !list?.customers.some((c) => c.id === project.customerId) && (
                  <option value={project.customerId}>
                    Zugeordneter Kunde (inaktiv)
                  </option>
                )}
            </select>
          </label>
        </div>
        <label>
          Briefing
          <textarea
            rows={3}
            maxLength={6000}
            placeholder="Für wen ist die Website? Angebot, Zielgruppe, Ziel und gewünschte Seiten …"
            value={doc.briefing}
            onChange={(e) => setDoc({ ...doc, briefing: e.target.value })}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={() => run(save)}>
            {project ? "Änderungen speichern" : "Projekt anlegen"}
          </button>
          {project && (
            <>
              <span>
                {dirty
                  ? "Ungespeicherte Änderungen"
                  : `Version ${project.version} gespeichert`}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (canLeave()) void run(() => load(project.id));
                }}
              >
                Gespeicherten Stand laden
              </button>
            </>
          )}
        </div>
      </fieldset>
      <section className="website-assistant" aria-label="GPT Website-Assistent">
        <h3>Mit GPT zusammenarbeiten</h3>
        <p className="muted">
          Beschreibe die Website oder eine Änderung, zum Beispiel: «Erstelle
          Startseite, Leistungen und Kontakt» oder «Kürze nur den Einstieg auf
          der Startseite».
        </p>
        {project?.jobs.map((j) => (
          <article className="website-message" key={j.id}>
            <p>
              <strong>Du:</strong> {j.message}
            </p>
            {j.result ? (
              <>
                <p className="copy">
                  <strong>GPT:</strong> {j.result.reply}
                </p>
                {j.result.document && (
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setPreviewJob(j.id);
                        setProposalPage(0);
                      }}
                    >
                      Vorschau des Vorschlags
                    </button>
                    <button
                      type="button"
                      disabled={busy || dirty || j.version !== project.version}
                      onClick={() =>
                        run(async () => {
                          await api(`/${project.id}/apply`, {
                            version: project.version,
                            jobId: j.id,
                          });
                          await load(project.id);
                          await reloadList();
                          setStatus(
                            "GPT-Vorschlag als neue Version übernommen.",
                          );
                        })
                      }
                    >
                      Vorschlag übernehmen
                    </button>
                    {j.version !== project.version && (
                      <span className="muted">
                        Vorschlag für Version {j.version}; aktueller Stand hat
                        sich geändert.
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p role="status">
                {j.error ||
                  "GPT-Auftrag läuft. Über «Dialog aktualisieren» den Stand prüfen."}
              </p>
            )}
          </article>
        ))}
        <label>
          Dein Auftrag an GPT
          <textarea
            rows={3}
            maxLength={6000}
            value={message}
            disabled={busy}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Website, Kundenwissen und Dialog an GPT übermitteln. Kostenpflichtiger
          KI-Auftrag mit USD {list?.config?.reserveUsd?.toFixed(2) || "–"}{" "}
          Budgetreservierung.
        </label>
        <div className="actions">
          <button
            type="button"
            className="ai-button"
            disabled={
              busy ||
              !project ||
              dirty ||
              !message.trim() ||
              !consent ||
              !list?.config?.connected
            }
            onClick={() =>
              run(async () => {
                if (!project) return;
                await api(`/${project.id}/assist`, {
                  version: project.version,
                  message,
                  requestKey: crypto.randomUUID(),
                  confirmedCosts: true,
                  confirmedTransfer: true,
                });
                // Refresh conversation only: generating a proposal never replaces the editor.
                setProject(await api<Project>(`/${project.id}`));
                setMessage("");
                setStatus(
                  "GPT-Antwort ist bereit. Prüfe den Vorschlag vor dem Übernehmen.",
                );
              })
            }
          >
            {busy ? "Bitte warten …" : "✦ GPT beauftragen"}
          </button>
          {project && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const latest = await api<Project>(`/${project.id}`);
                  if (latest.version !== project.version)
                    throw new Error(
                      "Website wurde geändert. Bitte gespeicherten Stand laden; eigene Änderungen vorher kopieren.",
                    );
                  setProject(latest);
                })
              }
            >
              Dialog aktualisieren
            </button>
          )}
        </div>
        {(!project || dirty) && (
          <p className="muted">
            Zuerst den aktuellen Website-Stand speichern, damit GPT damit
            arbeitet.
          </p>
        )}
        {list && !list.config?.connected && (
          <p className="muted">
            GPT ist derzeit nicht verbunden. Manuelle Bearbeitung und Export
            sind verfügbar.
          </p>
        )}
      </section>
      <div className="website-workspace">
        <div>
          <fieldset disabled={busy} className="website-fields">
            <h3>Seiten & Inhalte</h3>
            <label>
              Seite bearbeiten
              <select
                aria-label="Seite bearbeiten"
                value={pageIndex}
                onChange={(e) => {
                  setPageIndex(Number(e.target.value));
                  setPreviewJob("");
                }}
              >
                {doc.pages.map((p, i) => (
                  <option key={i} value={i}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={doc.pages.length >= 10}
                onClick={() => {
                  let n = doc.pages.length + 1;
                  while (doc.pages.some((p) => p.slug === `seite-${n}`)) n++;
                  setDoc({
                    ...doc,
                    pages: [
                      ...doc.pages,
                      {
                        ...structuredClone(blankPage),
                        slug: `seite-${n}`,
                        title: `Seite ${n}`,
                      },
                    ],
                  });
                  setPageIndex(doc.pages.length);
                  setPreviewJob("");
                }}
              >
                Seite hinzufügen
              </button>
              <button
                type="button"
                className="secondary"
                disabled={page.slug === "index"}
                onClick={() => {
                  if (
                    window.confirm("Diese Seite aus dem Entwurf entfernen?")
                  ) {
                    setDoc({
                      ...doc,
                      pages: doc.pages.filter((_, i) => i !== pageIndex),
                    });
                    setPageIndex(0);
                    setPreviewJob("");
                  }
                }}
              >
                Seite entfernen
              </button>
            </div>
            <label>
              Seitentitel
              <input
                value={page.title}
                maxLength={100}
                onChange={(e) => updatePage({ title: e.target.value })}
              />
            </label>
            <label>
              Seitenadresse
              <input
                value={page.slug}
                disabled={page.slug === "index"}
                maxLength={61}
                onChange={(e) => updatePage({ slug: e.target.value })}
              />
            </label>
            <label>
              Hauptüberschrift
              <input
                value={page.headline}
                maxLength={200}
                onChange={(e) => updatePage({ headline: e.target.value })}
              />
            </label>
            <label>
              Einleitung
              <textarea
                rows={4}
                value={page.intro}
                maxLength={3000}
                onChange={(e) => updatePage({ intro: e.target.value })}
              />
            </label>
            {page.sections.map((s, i) => (
              <details
                key={`${pageIndex}-${i}`}
                className="website-section"
                open
              >
                <summary>
                  Abschnitt {i + 1}: {s.heading || "Ohne Titel"}
                </summary>
                <label>
                  Abschnittstitel
                  <input
                    value={s.heading}
                    maxLength={200}
                    onChange={(e) =>
                      updatePage({
                        sections: page.sections.map((x, n) =>
                          n === i ? { ...x, heading: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Abschnittstext
                  <textarea
                    rows={5}
                    value={s.body}
                    maxLength={3000}
                    onChange={(e) =>
                      updatePage({
                        sections: page.sections.map((x, n) =>
                          n === i ? { ...x, body: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Darstellung
                  <select
                    value={s.layout}
                    onChange={(e) =>
                      updatePage({
                        sections: page.sections.map((x, n) =>
                          n === i
                            ? {
                                ...x,
                                layout: e.target.value as typeof s.layout,
                              }
                            : x,
                        ),
                      })
                    }
                  >
                    <option value="TEXT">Text & Bild</option>
                    <option value="SPLIT">Bild neben Text</option>
                    <option value="BANNER">Hervorgehobener Abschnitt</option>
                  </select>
                </label>
                {(
                  [
                    ["imageUrl", "Bildadresse (öffentliches HTTPS)"],
                    ["imageAlt", "Bildbeschreibung"],
                    ["ctaLabel", "Button-Text"],
                    ["ctaUrl", "Button-Ziel (z. B. kontakt.html)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      disabled={key === "imageUrl" && !!s.imageAssetId}
                      value={s[key]}
                      maxLength={
                        key === "imageAlt"
                          ? 300
                          : key === "ctaLabel"
                            ? 100
                            : 2000
                      }
                      onChange={(e) =>
                        updatePage({
                          sections: page.sections.map((x, n) =>
                            n === i ? { ...x, [key]: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Bild aus der Mediathek
                  <select
                    aria-label="Bild aus der Mediathek"
                    value={s.imageAssetId || ""}
                    onChange={(e) =>
                      updatePage({
                        sections: page.sections.map((x, n) =>
                          n === i
                            ? { ...x, imageAssetId: e.target.value || null }
                            : x,
                        ),
                      })
                    }
                  >
                    <option value="">
                      Kein Mediathek-Bild / externe Bildadresse
                    </option>
                    {(list?.images || []).map((image) => (
                      <option key={image.id} value={image.id}>
                        {image.name}
                      </option>
                    ))}
                    {s.imageAssetId &&
                      !list?.images?.some(
                        (image) => image.id === s.imageAssetId,
                      ) && (
                        <option value={s.imageAssetId}>
                          Gespeichertes Bild
                        </option>
                      )}
                  </select>
                </label>
                <p className="muted">
                  Eigene Bilder zuerst in der Mediathek hochladen, dann hier
                  auswählen. JPEG, PNG oder WebP; die Bildbeschreibung dient als
                  Alternativtext.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={i === 0}
                    onClick={() => {
                      const sections = [...page.sections];
                      [sections[i - 1], sections[i]] = [
                        sections[i],
                        sections[i - 1],
                      ];
                      updatePage({ sections });
                    }}
                  >
                    Nach oben
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={i === page.sections.length - 1}
                    onClick={() => {
                      const sections = [...page.sections];
                      [sections[i + 1], sections[i]] = [
                        sections[i],
                        sections[i + 1],
                      ];
                      updatePage({ sections });
                    }}
                  >
                    Nach unten
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (
                        window.confirm("Abschnitt aus dem Entwurf entfernen?")
                      )
                        updatePage({
                          sections: page.sections.filter((_, n) => n !== i),
                        });
                    }}
                  >
                    Abschnitt entfernen
                  </button>
                </div>
              </details>
            ))}
            <button
              type="button"
              className="secondary"
              disabled={page.sections.length >= 10}
              onClick={() =>
                updatePage({
                  sections: [...page.sections, { ...blankSection }],
                })
              }
            >
              Abschnitt hinzufügen
            </button>
            <details className="website-section">
              <summary>SEO & Gestaltung</summary>
              <label>
                SEO-Titel
                <input
                  value={page.seoTitle}
                  maxLength={160}
                  onChange={(e) => updatePage({ seoTitle: e.target.value })}
                />
              </label>
              <label>
                SEO-Beschreibung
                <textarea
                  value={page.seoDescription}
                  maxLength={320}
                  onChange={(e) =>
                    updatePage({ seoDescription: e.target.value })
                  }
                />
              </label>
              <label>
                Sprache
                <select
                  value={doc.language}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      language: e.target.value as WebsiteDocument["language"],
                    })
                  }
                >
                  <option value="de-CH">Deutsch (Schweiz)</option>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="it">Italiano</option>
                </select>
              </label>
              <label>
                Akzentfarbe
                <input
                  type="color"
                  value={doc.accent}
                  onChange={(e) => setDoc({ ...doc, accent: e.target.value })}
                />
              </label>
              <label>
                Grundgestaltung
                <select
                  value={doc.style}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      style: e.target.value as WebsiteDocument["style"],
                    })
                  }
                >
                  <option value="LIGHT">Hell</option>
                  <option value="DARK">Dunkel</option>
                </select>
              </label>
              <label>
                Gestaltungsvorlage
                <select
                  aria-label="Gestaltungsvorlage"
                  value={doc.template || "EDITORIAL"}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      template: e.target.value as WebsiteDocument["template"],
                    })
                  }
                >
                  <option value="EDITORIAL">
                    Editorial · klare Texte und Abschnitte
                  </option>
                  <option value="CAMPAIGN">
                    Kampagne · zentrierter Einstieg und Aktionen
                  </option>
                  <option value="PORTFOLIO">
                    Portfolio · grosszügige Bildflächen
                  </option>
                </select>
              </label>
              <label>
                Fusszeile
                <textarea
                  value={doc.footer}
                  maxLength={3000}
                  onChange={(e) => setDoc({ ...doc, footer: e.target.value })}
                />
              </label>
            </details>
            <button type="button" onClick={() => run(save)}>
              Website speichern
            </button>
          </fieldset>
        </div>
        <section className="website-preview" aria-label="Website-Vorschau">
          <div className="actions">
            <h3>
              {proposal
                ? "GPT-Vorschlag · noch nicht übernommen"
                : "Vorschau des Entwurfs"}
            </h3>
            <button
              type="button"
              className="secondary"
              aria-pressed={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? "Desktopansicht" : "Mobilansicht"}
            </button>
            {proposal && (
              <button
                type="button"
                className="secondary"
                onClick={() => setPreviewJob("")}
              >
                Eigenen Entwurf zeigen
              </button>
            )}
          </div>
          {proposal && (
            <label>
              Vorschauseite
              <select
                aria-label="Vorschauseite"
                value={Math.min(proposalPage, proposal.pages.length - 1)}
                onChange={(e) => setProposalPage(Number(e.target.value))}
              >
                {proposal.pages.map((p, i) => (
                  <option key={p.slug} value={i}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="muted">
            Seitenwechsel über die Auswahl. Mediathek-Bilder bleiben bis zur
            Veröffentlichung intern.
          </p>
          {mediaError && <p role="alert">{mediaError}</p>}
          {checked.success ? (
            <iframe
              title="Website-Vorschau"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={preview}
              className={mobile ? "mobile" : ""}
            />
          ) : (
            <p role="status">
              Vorschau nach Ergänzung der Felder:{" "}
              {checked.error.issues.map((i) => i.message).join(" ")}
            </p>
          )}
        </section>
      </div>
      {project && (
        <WebsitePublication
          key={project.id}
          publication={project.publication || null}
          version={project.version}
          disabled={busy || dirty}
          mutate={(action, body) =>
            run(async () => {
              await api(`/${project.id}/${action}`, body);
              await load(project.id);
              setStatus(
                action === "publish"
                  ? "Gespeicherte Website veröffentlicht."
                  : "Veröffentlichung zurückgezogen.",
              );
            })
          }
        />
      )}
      {project && (
        <section className="website-export" aria-label="Versionen und Export">
          <h3>Versionen & Export</h3>
          <div className="actions">
            <label>
              Früheren Stand wählen
              <select
                aria-label="Früheren Stand wählen"
                value={restoreVersion}
                disabled={busy}
                onChange={(e) => setRestoreVersion(e.target.value)}
              >
                <option value="">Version auswählen</option>
                {project.versions
                  .filter((v) => v.version !== project.version)
                  .map((v) => (
                    <option key={v.version} value={v.version}>
                      Version {v.version}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="secondary"
              disabled={busy || dirty || !restoreVersion}
              onClick={() =>
                run(async () => {
                  await api(`/${project.id}/restore`, {
                    version: project.version,
                    restoreVersion: Number(restoreVersion),
                  });
                  await load(project.id);
                  await reloadList();
                  setStatus(
                    "Früherer Stand als neue Version wiederhergestellt.",
                  );
                })
              }
            >
              Version wiederherstellen
            </button>
            <a
              href={`/api/websites/${project.id}/export?version=${project.version}`}
              download
            >
              Website als HTML-Paket exportieren ↗
            </a>
          </div>
          <p className="muted">
            Exportiert die gespeicherte Version {project.version}. Enthält alle
            Seiten, Mediathek-Bilder und eine Projektdatei. Externe Bildadressen
            bleiben verlinkt. Das Paket kann auch auf einem eigenen Webspace
            verwendet werden.
          </p>
        </section>
      )}
    </section>
  );
}
