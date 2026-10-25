"use client";
import { useEffect, useRef, useState } from "react";

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}
type Entry = { id: string; title: string; revision: number; updatedAt: string };
async function api(path: string, body?: unknown) {
  const response = await fetch(`/api/project-drafts${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Projekt konnte nicht gesichert werden.");
  return result;
}
export default function ProjectSave<T extends object>({
  area,
  identity,
  suggestedTitle,
  value,
  busy = false,
  restore,
}: {
  area: string;
  identity: string;
  suggestedTitle: string;
  value: T;
  busy?: boolean;
  restore: (value: T) => Promise<void> | void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState<Entry | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const text = canonical(value);
  const [baseline, setBaseline] = useState(text);
  const identityRef = useRef(identity);
  const titleValue = title ?? (suggestedTitle || `${area} Projekt`);
  const dirty = saved
    ? saved !== text || active?.title !== titleValue
    : baseline !== text || title !== null;
  useEffect(() => {
    let live = true;
    api(`?area=${encodeURIComponent(area)}`)
      .then((result) => {
        if (!Array.isArray(result))
          throw new Error("Projektliste konnte nicht geladen werden.");
        if (live) setEntries(result);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [area]);
  useEffect(() => {
    if (identityRef.current === identity) return;
    const previousIdentity = identityRef.current;
    identityRef.current = identity;
    if (!previousIdentity && identity) return;
    // A different native project must not overwrite the previous draft.
    setActive(null);
    setSaved("");
    setTitle(null);
    setNotice("");
    setBaseline(text);
  }, [identity, text]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        (event.target as Element).closest(
          'nav[aria-label="Hauptnavigation"] button',
        ) &&
        !window.confirm("Ungesicherte Projektänderungen verwerfen?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  async function action(fn: () => Promise<void>) {
    if (lock.current || busy) return;
    lock.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sichern fehlgeschlagen.");
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  async function save(copy = false) {
    await action(async () => {
      const snapshot = text;
      const result: Entry = await api(active && !copy ? `/${active.id}` : "", {
        area,
        title: titleValue,
        payload: JSON.parse(snapshot),
        ...(active && !copy ? { revision: active.revision } : {}),
      });
      setActive(result);
      setSaved(snapshot);
      setTitle(result.title);
      setEntries((previous) => [
        result,
        ...previous.filter((item) => item.id !== result.id),
      ]);
      setNotice("Projekt gesichert. Du kannst hier später weiterarbeiten.");
    });
  }
  return (
    <section className="project-save" aria-label={`Projekt sichern · ${area}`}>
      <div className="project-save-controls">
        <label>
          Name der Sicherung
          <input
            value={titleValue}
            maxLength={200}
            disabled={busy || working}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy || working || !titleValue.trim()}
          onClick={() => void save()}
        >
          {working ? "Bitte warten …" : "Projekt sichern"}
        </button>
        {active && (
          <button
            type="button"
            className="secondary"
            disabled={busy || working}
            onClick={() => void save(true)}
          >
            Als Kopie sichern
          </button>
        )}
        <label>
          Projekt öffnen
          <select
            value={active?.id || ""}
            disabled={busy || working}
            onChange={(e) => {
              const id = e.target.value;
              if (
                !id ||
                (dirty &&
                  !window.confirm(
                    "Ungesicherte Änderungen verwerfen und Projekt öffnen?",
                  ))
              )
                return;
              void action(async () => {
                const result = await api(
                  `/${id}?area=${encodeURIComponent(area)}`,
                );
                await restore(result.payload as T);
                // The restored native identity is updated before the next effect.
                identityRef.current = String(result.payload.nativeId ?? "");
                setActive(result);
                setTitle(result.title);
                setSaved(canonical(result.payload));
                setNotice("Gesichertes Projekt geöffnet.");
              });
            }}
          >
            <option value="">Gesicherte Projekte auswählen</option>
            {entries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ·{" "}
                {new Date(item.updatedAt).toLocaleString("de-CH")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">
        {dirty
          ? "Ungesicherte Änderungen"
          : active
            ? `Gesichert am ${new Date(active.updatedAt).toLocaleString("de-CH")}`
            : "Auftrag und Arbeitsstand als Projekt sichern."}{" "}
        {notice}
      </p>
      <p className="muted">
        Sichert deinen Arbeitsstand inklusive offener Eingaben. Startet keinen
        GPT-Auftrag und veröffentlicht nichts.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
