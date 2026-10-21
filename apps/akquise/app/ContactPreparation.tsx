"use client";
import { useState } from "react";
import type {
  ContactPreparation as Proposal,
  PreparationFields,
} from "../lib/contact-preparation";

type Result = { id: string; ok: boolean; message: string; revision?: number };
type Edit = { id: string; revision: number; values: PreparationFields };
async function post<T>(action: string, data: unknown): Promise<T> {
  const response = await fetch(`/api/contacts/preparation/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Anfrage fehlgeschlagen.");
  return result;
}
function Fields({
  values,
  change,
  shared = false,
}: {
  values: PreparationFields;
  change: (values: PreparationFields) => void;
  shared?: boolean;
}) {
  return (
    <div className="form-grid">
      <label>
        Prüfstatus
        <select
          value={values.confidence ?? ""}
          onChange={(e) =>
            change({
              confidence: (e.target.value ||
                undefined) as PreparationFields["confidence"],
            })
          }
        >
          {shared && (
            <option value="">Aus vorhandenen Angaben übernehmen</option>
          )}
          <option value="UNCONFIRMED">Unbestätigt</option>
          <option value="ESTIMATED">Geschätzt</option>
          <option value="GENERAL">Allgemeine Adresse</option>
          <option value="VERIFIED">Persönliche Adresse verifiziert</option>
        </select>
      </label>
      <label>
        Verifikationsdatum
        <input
          type="date"
          value={values.verifiedAt?.slice(0, 10) ?? ""}
          onChange={(e) =>
            change({
              verifiedAt: e.target.value
                ? e.target.value + "T00:00:00.000Z"
                : "",
            })
          }
        />
      </label>
      <label>
        Quellen-URL
        <input
          type="url"
          value={values.sourceUrl ?? ""}
          maxLength={4000}
          onChange={(e) => change({ sourceUrl: e.target.value })}
        />
      </label>
      <label>
        Dokumentierter Anknüpfungspunkt
        <textarea
          rows={3}
          value={values.hook ?? ""}
          maxLength={4000}
          onChange={(e) => change({ hook: e.target.value })}
        />
      </label>
    </div>
  );
}
export default function ContactPreparation({
  ids,
  contacts,
  refresh,
  begin,
}: {
  ids: string[];
  contacts: {
    id: string;
    organisation: string;
    firstName: string;
    lastName: string;
  }[];
  refresh: () => Promise<void>;
  begin: () => void;
}) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [shared, setShared] = useState<PreparationFields>({});
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const eligible = proposals?.filter((p) => p.ready) ?? [];
  const name = (id: string) => {
    const c = contacts.find((c) => c.id === id);
    return c ? `${c.organisation} · ${c.firstName} ${c.lastName}` : "Kontakt";
  };
  function changed() {
    setDirty(true);
    setConfirmed(false);
  }
  async function preview(rowEdits = edits, defaults = shared) {
    const data = await post<{ contacts: Proposal[] }>("preview", {
      ids,
      shared: defaults,
      edits: Object.values(rowEdits),
    });
    setProposals(data.contacts);
    setChosen(data.contacts.filter((p) => p.ready).map((p) => p.id));
    setConfirmed(false);
    setDirty(false);
  }
  async function run(work: () => Promise<void>) {
    begin();
    setBusy(true);
    setError("");
    setResults([]);
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Anfrage fehlgeschlagen. Bitte neu laden.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function apply(action: "apply" | "prepare") {
    if (!proposals || dirty || !confirmed) return;
    const data = await post<{ results: Result[] }>(action, {
      confirmed: true,
      shared,
      contacts: proposals
        .filter((p) => chosen.includes(p.id))
        .map((p) => ({
          id: p.id,
          revision: p.revision,
          values: edits[p.id]?.values,
        })),
    });
    setResults(data.results);
    // Retain only failed row corrections for retry; successful rows now have a
    // new revision. Never discard a user's unresolved correction silently.
    const remaining = Object.fromEntries(
      Object.entries(edits)
        .filter(([id]) => !data.results.some((r) => r.id === id && r.ok))
        .map(([id, edit]) => [
          id,
          {
            ...edit,
            revision:
              data.results.find((r) => r.id === id)?.revision ?? edit.revision,
          },
        ]),
    );
    setEdits(remaining);
    setConfirmed(false);
    await refresh();
    await preview(remaining);
  }
  return (
    <section
      className="contact-preparation"
      aria-labelledby="contact-preparation-title"
      aria-busy={busy}
    >
      <h2 id="contact-preparation-title">{ids.length} Kontakte vorbereiten</h2>
      <p>
        Gemeinsame Angaben einmal ergänzen, Vorschau kontrollieren und
        persönliche Entwürfe für die Auswahl vorbereiten.
      </p>
      {ids.length > 200 && (
        <p role="alert">Bitte höchstens 200 Kontakte auswählen.</p>
      )}
      <fieldset disabled={busy}>
        <legend>Gemeinsame Angaben für die Auswahl</legend>
        <p>
          Nur leere Felder und unbestätigte Prüfstatus werden ergänzt.
          Vorhandene Kontaktangaben und eindeutige Angaben aus den Notizen haben
          Vorrang.
        </p>
        <p>
          Eine gemeinsame Quelle oder ein gemeinsamer Anknüpfungspunkt muss für
          alle betroffenen Kontakte zutreffen. Das Datum ist das tatsächliche
          Prüfdatum.
        </p>
        <Fields
          shared
          values={shared}
          change={(v) => {
            setShared({ ...shared, ...v });
            changed();
          }}
        />
      </fieldset>
      <div className="actions">
        <button
          disabled={busy || ids.length > 200}
          onClick={() => run(() => preview())}
        >
          {proposals
            ? "Vorschau aktualisieren"
            : "Prüfdaten aus Notizen prüfen"}
        </button>
        <button
          className="secondary"
          disabled={busy || ids.length > 200 || dirty}
          onClick={() =>
            run(async () => {
              const data = await post<{ results: Result[] }>("drafts", { ids });
              setResults(data.results);
              await refresh();
            })
          }
        >
          Entwürfe für Auswahl vorbereiten
        </button>
        {proposals && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setEdits({});
                await preview({});
              })
            }
          >
            Einzelkorrekturen verwerfen und neu laden
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <div role="status">
          <p>
            <strong>
              {results.filter((r) => r.ok).length} erfolgreich ·{" "}
              {results.filter((r) => !r.ok).length} noch zu bearbeiten
            </strong>
          </p>
          <ul>
            {results.map((r) => (
              <li key={r.id}>
                <strong>{name(r.id)}:</strong> {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {dirty && (
        <p role="status">
          Angaben geändert. Bitte die Vorschau aktualisieren und erneut
          bestätigen.
        </p>
      )}
      {proposals && (
        <>
          <p>
            {eligible.length} Kontakte vollständig ·{" "}
            {proposals.filter((p) => !p.ready).length} mit offenen Angaben.
          </p>
          <p className="warning">
            Die Vorschau übernimmt dokumentierte und von dir eingegebene
            Angaben. Sie prüft keine Websites erneut. Kontaktänderungen machen
            frühere Freigaben ungültig. Newsletter-Einwilligung und
            Versandfreigabe bleiben separate Schritte.
          </p>
          <div className="actions">
            <button
              className="secondary"
              disabled={busy || dirty || !eligible.length}
              onClick={() => {
                setChosen(eligible.map((p) => p.id));
                setConfirmed(false);
              }}
            >
              Alle vollständigen Vorschläge auswählen
            </button>
            <button
              className="secondary"
              disabled={busy || !chosen.length}
              onClick={() => {
                setChosen([]);
                setConfirmed(false);
              }}
            >
              Vorschlagsauswahl leeren
            </button>
          </div>
          <label className="check">
            <input
              type="checkbox"
              disabled={busy || dirty || !chosen.length}
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Ich habe die ausgewählten Angaben und vorgeschlagenen
            Anknüpfungspunkte geprüft und bestätige ihre Richtigkeit.
          </label>
          <div className="actions">
            <button
              disabled={busy || dirty || !confirmed || !chosen.length}
              onClick={() => run(() => apply("prepare"))}
            >
              {chosen.length} Kontakte übernehmen und Entwürfe vorbereiten
            </button>
            <button
              className="secondary"
              disabled={busy || dirty || !confirmed || !chosen.length}
              onClick={() => run(() => apply("apply"))}
            >
              {chosen.length} bestätigte Prüfdaten übernehmen
            </button>
          </div>
          <p>
            Vollständige Kontakte sind gemeinsam ausgewählt. Offene Angaben
            lassen sich hier korrigieren; ein einzelnes Kontaktformular ist
            dafür nicht nötig.
          </p>
          {proposals.map((p) => (
            <details
              className="preparation-contact"
              key={p.id}
              open={!p.ready || undefined}
            >
              <summary>
                {p.organisation} · {p.name} —{" "}
                {p.ready ? "vollständig" : "Angaben offen"}
              </summary>
              <p>{p.email || "E-Mail-Adresse fehlt"}</p>
              {p.ready && (
                <label className="check">
                  <input
                    type="checkbox"
                    disabled={busy || dirty}
                    checked={chosen.includes(p.id)}
                    onChange={(e) => {
                      setChosen(
                        e.target.checked
                          ? [...chosen, p.id]
                          : chosen.filter((id) => id !== p.id),
                      );
                      setConfirmed(false);
                    }}
                  />
                  Prüfdaten übernehmen für {p.name}
                </label>
              )}
              {p.issues.length > 0 && (
                <p>
                  <strong>Noch zu ergänzen:</strong> {p.issues.join(" ")}
                </p>
              )}
              <fieldset disabled={busy}>
                <legend>Angaben für {p.name}</legend>
                <Fields
                  values={{ ...p.values, ...edits[p.id]?.values }}
                  change={(values) => {
                    setEdits({
                      ...edits,
                      [p.id]: {
                        id: p.id,
                        revision: p.revision,
                        values: { ...edits[p.id]?.values, ...values },
                      },
                    });
                    changed();
                  }}
                />
              </fieldset>
              {p.origins.length > 0 && (
                <ul>
                  {p.origins.map((o, index) => (
                    <li key={`${index}-${o}`}>{o}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </>
      )}
    </section>
  );
}
