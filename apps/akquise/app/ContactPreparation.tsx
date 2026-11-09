"use client";
import { useId, useState } from "react";
import type {
  ContactPreparation as Proposal,
  PreparationFields,
} from "../lib/contact-preparation";

import { normalizeSourceUrl, sourceUrlIssue } from "../lib/contact-source-url";
import { isTeamMailbox } from "../lib/contact-identity";

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
  simple = false,
  showSource = true,
  showHook = true,
}: {
  values: PreparationFields;
  change: (values: PreparationFields) => void;
  shared?: boolean;
  simple?: boolean;
  showSource?: boolean;
  showHook?: boolean;
}) {
  const sourceHintId = useId();
  const sourceError = sourceUrlIssue(values.sourceUrl ?? "");
  return (
    <div className="form-grid">
      {!simple && (
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
      )}
      <label>
        Prüfdatum
        <input
          type="date"
          max={new Intl.DateTimeFormat("sv-SE").format(new Date())}
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
      {showSource && (
        <label>
          Quellen-URL
          <input
            type="text"
            inputMode="url"
            aria-label="Quellen-URL"
            aria-describedby={sourceHintId}
            aria-invalid={!!sourceError}
            placeholder="firma.ch/team"
            onBlur={() => {
              const normalized = normalizeSourceUrl(values.sourceUrl ?? "");
              if (normalized !== (values.sourceUrl ?? ""))
                change({ sourceUrl: normalized });
            }}
            value={values.sourceUrl ?? ""}
            maxLength={4000}
            onChange={(e) => change({ sourceUrl: e.target.value })}
          />
          <span id={sourceHintId} className={sourceError ? "error" : "muted"}>
            {sourceError ||
              "Fundstelle der Kontaktadresse, z. B. die Teamseite des Unternehmens. https:// wird automatisch ergänzt."}
          </span>
        </label>
      )}
      {showHook && (
        <label>
          Dokumentierter Anknüpfungspunkt
          <textarea
            rows={3}
            value={values.hook ?? ""}
            maxLength={4000}
            onChange={(e) => change({ hook: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}
export default function ContactPreparation({
  initialProposals,
  refresh,
  onDone,
  requireComplete = false,
  onExclude,
}: {
  initialProposals: Proposal[];
  refresh: () => Promise<void>;
  onDone: () => void;
  requireComplete?: boolean;
  onExclude?: (ids: string[]) => void;
}) {
  const [proposals, setProposals] = useState(initialProposals);
  const today = new Intl.DateTimeFormat("sv-SE").format(new Date());
  const [shared, setShared] = useState<PreparationFields>(() =>
    requireComplete ? { verifiedAt: today + "T00:00:00.000Z" } : {},
  );
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  function changed() {
    setDirty(true);
    setConfirmed(false);
    setError("");
    setResults([]);
  }
  async function save() {
    if (!confirmed || busy) return;
    if (sourceUrlIssue(shared.sourceUrl ?? "")) {
      setError(
        "Bitte die markierte Quellenadresse korrigieren. Deine Eingaben bleiben erhalten.",
      );
      return;
    }
    if (
      shared.verifiedAt &&
      (Number.isNaN(Date.parse(shared.verifiedAt)) ||
        shared.verifiedAt.slice(0, 10) > today)
    ) {
      setError(
        "Das Prüfdatum liegt in der Zukunft oder ist ungültig. Bitte das tatsächliche Prüfdatum wählen; deine Eingaben bleiben erhalten.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = { results: [] as Result[] };
      const valid = proposals.filter((p) => {
        const values = edits[p.id]?.values;
        const invalid =
          sourceUrlIssue(values?.sourceUrl ?? "") ||
          (values?.verifiedAt &&
            (Number.isNaN(Date.parse(values.verifiedAt)) ||
              values.verifiedAt.slice(0, 10) > today));
        if (invalid)
          data.results.push({
            id: p.id,
            ok: false,
            message: "Quellenadresse oder Prüfdatum korrigieren.",
          });
        return !invalid;
      });
      if (valid.length) {
        const result = await post<{ results: Result[] }>("save", {
          confirmed: true,
          shared: requireComplete
            ? { ...shared, confidence: "VERIFIED" }
            : shared,
          contacts: valid.map((p) => ({
            id: p.id,
            revision: p.revision,
            values: edits[p.id]?.values,
          })),
        });
        data.results.push(...result.results);
      }
      setResults(data.results);
      const remaining = Object.fromEntries(
        Object.entries(edits).filter(
          ([id]) => !data.results.some((r) => r.id === id && r.ok),
        ),
      );
      setEdits(remaining);
      setDirty(Object.keys(remaining).length > 0);
      setConfirmed(false);
      const fresh = await post<{ contacts: Proposal[] }>("preview", {
        ids: proposals.map((p) => p.id),
      });
      setProposals(fresh.contacts);
      await refresh();
      if (
        requireComplete &&
        Object.keys(remaining).length === 0 &&
        fresh.contacts.some((p) => p.ready && !p.changed)
      )
        onDone();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.",
      );
    } finally {
      setBusy(false);
    }
  }
  const open = proposals.filter((p) => !p.ready);
  const teamMailboxCount = proposals.filter((p) => isTeamMailbox(p.email)).length;
  // Show the real reasons for an incomplete selection. A verified email address
  // alone does not satisfy source, date, hook and human review requirements.
  const issueCounts = Array.from(
    open.reduce((counts, proposal) => {
      for (const issue of new Set(proposal.issues))
        counts.set(issue, (counts.get(issue) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);
  const unconfirmed = proposals.filter(
    (p) =>
      (edits[p.id]?.values.confidence ?? p.values.confidence) === "UNCONFIRMED",
  ).length;
  return (
    <section
      className="contact-preparation"
      aria-labelledby="contact-preparation-title"
      aria-busy={busy}
    >
      <h2 id="contact-preparation-title">
        {requireComplete
          ? `Angaben für ${proposals.length} Mails bestätigen`
          : `${proposals.length} Kontakte ergänzen und speichern`}
      </h2>
      <p>
        Vorhandene Rechercheangaben werden übernommen. Ergänze nur fehlende
        Angaben und bestätige die Auswahl einmal. Danach erscheinen die Mails
        zur gemeinsamen Versandfreigabe.
      </p>
      {!requireComplete && unconfirmed > 0 && !shared.confidence && (
        <p role="status">
          Bei {unconfirmed} Kontakten fehlt die Bestätigung der Adressprüfung.
          Bestätige nur tatsächlich geprüfte Adressen. «Aus vorhandenen Angaben
          übernehmen» lässt unbestätigte Adressen unverändert.
        </p>
      )}
      <fieldset disabled={busy}>
        <legend>Gemeinsame Angaben für die Auswahl</legend>
        <p>
          Dieses Datum ergänzt fehlende oder ungültige Prüfdaten. Vorhandene
          gültige Angaben bleiben erhalten; Ausnahmen kannst du unten ändern.
        </p>
        <Fields
          shared
          simple={requireComplete}
          showSource={
            !requireComplete || proposals.some((p) => !p.values.sourceUrl)
          }
          showHook={
            !requireComplete || proposals.some((p) => !p.values.hook?.trim())
          }
          values={shared}
          change={(v) => {
            setShared({ ...shared, ...v });
            changed();
          }}
        />
      </fieldset>
      <label className="check">
        <input
          type="checkbox"
          disabled={busy}
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {requireComplete
          ? `Ich habe die E-Mail-Adressen der ${proposals.length} ausgewählten Kontakte geprüft (${teamMailboxCount} Team-Postfächer) und bestätige ihre dokumentierten Quellen, Prüfdaten und Anknüpfungspunkte.`
          : "Ich bestätige die eingetragenen Angaben und die unten angezeigten Ergänzungen aus den Notizen."}
      </label>
      <div className="actions">
        <button disabled={busy || !confirmed} onClick={() => void save()}>
          {busy
            ? "Wird gespeichert …"
            : requireComplete
              ? "Angaben speichern und weiter →"
              : "Änderungen speichern"}
        </button>
        {!requireComplete && (
          <button
            className="secondary"
            disabled={busy || dirty}
            onClick={onDone}
          >
            Weiter zur Mailprüfung →
          </button>
        )}
      </div>
      {!confirmed && (
        <p>Bitte die Adressprüfung und Rechercheangaben oben bestätigen.</p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!!results.length && (
        <div role="status">
          {!requireComplete && (
            <strong>
              {results.filter((r) => r.ok).length} Kontakte gespeichert ·{" "}
              {results.filter((r) => !r.ok).length} nicht gespeichert
            </strong>
          )}
          {results.some((r) => !r.ok) && (
            <ul>
              {results
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.id}>
                    {proposals.find((p) => p.id === r.id)?.organisation}:{" "}
                    {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      {requireComplete && open.length > 0 && results.length > 0 && (
        <div role="status">
          <p>
            <strong>Noch zu korrigieren für {open.length} Kontakte:</strong>
          </p>
          <ul>
            {issueCounts.map(([issue, count]) => (
              <li key={issue}>
                {count} Kontakte: {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
      {onExclude && open.length > 0 && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => onExclude(open.map((p) => p.id))}
        >
          {open.length === proposals.length
            ? "Alle offenen Kontakte aus diesem Versand entfernen"
            : `Bewusst nur mit ${proposals.length - open.length} vollständigen Kontakten fortfahren`}
        </button>
      )}
      <details>
        <summary>Details und Ausnahmen ({proposals.length} Kontakte)</summary>
        <p>
          Ergänzungen aus vorhandenen Notizen sind bereits eingetragen.
          Kontaktänderungen erfordern eine erneute Mailfreigabe.
        </p>
        {proposals.map((p) => (
          <details className="preparation-contact" key={p.id}>
            <summary>
              {p.organisation} · {p.name} —{" "}
              {p.ready ? "vollständig" : "Angaben offen"}
            </summary>
            <p>{p.email || "E-Mail-Adresse fehlt"}</p>
            {onExclude && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => onExclude([p.id])}
              >
                Aus diesem Versand entfernen
              </button>
            )}
            {!!p.issues.length && (
              <p>
                <strong>Noch zu ergänzen:</strong> {p.issues.join(" ")}
                {dirty ? " (Stand vor dem Speichern)" : ""}
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
            {!!p.origins.length && <p>{p.origins.join(" · ")}</p>}
          </details>
        ))}
      </details>
    </section>
  );
}
