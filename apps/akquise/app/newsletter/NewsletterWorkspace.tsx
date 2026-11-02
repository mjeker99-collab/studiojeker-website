"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentInput } from "@/lib/hub/input";
import { newsletterEditReply } from "@/lib/hub/newsletter-edit";
import type { studioState } from "@/lib/studio/service";
import { NewsletterPreview } from "./NewsletterEditor";

type State = Awaited<ReturnType<typeof studioState>>;
type Saved = { id: string; version: number; studioSeriesId: string | null };

async function post(path: string, body: unknown) {
  const response = await fetch("/api/studio/" + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Änderung fehlgeschlagen.");
  return result;
}

export default function NewsletterWorkspace({ value, saved, save, reload, onBusy }: {
  value: ContentInput;
  saved: Saved | null;
  save: (value: ContentInput) => Promise<Saved>;
  reload: (id: string) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [before, setBefore] = useState<ContentInput | null>(null);
  const seriesId = saved?.studioSeriesId || "";

  async function refresh(id = seriesId) {
    const response = await fetch("/api/studio/state" + (id ? "?seriesId=" + encodeURIComponent(id) : ""), { cache: "no-store" });
    const next: State & { error?: string } = await response.json();
    if (!response.ok) throw new Error(next.error || "GPT-Dialog konnte nicht geladen werden.");
    setState(next);
    return next;
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/studio/state" + (seriesId ? "?seriesId=" + encodeURIComponent(seriesId) : ""), {
      cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "GPT-Dialog konnte nicht geladen werden.");
      if (!controller.signal.aborted) setState(result);
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [seriesId, saved?.version]);

  async function perform(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true); onBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen."); }
    finally { running.current = false; setBusy(false); onBusy(false); }
  }

  async function apply(jobId: string, id: string, session: string) {
    const result = await post("newsletter-apply/" + jobId, {});
    await reload(id);
    await refresh(session);
    setNotice(result.changed === false ? "Antwort gespeichert. Der Newsletter bleibt unverändert." : "Änderung gespeichert. Die Vorschau ist aktualisiert.");
  }

  async function send() {
    if (!message.trim() || !confirmed || !state?.config.connected) return;
    await perform(async () => {
      const current = await save(value);
      const session = await post("newsletter-session", { id: current.id, version: current.version });
      // Persisted association makes this conversation available after reopening.
      await reload(current.id);
      setBefore(value);
      const job = await post("jobs", {
        seriesId: session.seriesId, kind: "CHAT", message: message.trim(),
        newsletterEdit: { id: current.id, version: current.version },
        useProjectMemory: false, contentId: null, requestKey: crypto.randomUUID(),
        referenceIds: [], referenceRights: false, referenceTransfer: false, confirmedCosts: true,
      });
      setMessage("");
      try {
        await post("run/" + job.id, { confirmedCosts: true });
        const latest = await refresh(session.seriesId);
        const completed = latest.jobs.find((item) => item.id === job.id);
        if (completed?.status !== "SUCCEEDED")
          throw new Error(completed?.error || "GPT-Auftrag noch nicht abgeschlossen. Status aktualisieren.");
        await apply(job.id, current.id, session.seriesId);
      } catch (e) {
        await refresh(session.seriesId);
        throw e;
      }
    });
  }

  const jobs = (state?.jobs || []).filter((job) => {
    const input = job.input as { request?: { newsletterEdit?: { id?: string } } };
    return job.seriesId === seriesId && input.request?.newsletterEdit?.id === saved?.id;
  }).slice().reverse();
  return (
    <section className="newsletter-dialog-workspace" aria-label="Newsletter mit GPT bearbeiten">
      <div>
        <h3>Dein Newsletter</h3>
        <NewsletterPreview subject={value.subject} preheader={value.preheader} newsletter={value.newsletter} />
      </div>
      <div className="newsletter-dialog-panel">
        <h3>Mit GPT bearbeiten</h3>
        <p>Beschreibe deine Änderung. GPT passt den geöffneten Newsletter an und speichert den Entwurf automatisch.</p>
        <div className="newsletter-dialog-history" role="log" aria-label="Newsletter-Gespräch">
          {jobs.map((job) => {
            const input = job.input as { request?: { message?: string } };
            const parsed = (() => {
              try { return newsletterEditReply.parse(JSON.parse((job.result as { reply?: string })?.reply || "")); }
              catch { return null; }
            })();
            return <article key={job.id}>
              <p><strong>Du</strong><br />{input.request?.message}</p>
              <p className="preserve-lines"><strong>GPT</strong><br />{parsed?.reply || job.error || "Auftrag wartet oder wird bearbeitet …"}</p>
              {job.status === "APPLIED" && <small>Im Entwurf berücksichtigt</small>}
              {job.status === "SUCCEEDED" && saved && <button type="button" className="secondary" disabled={busy} onClick={() => perform(async () => {
                setBefore(value);
                await apply(job.id, saved.id, seriesId);
              })}>Änderung übernehmen</button>}
              {job.status === "QUEUED" && <button type="button" className="secondary" disabled={busy || !confirmed} onClick={() => perform(async () => {
                await post("run/" + job.id, { confirmedCosts: true });
                await refresh();
              })}>Gespeicherten Auftrag starten</button>}
            </article>;
          })}
        </div>
        <label>
          Was möchtest du ändern?
          <textarea rows={4} maxLength={4000} value={message} disabled={busy}
            placeholder="Zum Beispiel: Kürze den Einstieg und setze den Promo-Link auf https://vimeo.com/1241749203."
            onChange={(event) => setMessage(event.target.value)} />
        </label>
        <label className="check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />
          GPT für diesen Dialog nutzen (API-Kosten gemäss eingerichtetem Budget).
        </label>
        <div className="actions">
          <button type="button" disabled={busy || !state?.config.connected || !confirmed || !message.trim()} onClick={send}>
            {busy ? "Wird bearbeitet …" : "Mit GPT ändern"}
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => perform(async () => { await refresh(); })}>Status aktualisieren</button>
          {before && <button type="button" className="secondary" disabled={busy} onClick={() => perform(async () => {
            await save(before); setBefore(null); setNotice("Vorheriger Entwurf wiederhergestellt und gespeichert.");
          })}>Letzte Änderung rückgängig</button>}
        </div>
        {state && !state.config.connected && <p role="alert">GPT ist derzeit nicht verbunden. Die Vorschau und manuelle Bearbeitung sind verfügbar.</p>}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <p className="muted">Texte, Bilder und Links lassen sich gezielt ändern. Für Bilder benötigt GPT eine öffentliche Bildadresse. Gestaltung und Schriften folgen der Vorlage.</p>
      </div>
    </section>
  );
}
