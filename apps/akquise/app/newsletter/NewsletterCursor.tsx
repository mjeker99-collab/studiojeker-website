"use client";

import { useEffect, useState } from "react";
import {
  CURSOR_STATUS_LABEL,
  openableCursorHref,
  type PublicCursorTask,
} from "@/lib/cursor/status";

type Edition = {
  contentId: string;
  title: string;
  version: number;
  currentVersion: number;
  stale: boolean;
  prUrl: string;
};
type Panel = {
  connected: boolean;
  nextStep: string;
  tasks: PublicCursorTask[];
  editions: Edition[];
};
type State = { newsletterCursor?: Panel };

export default function NewsletterCursor({
  instruction,
  onOpenTask,
}: {
  instruction: string;
  onOpenTask: () => void;
}) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/hub/state", { cache: "no-store" });
    const data = (await response.json()) as State & { error?: string };
    if (!response.ok)
      throw new Error(data.error || "Newsletter konnten nicht geladen werden.");
    setState(data);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/hub/state", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as State & { error?: string };
        if (!response.ok)
          throw new Error(
            data.error || "Newsletter konnten nicht geladen werden.",
          );
        if (!controller.signal.aborted) setState(data);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(
          reason instanceof Error ? reason.message : "Laden fehlgeschlagen.",
        );
      });
    return () => controller.abort();
  }, []);

  const panel = state?.newsletterCursor;
  const edition = panel?.editions[0];
  const task = panel?.tasks.find(
    (item) => item.contentId === edition?.contentId,
  );
  const connected = Boolean(panel?.connected);
  const active =
    task?.status === "HANDED_OFF" || task?.status === "IN_PROGRESS";

  useEffect(() => {
    if (!edition || !active) return;
    const timer = setInterval(() => {
      void fetch("/api/hub/newsletter-cursor-refresh/" + edition.contentId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            error?: string;
            task?: PublicCursorTask;
          };
          if (!response.ok) {
            setError(data.error || "Status konnte nicht geprüft werden.");
            return;
          }
          const task = data.task;
          if (!task) return;
          setState((previous) => {
            if (!previous?.newsletterCursor) return previous;
            return {
              ...previous,
              newsletterCursor: {
                ...previous.newsletterCursor,
                tasks: [
                  ...previous.newsletterCursor.tasks.filter(
                    (item) => item.contentId !== task.contentId,
                  ),
                  task,
                ],
              },
            };
          });
        })
        .catch(() => setError("Status konnte nicht geprüft werden."));
    }, 15000);
    return () => clearInterval(timer);
  }, [edition, active]);

  async function post(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        route?: string;
        task?: PublicCursorTask;
      };
      if (!response.ok)
        throw new Error(
          data.error || "Der Auftrag konnte nicht gestartet werden.",
        );
      if (data.route === "gpt") onOpenTask();
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Der Auftrag konnte nicht gestartet werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = openableCursorHref(task?.previewUrl || "");
  const reviewUrl = openableCursorHref(task?.reviewUrl || "");

  return (
    <section className="newsletter-cursor" aria-label="Newsletter-Auftrag">
      <h3>Auftrag</h3>
      {!panel?.editions.length && (
        <>
          <p>
            Es gibt noch keine eigene Ausgabe. Lege eine neue Ausgabe als Kopie
            der geschützten Vorlage an. Die Vorlage selbst bleibt unverändert.
          </p>
          <div className="newsletter-cursor-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void post("/api/hub/newsletter-edition", {})}
            >
              Neue Ausgabe anlegen
            </button>
          </div>
        </>
      )}
      {edition && (
        <>
          <p>
            {edition.title} · Version {edition.currentVersion}
          </p>
          <p role="status">
            Status: {task?.label || CURSOR_STATUS_LABEL.NOT_SENT}
            {task?.note ? `. ${task.note}` : ""}
          </p>
          {edition.stale && (
            <p role="alert">
              Diese Ausgabe wurde geändert. Der bisherige Auftrag gilt nur für
              Version {edition.version} und wird nicht übertragen.
            </p>
          )}
          <div className="newsletter-cursor-actions">
            {edition.stale ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void post(
                    "/api/hub/newsletter-edition-restart/" + edition.contentId,
                    {},
                  )
                }
              >
                Für die neue Version neu beginnen
              </button>
            ) : (
              <button
                type="button"
                disabled={busy || active || !instruction.trim()}
                onClick={() => {
                  if (!instruction.trim()) {
                    onOpenTask();
                    return;
                  }
                  void post("/api/hub/newsletter-cursor/" + edition.contentId, {
                    instruction,
                  });
                }}
              >
                Auftrag starten
              </button>
            )}
            {previewUrl && (
              <a
                className="secondary"
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Vorschau öffnen
              </a>
            )}
            {reviewUrl && (
              <a
                className="secondary"
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Änderungen prüfen
              </a>
            )}
          </div>
        </>
      )}
      {!connected && (
        <p>
          Cursor ist noch nicht verbunden. Textaufträge kann GPT vorbereiten.
          Technische Änderungen warten auf den Schlüssel.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
