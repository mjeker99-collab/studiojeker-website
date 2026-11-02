"use client";

import { useEffect, useRef, useState } from "react";

type Step = { name: string; status: string; detail: string; createdAt: string };
type TaskView = {
  id: string;
  status: string;
  instruction: string;
  error: string | null;
  headline: string;
  nextStep: string;
  attempt: number;
  result: {
    version?: number;
    changedSlots: string[];
    previewReady: boolean;
    reviewUrl?: string;
  } | null;
  steps: Step[];
};
type Connection = { id: string; state: string; detail: string };

const active = new Set(["QUEUED", "RUNNING"]);

export default function NewsletterTask({
  contentId,
  version,
  dirty,
  onCompleted,
}: {
  contentId: string;
  version: number;
  dirty: boolean;
  onCompleted: () => Promise<void> | void;
}) {
  const [wish, setWish] = useState("Text redaktionell kürzen");
  const [task, setTask] = useState<TaskView | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const notified = useRef<number | null>(null);

  async function load() {
    const response = await fetch(
      `/api/hub/tasks?contentId=${encodeURIComponent(contentId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Auftrag konnte nicht geladen werden.");
    setConnections(data.connections || []);
    setTask(data.tasks?.[0] || null);
  }

  useEffect(() => {
    let stop = false;
    const timer = setTimeout(() => {
      load()
        .catch((error: Error) => {
          if (!stop) setNote(error.message);
        });
    }, 0);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // Reload when the saved newsletter version changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, version]);

  useEffect(() => {
    if (!task || !active.has(task.status)) return;
    const timer = setInterval(() => {
      load().catch((error: Error) => setNote(error.message));
    }, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, task?.status]);

  useEffect(() => {
    const saved = task?.result?.version;
    if (task?.status !== "SUCCEEDED" || !saved || saved === version) return;
    if (notified.current === saved) return;
    notified.current = saved;
    Promise.resolve(onCompleted()).catch((error) => setNote(error.message));
  }, [task, version, onCompleted]);

  async function start(type: "NEWSLETTER_REVISE_TEXT" | "NEWSLETTER_LAYOUT") {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/hub/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          version,
          type,
          instruction: wish.trim() || "Text redaktionell kürzen",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Auftrag nicht gestartet.");
      setTask(data);
      if (data.status === "QUEUED" || data.status === "RUNNING") {
        window.setTimeout(() => {
          load().catch((error) => setNote(error.message));
        }, 400);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Auftrag nicht gestartet.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!task) return;
    setBusy(true);
    setNote("");
    try {
      const response = await fetch(`/api/hub/tasks/${task.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Freigabe nicht gespeichert.");
      setTask(data);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Freigabe nicht gespeichert.");
    } finally {
      setBusy(false);
    }
  }

  const running = !!task && active.has(task.status);
  const waiting = task?.status === "WAITING_APPROVAL";
  const last = task?.steps?.[task.steps.length - 1];
  const shown = connections.filter((item) => item.id === "gpt" || item.id === "cursor");

  return (
    <section className="newsletter-task" aria-label="Newsletter-Auftrag">
      <h3>Newsletter bearbeiten</h3>
      <p>
        Ein Wunsch genügt. Textänderungen speichert GPT als neue Version.
        Layoutänderungen gehen an Cursor, sobald die Verbindung aus PR #322
        eingebunden ist. Es wird nichts versendet.
      </p>
      <label>
        Dein Wunsch
        <textarea
          rows={2}
          maxLength={500}
          value={wish}
          onChange={(event) => setWish(event.target.value)}
        />
      </label>
      <div className="task-actions">
        {waiting ? (
          <button type="button" disabled={busy} onClick={approve}>
            Freigabe erteilen
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || dirty || running}
            onClick={() => start("NEWSLETTER_REVISE_TEXT")}
          >
            Auftrag starten
          </button>
        )}
      </div>
      {dirty && (
        <p className="muted">Bitte zuerst die Version speichern.</p>
      )}
      <p className="task-status" role="status">
        {note || task?.headline || "Bereit. Formuliere den Wunsch und starte den Auftrag."}
      </p>
      {task && <p className="muted">{task.nextStep}</p>}
      <details>
        <summary>Details</summary>
        {task && (
          <p>
            Letzte Aktion: {last && last.detail !== task.headline ? last.detail : task.headline}
            {` · Versuch ${task.attempt}`}
          </p>
        )}
        {task?.result?.previewReady && task.result.version && (
          <p>Vorschau bereit für Version {task.result.version}.</p>
        )}
        {task?.result?.reviewUrl && (
          <p>
            <a href={task.result.reviewUrl} target="_blank" rel="noopener noreferrer">
              Gemeldeten Link prüfen
            </a>
          </p>
        )}
        {shown
          .filter((item) => item.detail !== task?.headline && item.detail !== last?.detail)
          .map((item) => (
            <p key={item.id}>{item.detail}</p>
          ))}
      </details>
    </section>
  );
}
