"use client";
import { useEffect, useRef, useState } from "react";

type Contact = {
  id: string;
  organisation: string;
  firstName: string;
  lastName: string;
  email: string;
  website: string;
  existing: boolean;
};
export default function CustomerImport({
  onImported,
  onClose,
  onBusy,
}: {
  onImported: (notice: string) => Promise<void>;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customers/masterlist", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(
            value.error || "Masterliste konnte nicht geladen werden.",
          );
        setContacts(value);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const visible = contacts.filter((c) =>
    [c.organisation, c.firstName, c.lastName, c.email]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const available = visible.filter((c) => !c.existing);
  const allSelected =
    available.length > 0 && available.every((c) => selected.includes(c.id));
  async function importSelected() {
    if (lock.current || !selected.length) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selected }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Import fehlgeschlagen. Bitte erneut versuchen.",
        );
      setSelected([]);
      await onImported(
        `${result.created} Kundenprofile importiert. ${result.skipped} bereits vorhandene oder mehrfach ausgewählte Firmen übersprungen.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Verbindung unterbrochen. Du kannst den Import erneut starten; vorhandene Firmen werden übersprungen.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="panel padded"
      aria-label="Kunden aus Masterliste importieren"
      aria-busy={loading || busy}
    >
      <h3>Aus Masterliste importieren</h3>
      <p>
        Wähle Firmen aus den bereits importierten Kontakten. Pro Firma entsteht
        ein Kundenprofil. Vorhandene Profile bleiben erhalten.
      </p>
      <p className="muted">
        Fehlt eine Firma? Die Masterliste zuerst unter Kontakte als Excel oder
        CSV importieren.
      </p>
      {loading && <p role="status">Masterliste wird geladen …</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {error && !contacts.length && (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setError("");
            setLoading(true);
            setAttempt((v) => v + 1);
          }}
        >
          Erneut laden
        </button>
      )}
      {!loading && (
        <>
          <label>
            Masterliste durchsuchen
            <input
              autoFocus
              value={query}
              disabled={busy}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Firma, Name oder E-Mail"
            />
          </label>
          <p>
            {selected.length} ausgewählt · {visible.length} Kontakte gefunden
          </p>
          {!!available.length && (
            <label className="check">
              <input
                type="checkbox"
                disabled={busy}
                checked={allSelected}
                onChange={() =>
                  setSelected((current) =>
                    allSelected
                      ? current.filter(
                          (id) => !available.some((c) => c.id === id),
                        )
                      : [
                          ...new Set([
                            ...current,
                            ...available.map((c) => c.id),
                          ]),
                        ],
                  )
                }
              />
              Alle angezeigten neuen Kontakte auswählen
            </label>
          )}
          <div
            style={{
              maxHeight: "24rem",
              overflowY: "auto",
              overflowWrap: "anywhere",
            }}
          >
            {visible.map((c) => (
              <label className="check" key={c.id}>
                <input
                  type="checkbox"
                  disabled={busy || c.existing}
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, c.id]
                        : current.filter((id) => id !== c.id),
                    )
                  }
                />
                <span>
                  <strong>{c.organisation}</strong> ·{" "}
                  {[c.firstName, c.lastName].join(" ")}
                  <br />
                  {c.email || "Keine E-Mail hinterlegt"}
                  {c.existing && " · Kundenprofil vorhanden"}
                </span>
              </label>
            ))}
          </div>
          {!visible.length && (
            <p>
              {contacts.length
                ? "Keine passenden Kontakte gefunden."
                : "Die Masterliste enthält noch keine Kontakte."}
            </p>
          )}
        </>
      )}
      <div className="actions">
        <button
          type="button"
          disabled={loading || busy || !selected.length}
          onClick={importSelected}
        >
          {busy
            ? "Import läuft …"
            : `${selected.length} Kontakte als Kunden übernehmen`}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Schliessen
        </button>
      </div>
    </section>
  );
}
