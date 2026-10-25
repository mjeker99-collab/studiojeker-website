"use client";
import { useEffect, useState } from "react";
import type { GptConnectorStatus, GptScopes } from "@/lib/gpt-connector/types";

async function request(path: string, body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Aktion fehlgeschlagen.");
  return data;
}

const scopeLabels: Array<{ key: keyof GptScopes; label: string }> = [
  { key: "campaigns", label: "Kampagnen (lesen)" },
  { key: "projects", label: "Projekte / Content-Serien (lesen)" },
  { key: "concepts", label: "Konzepte (lesen)" },
  { key: "content", label: "Redaktionelle Inhalte / Suche (lesen)" },
  {
    key: "write_drafts",
    label: "Entwürfe speichern (write_drafts – standardmässig aus)",
  },
];

function formatAccess(value: string | null) {
  if (!value) return "Noch kein Zugriff";
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(new Date(value));
}

export default function ChatGptIntegration() {
  const [status, setStatus] = useState<GptConnectorStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    request("integrations/gpt/status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);

  async function act(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setStatus(await request("integrations/gpt/status"));
      if (ok) setMessage(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="panel padded"
      aria-labelledby="chatgpt-integration-heading"
      aria-busy={busy}
    >
      <h2 id="chatgpt-integration-heading">KI-Integrationen → ChatGPT</h2>
      <p>
        ChatGPT-Schnittstelle für StudioONE. Lesen nur mit expliziten
        Freigaben. Schreiben von redaktionellen Entwürfen nur mit separatem
        Schreib-Token, aktivem <code>write_drafts</code>-Schalter und
        Schreibfreigaben je Kampagne/Projekt. Kein Publizieren, kein Versand,
        kein Löschen, keine CRM-Daten. Zugangsschlüssel bleiben
        Server-Umgebungsvariablen und werden hier nicht angezeigt.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!status && !error && <p>Status wird geladen …</p>}
      {status && (
        <>
          <dl>
            <dt>Lesestatus</dt>
            <dd>
              {!status.tokenConfigured
                ? "Read-Token in Render nicht konfiguriert"
                : status.revoked
                  ? "Widerrufen"
                  : "Bereit (Read-Token server-seitig hinterlegt)"}
            </dd>
            <dt>Schreibstatus</dt>
            <dd>
              {!status.writeTokenConfigured
                ? "Schreib-Token nicht konfiguriert (Schreiben deaktiviert)"
                : status.revoked
                  ? "Widerrufen"
                  : status.writeDraftsEnabled
                    ? "Bereit (write_drafts aktiv)"
                    : "Token vorhanden, write_drafts noch aus"}
            </dd>
            <dt>Letzter Lesezugriff</dt>
            <dd>{formatAccess(status.lastAccessAt)}</dd>
            <dt>Letzter Schreibzugriff</dt>
            <dd>{formatAccess(status.lastWriteAccessAt)}</dd>
            <dt>OpenAPI</dt>
            <dd>
              <code>/api/integrations/gpt/openapi</code>
            </dd>
          </dl>

          <fieldset disabled={busy}>
            <legend>Aktivierte Bereiche</legend>
            {scopeLabels.map(({ key, label }) => (
              <label key={key} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={status.scopes[key]}
                  onChange={(e) => {
                    const scopes = {
                      ...status.scopes,
                      [key]: e.target.checked,
                    };
                    void act(
                      () => request("integrations/gpt/scopes", scopes),
                      key === "write_drafts"
                        ? e.target.checked
                          ? "Schreibzugriff für Entwürfe aktiviert."
                          : "Schreibzugriff für Entwürfe deaktiviert."
                        : "Inhaltsbereiche aktualisiert.",
                    );
                  }}
                />{" "}
                {label}
              </label>
            ))}
          </fieldset>
          {status.scopes.write_drafts && (
            <p role="note">
              Schreibzugriff speichert nur Entwürfe (Status DRAFT). Freigabe,
              Versand und Website-Publish bleiben manuell in StudioONE.
            </p>
          )}

          <div className="actions" style={{ marginTop: "1rem" }}>
            {status.revoked ? (
              <button
                type="button"
                disabled={busy || !status.tokenConfigured}
                onClick={() =>
                  void act(
                    () => request("integrations/gpt/restore", {}),
                    "ChatGPT-Zugriff wieder aktiviert.",
                  )
                }
              >
                Zugriff wiederherstellen
              </button>
            ) : (
              <button
                type="button"
                className="secondary"
                disabled={busy || !status.tokenConfigured}
                onClick={() =>
                  void act(
                    () => request("integrations/gpt/revoke", {}),
                    "ChatGPT-Zugriff widerrufen.",
                  )
                }
              >
                Zugriff sofort widerrufen
              </button>
            )}
          </div>

          <h3>Freigegebene Inhalte (Lesen)</h3>
          <p>
            Ohne Lesefreigabe liefert die Schnittstelle keine Datensätze.
            Lesefreigaben berechtigen nicht zum Schreiben.
          </p>
          <ShareGroup
            title="Kampagnen"
            items={status.shareCandidates.campaigns}
            busy={busy}
            onToggle={(entityId, shared) =>
              void act(
                () =>
                  request("integrations/gpt/share", {
                    entityType: "CAMPAIGN",
                    entityId,
                    shared,
                  }),
                shared ? "Kampagne freigegeben." : "Freigabe entfernt.",
              )
            }
          />
          <ShareGroup
            title="Projekte"
            items={status.shareCandidates.projects}
            busy={busy}
            onToggle={(entityId, shared) =>
              void act(
                () =>
                  request("integrations/gpt/share", {
                    entityType: "SERIES",
                    entityId,
                    shared,
                  }),
                shared ? "Projekt freigegeben." : "Freigabe entfernt.",
              )
            }
          />
          <ShareGroup
            title="Konzepte"
            items={status.shareCandidates.concepts}
            busy={busy}
            onToggle={(entityId, shared) =>
              void act(
                () =>
                  request("integrations/gpt/share", {
                    entityType: "CONCEPT",
                    entityId,
                    shared,
                  }),
                shared ? "Konzept freigegeben." : "Freigabe entfernt.",
              )
            }
          />
          <ShareGroup
            title="Redaktionelle Inhalte"
            items={status.shareCandidates.contents}
            busy={busy}
            onToggle={(entityId, shared) =>
              void act(
                () =>
                  request("integrations/gpt/share", {
                    entityType: "CONTENT",
                    entityId,
                    shared,
                  }),
                shared ? "Inhalt freigegeben." : "Freigabe entfernt.",
              )
            }
          />

          <h3>Schreibfreigaben (Entwürfe)</h3>
          <p>
            Zusätzlich zu <code>write_drafts</code> und dem Schreib-Token.
            ChatGPT darf nur in freigegebenen Kampagnen, Projekten oder
            Website-Review-Entwürfen speichern.
          </p>
          <ShareGroup
            title="Kampagnen (Schreiben)"
            items={status.writeCandidates.campaigns.map((c) => ({
              id: c.id,
              title: c.title,
              shared: c.granted,
            }))}
            busy={busy}
            onToggle={(entityId, granted) =>
              void act(
                () =>
                  request("integrations/gpt/write-grant", {
                    entityType: "CAMPAIGN",
                    entityId,
                    granted,
                  }),
                granted
                  ? "Schreibfreigabe für Kampagne gesetzt."
                  : "Schreibfreigabe entfernt.",
              )
            }
          />
          <ShareGroup
            title="Projekte (Schreiben)"
            items={status.writeCandidates.projects.map((c) => ({
              id: c.id,
              title: c.title,
              shared: c.granted,
            }))}
            busy={busy}
            onToggle={(entityId, granted) =>
              void act(
                () =>
                  request("integrations/gpt/write-grant", {
                    entityType: "SERIES",
                    entityId,
                    granted,
                  }),
                granted
                  ? "Schreibfreigabe für Projekt gesetzt."
                  : "Schreibfreigabe entfernt.",
              )
            }
          />
          <ShareGroup
            title="Website-Review (Schreiben)"
            items={status.writeCandidates.websites.map((c) => ({
              id: c.id,
              title: c.title,
              shared: c.granted,
            }))}
            busy={busy}
            onToggle={(entityId, granted) =>
              void act(
                () =>
                  request("integrations/gpt/write-grant", {
                    entityType: "WEBSITE",
                    entityId,
                    granted,
                  }),
                granted
                  ? "Schreibfreigabe für Website gesetzt."
                  : "Schreibfreigabe entfernt.",
              )
            }
          />
        </>
      )}
    </section>
  );
}

function ShareGroup({
  title,
  items,
  busy,
  onToggle,
}: {
  title: string;
  entityType?: string;
  items: Array<{ id: string; title: string; shared: boolean }>;
  busy: boolean;
  onToggle: (id: string, shared: boolean) => void;
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.shared}
                disabled={busy}
                onChange={(e) => onToggle(item.id, e.target.checked)}
              />{" "}
              {item.title}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
