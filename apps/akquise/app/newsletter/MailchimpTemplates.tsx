"use client";

import { useEffect, useState } from "react";

type Template = { id: number; name: string; type?: string };

export default function MailchimpTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/mailchimp/templates", { cache: "no-store", signal });
      const body = await response.json();
      if (signal?.aborted) return;
      if (!response.ok) throw new Error(body.error || "Mailchimp nicht erreichbar.");
      setConnected(body.connected);
      setTemplates(body.templates);
    } catch (e) {
      if (!signal?.aborted && (e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <section className="panel padded" aria-label="Mailchimp-Vorlagen">
      <h2>Mailchimp-Vorlagen</h2>
      <p>Vorhandene Vorlagen aus dem verbundenen Mailchimp-Konto anzeigen. Die Originale werden nicht verändert.</p>
      <button type="button" className="secondary" disabled={busy} onClick={() => {
        setBusy(true);
        setError("");
        void refresh();
      }}>
        {busy ? "Vorlagen werden geladen…" : "Mailchimp-Vorlagen aktualisieren"}
      </button>
      {error && <p role="alert">{error}</p>}
      {connected === false && <p>Mailchimp ist noch nicht verbunden. Den API-Schlüssel ausschliesslich auf dem Render-Server hinterlegen.</p>}
      {connected && templates.length === 0 && <p>Keine aktiven Vorlagen im Mailchimp-Konto gefunden.</p>}
      {connected && templates.length > 0 && (
        <ul>
          {templates.map((template) => (
            <li key={template.id}>{template.name} <small>({template.type || "Vorlage"} · ID {template.id})</small></li>
          ))}
        </ul>
      )}
      <p className="muted">Mailchimp-Vorlagen werden hier vorerst nur angezeigt. Ein bearbeitbarer Import muss das Layout und die Mailchimp-Merge-Tags sicher übernehmen.</p>
    </section>
  );
}
