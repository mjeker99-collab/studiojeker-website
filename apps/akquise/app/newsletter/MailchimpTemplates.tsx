"use client";

import { useEffect, useMemo, useState } from "react";

type Template = { id: number; name: string; type?: string };
const PAGE_SIZE = 9;

export default function MailchimpTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);

  function refresh(signal?: AbortSignal) {
    if (!signal) { setBusy(true); setError(""); }
    return fetch("/api/mailchimp/templates", { cache: "no-store", signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Mailchimp nicht erreichbar.");
        return body;
      })
      .then((body) => {
        if (signal?.aborted) return;
        setConnected(body.connected);
        setTemplates(body.templates);
        setPage(1);
      })
      .catch((e) => {
        if (!signal?.aborted && (e as Error).name !== "AbortError") setError((e as Error).message);
      })
      .finally(() => {
        if (!signal?.aborted) setBusy(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.type || "other"))).sort(),
    [templates],
  );
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("de-CH");
    return templates.filter((template) =>
      (category === "all" || (template.type || "other") === category) &&
      (!term || template.name.toLocaleLowerCase("de-CH").includes(term)),
    );
  }, [templates, category, query]);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className="panel padded" aria-label="Mailchimp-Vorlagen">
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Mailchimp-Vorlagen</h2>
          <p className="muted" style={{ margin: 0 }}>
            {connected ? `${templates.length} Vorlagen gefunden · Nur Lesezugriff` : "Vorlagen des verbundenen Mailchimp-Kontos"}
          </p>
        </div>
        <button type="button" className="secondary" disabled={busy} onClick={() => void refresh()}>
          {busy ? "Laden…" : "↻ Aktualisieren"}
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
      {connected === false && <p>Mailchimp ist nicht verbunden. Den API-Schlüssel nur auf Render hinterlegen.</p>}
      {connected && templates.length === 0 && <p>Keine aktiven Vorlagen gefunden.</p>}

      {connected && templates.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18, marginBottom: 14 }}>
            <label style={{ flex: "2 1 220px", margin: 0 }}>
              Vorlagen suchen
              <input
                type="search"
                value={query}
                placeholder="z. B. Newsletter 2026"
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              />
            </label>
            <label style={{ flex: "1 1 160px", margin: 0 }}>
              Typ
              <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
                <option value="all">Alle Typen</option>
                {categories.map((type) => <option key={type} value={type}>{type === "user" ? "Eigene Vorlagen" : type === "base" ? "Basisvorlagen" : type === "gallery" ? "Galerie" : type}</option>)}
              </select>
            </label>
          </div>
          <p className="muted" aria-live="polite">{matches.length} Treffer · Seite {current} von {pages}</p>
          {matches.length === 0 ? (
            <p>Keine passenden Vorlagen. Suchbegriff oder Filter ändern.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 12 }}>
              {visible.map((template) => (
                <article key={template.id} style={{ border: "1px solid var(--border, #d9e0e5)", borderRadius: 12, padding: 16, minWidth: 0, background: "var(--surface, transparent)" }}>
                  <div style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 10, background: "rgba(0,200,255,.12)", color: "#008cae", marginBottom: 12 }} aria-hidden="true">✉</div>
                  <strong style={{ display: "block", overflowWrap: "anywhere", lineHeight: 1.4 }}>{template.name || "Ohne Titel"}</strong>
                  <span className="muted" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
                    {template.type === "user" ? "Eigene Vorlage" : template.type === "base" ? "Basisvorlage" : template.type === "gallery" ? "Galerie" : "Mailchimp-Vorlage"}
                  </span>
                </article>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="actions" style={{ marginTop: 16, alignItems: "center" }}>
              <button type="button" className="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>← Zurück</button>
              <span className="muted">Seite {current} / {pages}</span>
              <button type="button" className="secondary" disabled={current >= pages} onClick={() => setPage(current + 1)}>Weiter →</button>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <button type="button" className="secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Hinweise ausblenden" : "Wie bearbeite ich eine Vorlage?"}
            </button>
            {expanded && <p className="muted">Die bestehenden Mailchimp-Vorlagen bleiben geschützt. Bearbeitbare StudioONE-Entwürfe entstehen über «Newsletter erstellen» und die Studiojeker-Vorlagenbibliothek. Der direkte Import fremder Mailchimp-Layouts ist noch nicht implementiert.</p>}
          </div>
        </>
      )}
    </section>
  );
}
