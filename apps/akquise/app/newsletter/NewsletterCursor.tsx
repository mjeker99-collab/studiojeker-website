"use client";

import { useEffect, useRef, useState } from "react";
import {
  CURSOR_STATUS_LABEL,
  openableCursorHref,
  type PublicCursorTask,
} from "@/lib/cursor/status";

type Handoff = { contentId: string; block: "protected" | "unapproved" | null };
type Content = {
  id: string;
  kind: string;
  title: string;
  version: number;
  updatedAt: string;
  archivedAt: string | null;
};
type Panel = {
  connected: boolean;
  tasks: PublicCursorTask[];
  handoffs: Handoff[];
};
type State = { contents?: Content[]; newsletterCursor?: Panel };

const blockText = {
  protected: "Diese Ausgabe ist geschützt.",
  unapproved:
    "Für diese Ausgabe ist noch kein freigegebener Arbeitsstand hinterlegt.",
};

export default function NewsletterCursor() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const restoredFor = useRef("");
  function remember(
    previous: State | null,
    task?: PublicCursorTask,
    connected?: boolean,
  ) {
    if (!previous?.newsletterCursor || !task) return previous;
    return {
      ...previous,
      newsletterCursor: {
        ...previous.newsletterCursor,
        connected: connected ?? previous.newsletterCursor.connected,
        tasks: [
          ...previous.newsletterCursor.tasks.filter(
            (item) => item.contentId !== task.contentId,
          ),
          task,
        ],
      },
    };
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

  const newsletters = (state?.contents ?? [])
    .filter((content) => content.kind === "NEWSLETTER" && !content.archivedAt)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const current = selected || newsletters[0]?.id || "";
  const task = state?.newsletterCursor?.tasks.find(
    (item) => item.contentId === current,
  );
  const connected = Boolean(state?.newsletterCursor?.connected);
  const block =
    state?.newsletterCursor?.handoffs.find((item) => item.contentId === current)
      ?.block ?? (newsletters.length ? "unapproved" : null);
  const active =
    task?.status === "HANDED_OFF" || task?.status === "IN_PROGRESS";

  useEffect(() => {
    if (!current || !active) return;
    const timer = setInterval(() => {
      void fetch("/api/hub/newsletter-cursor-refresh/" + current, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            error?: string;
            connected?: boolean;
            task?: PublicCursorTask | null;
          };
          if (!response.ok) {
            setError(data.error || "Status konnte nicht geprüft werden.");
            return;
          }
          setState((previous) =>
            remember(previous, data.task ?? undefined, Boolean(data.connected)),
          );
        })
        .catch(() => setError("Status konnte nicht geprüft werden."));
    }, 15000);
    return () => clearInterval(timer);
  }, [current, active]);

  useEffect(() => {
    if (!current || restoredFor.current === current) return;
    restoredFor.current = current;
    setInstruction(
      state?.newsletterCursor?.tasks.find((item) => item.contentId === current)
        ?.instruction || "",
    );
  }, [current, state]);

  const notice = !state
    ? ""
    : !connected
      ? "Cursor noch nicht verbunden."
      : !newsletters.length
        ? "Speichere zuerst den Newsletter. Danach kannst du die Änderung hier starten."
        : block
          ? blockText[block]
          : task?.pending
            ? "Die Übergabe wird geprüft."
            : "";
  const previewUrl = openableCursorHref(task?.previewUrl || "");
  const reviewUrl = openableCursorHref(task?.reviewUrl || "");
  const disabled =
    busy ||
    !connected ||
    !current ||
    !instruction.trim() ||
    Boolean(block) ||
    Boolean(task?.pending) ||
    active;

  async function handoff() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/hub/newsletter-cursor/" + current, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = (await response.json()) as {
        error?: string;
        task?: PublicCursorTask;
      };
      if (!response.ok)
        throw new Error(
          data.error || "Die Änderung konnte nicht gestartet werden.",
        );
      if (data.task)
        setState((previous) => remember(previous, data.task, true));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Die Änderung konnte nicht gestartet werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="newsletter-cursor"
      aria-label="Newsletter an Cursor übergeben"
    >
      <h3>Änderung umsetzen</h3>
      <p>
        Beschreibe, was am gespeicherten Newsletter geändert werden soll. Die
        Vorschau prüfst du danach selbst. Nichts wird versendet oder
        veröffentlicht.
      </p>
      <label>
        Newsletter
        <select
          value={current}
          disabled={!newsletters.length}
          onChange={(event) => {
            const id = event.target.value;
            setSelected(id);
            setError("");
            setInstruction(
              state?.newsletterCursor?.tasks.find(
                (item) => item.contentId === id,
              )?.instruction || "",
            );
          }}
        >
          {!newsletters.length && (
            <option value="">Noch kein Newsletter</option>
          )}
          {newsletters.map((content) => (
            <option key={content.id} value={content.id}>
              {content.title} · Version {content.version}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dein Änderungswunsch
        <textarea
          rows={4}
          maxLength={4000}
          value={instruction}
          disabled={!newsletters.length}
          onChange={(event) => setInstruction(event.target.value)}
        />
      </label>
      <p role="status">Status: {task?.label || CURSOR_STATUS_LABEL.NOT_SENT}</p>
      {notice && <p>{notice}</p>}
      {(error || task?.errorMessage) && (
        <p role="alert">{error || task?.errorMessage}</p>
      )}
      <div className="newsletter-cursor-actions">
        <button
          type="button"
          disabled={disabled}
          aria-busy={busy}
          onClick={() => void handoff()}
        >
          Mit Cursor umsetzen
        </button>
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
      <p className="muted">
        Vorschau bereit ist noch keine Freigabe. StudioONE versendet und
        veröffentlicht den Newsletter nicht.
      </p>
    </section>
  );
}
