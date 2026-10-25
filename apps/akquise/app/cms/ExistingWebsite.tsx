"use client";
import { useEffect, useState } from "react";

type Overview = {
  studioUrl: string;
  stagingUrl: string;
  liveUrl: string;
  publishAllowed: boolean;
  writeConfigured: boolean;
  pages: {
    key: string;
    title: string;
    path: string;
    exists: boolean;
    hasDraft: boolean;
    source: string;
    updatedAt: string | null;
    stagingUrl: string;
    liveUrl: string;
    studioUrl: string;
  }[];
};

type PageState = {
  key: string;
  title: string;
  path: string;
  revision: string;
  hasDraft: boolean;
  source: string;
  exists: boolean;
  stagingUrl: string;
  liveUrl: string;
  studioUrl: string;
  publishAllowed: boolean;
  writeConfigured: boolean;
  fields: {
    key: string;
    label: string;
    kind: string;
    group: string;
    max?: number;
  }[];
  values: Record<string, unknown>;
};

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/site-cms${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Aktion fehlgeschlagen.");
  return data;
}

function LocalizedFields({
  label,
  value,
  max,
  onChange,
  onSuggest,
  busy,
}: {
  label: string;
  value: { de?: string; en?: string };
  max?: number;
  onChange: (next: { de: string; en: string }) => void;
  onSuggest: (locale: "de" | "en", current: string) => void;
  busy: boolean;
}) {
  return (
    <fieldset className="site-cms-field">
      <legend>{label}</legend>
      <label>
        Deutsch
        <textarea
          rows={3}
          maxLength={max}
          value={value.de || ""}
          onChange={(e) =>
            onChange({ de: e.target.value, en: value.en || "" })
          }
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="secondary ai-button"
          disabled={busy}
          onClick={() => onSuggest("de", value.de || "")}
        >
          KI-Vorschlag (DE)
        </button>
      </div>
      <label>
        Englisch
        <textarea
          rows={3}
          maxLength={max}
          value={value.en || ""}
          onChange={(e) =>
            onChange({ de: value.de || "", en: e.target.value })
          }
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="secondary ai-button"
          disabled={busy}
          onClick={() => onSuggest("en", value.en || "")}
        >
          KI-Vorschlag (EN)
        </button>
      </div>
    </fieldset>
  );
}

export default function ExistingWebsite() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [page, setPage] = useState<PageState | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    fieldKey: string;
    locale?: "de" | "en";
    text: string;
    rationale: string;
  } | null>(null);

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

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/site-cms/overview", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setOverview(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);

  async function openPage(key: string) {
    await run(async () => {
      const data = await api<PageState>(`/pages/${key}`);
      setPage(data);
      setValues(structuredClone(data.values));
      setSuggestion(null);
      setConfirmPublish(false);
    });
  }

  async function saveDraft() {
    if (!page) return;
    await run(async () => {
      const textValues = Object.fromEntries(
        Object.entries(values).filter(([key]) => {
          const field = page.fields.find((item) => item.key === key);
          return field && field.group !== "media";
        }),
      );
      const result = await api<{
        revision: string;
        hasDraft: boolean;
        source: string;
        values: Record<string, unknown>;
      }>("/save", {
        pageKey: page.key,
        revision: page.revision,
        values: textValues,
      });
      setPage({
        ...page,
        revision: result.revision,
        hasDraft: result.hasDraft,
        source: result.source,
        values: result.values,
      });
      setValues(structuredClone(result.values));
      setStatus("Entwurf in Sanity gespeichert. Noch nicht veröffentlicht.");
      const next = await api<Overview>("/overview");
      setOverview(next);
    });
  }

  async function requestReview() {
    if (!page) return;
    await run(async () => {
      await api("/review", {
        pageKey: page.key,
        revision: page.revision,
      });
      setStatus(
        "Zur Freigabe markiert. Veröffentlichung erst nach ausdrücklicher Bestätigung.",
      );
    });
  }

  async function publish() {
    if (!page) return;
    await run(async () => {
      const result = await api<{
        revision: string;
        hasDraft: boolean;
        stagingUrl: string;
        notice: string;
      }>("/publish", {
        pageKey: page.key,
        revision: page.revision,
        confirmed: true,
      });
      setPage({
        ...page,
        revision: result.revision,
        hasDraft: result.hasDraft,
        source: "published",
      });
      setConfirmPublish(false);
      setStatus(result.notice);
      const next = await api<Overview>("/overview");
      setOverview(next);
    });
  }

  async function suggest(
    fieldKey: string,
    locale: "de" | "en" | undefined,
    current: string,
    goal: "rewrite" | "seo",
  ) {
    if (!page) return;
    await run(async () => {
      const result = await api<{ suggestion: string; rationale: string }>(
        "/suggest",
        {
          pageKey: page.key,
          fieldKey,
          locale: locale || "de",
          current,
          goal,
        },
      );
      setSuggestion({
        fieldKey,
        locale,
        text: result.suggestion,
        rationale: result.rationale,
      });
      setStatus("KI-Vorschlag bereit. Noch nicht übernommen.");
    });
  }

  function applySuggestion() {
    if (!suggestion || !page) return;
    const field = page.fields.find((item) => item.key === suggestion.fieldKey);
    if (!field) return;
    if (
      field.kind === "localizedString" ||
      field.kind === "localizedText"
    ) {
      const current = (values[field.key] as { de?: string; en?: string }) || {
        de: "",
        en: "",
      };
      const locale = suggestion.locale || "de";
      setValues({
        ...values,
        [field.key]: { ...current, [locale]: suggestion.text },
      });
    } else {
      setValues({ ...values, [field.key]: suggestion.text });
    }
    setSuggestion(null);
    setStatus("Vorschlag übernommen. Noch nicht gespeichert.");
  }

  async function replaceImage(fieldKey: string, file: File) {
    if (!page) return;
    await run(async () => {
      const buffer = await file.arrayBuffer();
      const data = btoa(
        Array.from(new Uint8Array(buffer), (byte) =>
          String.fromCharCode(byte),
        ).join(""),
      );
      const contentType =
        file.type === "image/png"
          ? "image/png"
          : file.type === "image/webp"
            ? "image/webp"
            : "image/jpeg";
      const result = await api<{
        revision: string;
        hasDraft: boolean;
        values: Record<string, unknown>;
      }>("/media", {
        pageKey: page.key,
        fieldKey,
        revision: page.revision,
        filename: file.name,
        contentType,
        data,
        alt: "",
      });
      setPage({
        ...page,
        revision: result.revision,
        hasDraft: result.hasDraft,
        values: result.values,
      });
      setValues(structuredClone(result.values));
      setStatus("Bild im Entwurf ersetzt. Noch nicht veröffentlicht.");
    });
  }

  return (
    <section className="panel cms-panel site-cms" aria-label="Bestehende Website">
      <p className="eyebrow">studiojeker.ch · Sanity</p>
      <h2>Bestehende Website verwalten</h2>
      <p>
        Seiten, Texte, Medien und SEO der Firmenwebsite über das bestehende
        Sanity-CMS bearbeiten. Speichern legt nur Entwürfe an.
        Veröffentlichung nur nach Freigabe — nie automatisch.
      </p>
      <div className="actions">
        <a
          href={overview?.studioUrl || "https://studiojeker.sanity.studio/structure"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Sanity Studio öffnen ↗
        </a>
        <a
          href={overview?.stagingUrl || "https://staging2026.studiojeker.ch"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Staging öffnen ↗
        </a>
        <a
          href={overview?.liveUrl || "https://www.studiojeker.ch"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Live-Website öffnen ↗
        </a>
      </div>
      {overview && !overview.writeConfigured && (
        <p role="status" className="muted">
          Schreibzugriff ist noch nicht konfiguriert
          (SANITY_API_WRITE_TOKEN). Übersicht und Vorschau-Links funktionieren;
          Speichern und Veröffentlichen sind gesperrt.
        </p>
      )}
      {overview && !overview.publishAllowed && (
        <p role="status" className="muted">
          Veröffentlichung ist absichtlich deaktiviert
          (SITE_CMS_ALLOW_PUBLISH). Es werden keine produktiven
          Website-Inhalte freigegeben.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}

      {!page && (
        <>
          <h3>Seitenübersicht</h3>
          {!overview && !error && (
            <p role="status">Seiten werden aus Sanity geladen …</p>
          )}
          <div className="site-cms-list">
            {(overview?.pages || []).map((item) => (
              <article className="cms-document" key={item.key}>
                <h4>{item.title}</h4>
                <p className="muted">
                  {item.path} ·{" "}
                  {item.hasDraft
                    ? "Entwurf vorhanden"
                    : item.exists
                      ? "Veröffentlicht"
                      : "Nicht gefunden"}
                  {item.updatedAt
                    ? ` · ${new Date(item.updatedAt).toLocaleString("de-CH", {
                        timeZone: "Europe/Zurich",
                      })}`
                    : ""}
                </p>
                <div className="actions">
                  <button
                    type="button"
                    disabled={busy || !item.exists}
                    onClick={() => openPage(item.key)}
                  >
                    Bearbeiten
                  </button>
                  <a
                    href={item.stagingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Staging-Vorschau ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {page && (
        <div className="site-cms-editor">
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setPage(null);
                setSuggestion(null);
                setConfirmPublish(false);
              }}
            >
              Zurück zur Übersicht
            </button>
            <a href={page.stagingUrl} target="_blank" rel="noopener noreferrer">
              Staging-Vorschau ↗
            </a>
            <a href={page.studioUrl} target="_blank" rel="noopener noreferrer">
              In Sanity öffnen ↗
            </a>
          </div>
          <h3>{page.title}</h3>
          <p className="muted">
            Quelle: {page.source === "draft" ? "Entwurf" : "Veröffentlicht"}
            {page.hasDraft ? " · unveröffentlichte Änderungen" : ""}
          </p>

          <h4>Texte & Headlines</h4>
          {page.fields
            .filter((field) => field.group === "content")
            .map((field) =>
              field.kind === "localizedString" ||
              field.kind === "localizedText" ? (
                <LocalizedFields
                  key={field.key}
                  label={field.label}
                  max={field.max}
                  value={
                    (values[field.key] as { de?: string; en?: string }) || {
                      de: "",
                      en: "",
                    }
                  }
                  busy={busy}
                  onChange={(next) =>
                    setValues({ ...values, [field.key]: next })
                  }
                  onSuggest={(locale, current) =>
                    suggest(field.key, locale, current, "rewrite")
                  }
                />
              ) : (
                <label key={field.key} className="site-cms-field">
                  {field.label}
                  <textarea
                    rows={4}
                    maxLength={field.max}
                    value={String(values[field.key] || "")}
                    onChange={(e) =>
                      setValues({ ...values, [field.key]: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="secondary ai-button"
                    disabled={busy}
                    onClick={() =>
                      suggest(
                        field.key,
                        undefined,
                        String(values[field.key] || ""),
                        "rewrite",
                      )
                    }
                  >
                    KI-Vorschlag
                  </button>
                </label>
              ),
            )}

          <h4>SEO</h4>
          {page.fields
            .filter((field) => field.group === "seo")
            .map((field) =>
              field.kind === "localizedString" ||
              field.kind === "localizedText" ? (
                <LocalizedFields
                  key={field.key}
                  label={field.label}
                  max={field.max}
                  value={
                    (values[field.key] as { de?: string; en?: string }) || {
                      de: "",
                      en: "",
                    }
                  }
                  busy={busy}
                  onChange={(next) =>
                    setValues({ ...values, [field.key]: next })
                  }
                  onSuggest={(locale, current) =>
                    suggest(field.key, locale, current, "seo")
                  }
                />
              ) : (
                <label key={field.key} className="site-cms-field">
                  {field.label}
                  <textarea
                    rows={field.kind === "text" ? 3 : 2}
                    maxLength={field.max}
                    value={String(values[field.key] || "")}
                    onChange={(e) =>
                      setValues({ ...values, [field.key]: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="secondary ai-button"
                    disabled={busy}
                    onClick={() =>
                      suggest(
                        field.key,
                        undefined,
                        String(values[field.key] || ""),
                        "seo",
                      )
                    }
                  >
                    KI SEO-Optimierung
                  </button>
                </label>
              ),
            )}

          {page.fields.some((field) => field.group === "media") && (
            <>
              <h4>Medien</h4>
              {page.fields
                .filter((field) => field.group === "media")
                .map((field) => {
                  const media = (values[field.key] as {
                    url?: string;
                    alt?: string;
                  }) || { url: "", alt: "" };
                  return (
                    <div className="site-cms-field" key={field.key}>
                      <p>{field.label}</p>
                      {media.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={media.url}
                          alt={media.alt || field.label}
                          className="site-cms-thumb"
                        />
                      ) : (
                        <p className="muted">Kein Bild hinterlegt.</p>
                      )}
                      <label>
                        Bild ersetzen
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={busy || !page.writeConfigured}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void replaceImage(field.key, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
            </>
          )}

          {suggestion && (
            <section
              className="site-cms-suggestion"
              aria-label="KI-Textvorschlag"
            >
              <h4>KI-Vorschlag</h4>
              <p>{suggestion.text}</p>
              <p className="muted">{suggestion.rationale}</p>
              <div className="actions">
                <button type="button" disabled={busy} onClick={applySuggestion}>
                  Vorschlag übernehmen
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setSuggestion(null)}
                >
                  Verwerfen
                </button>
              </div>
            </section>
          )}

          <div className="site-cms-actions actions">
            <button
              type="button"
              disabled={busy || !page.writeConfigured}
              onClick={saveDraft}
            >
              Entwurf speichern
            </button>
            <a href={page.stagingUrl} target="_blank" rel="noopener noreferrer">
              Vorschau (Staging) ↗
            </a>
            <button
              type="button"
              className="secondary"
              disabled={busy || !page.hasDraft || !page.writeConfigured}
              onClick={requestReview}
            >
              Zur Freigabe
            </button>
            <label className="site-cms-confirm">
              <input
                type="checkbox"
                checked={confirmPublish}
                disabled={busy || !page.publishAllowed}
                onChange={(e) => setConfirmPublish(e.target.checked)}
              />
              Veröffentlichung ausdrücklich freigeben
            </label>
            <button
              type="button"
              disabled={
                busy ||
                !confirmPublish ||
                !page.publishAllowed ||
                !page.hasDraft ||
                !page.writeConfigured
              }
              onClick={publish}
            >
              Veröffentlichen
            </button>
          </div>
          <p className="muted">
            Speichern, Vorschau und Veröffentlichen sind getrennt. Ohne
            Freigabe-Häkchen und ohne SITE_CMS_ALLOW_PUBLISH bleibt die
            Live-Website unverändert.
          </p>
        </div>
      )}
    </section>
  );
}
