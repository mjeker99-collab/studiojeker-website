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
  { key: "campaigns", label: "Kampagnen" },
  { key: "projects", label: "Projekte (Content-Serien)" },
  { key: "concepts", label: "Konzepte" },
  { key: "content", label: "Redaktionelle Inhalte / Suche" },
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
        Read-only-Schnittstelle für ChatGPT. Nur explizit freigegebene
        Kampagnen, Projekte, Konzepte und redaktionelle Entwürfe sind lesbar.
        Keine Kontakte, Zugangsdaten, SMTP-Einstellungen oder Versandfunktionen.
        Zugangsschlüssel werden ausschliesslich als Server-Umgebungsvariable
        verwaltet und hier nicht angezeigt.
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
            <dt>Verbindungsstatus</dt>
            <dd>
              {!status.tokenConfigured
                ? "Token in Render nicht konfiguriert"
                : status.revoked
                  ? "Widerrufen"
                  : "Bereit (Connector-Token server-seitig hinterlegt)"}
            </dd>
            <dt>Letzter erfolgreicher Zugriff</dt>
            <dd>{formatAccess(status.lastAccessAt)}</dd>
            <dt>OpenAPI</dt>
            <dd>
              <code>/api/integrations/gpt/openapi</code>
            </dd>
          </dl>

          <fieldset disabled={busy}>
            <legend>Aktivierte Inhaltsbereiche</legend>
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
                      "Inhaltsbereiche aktualisiert.",
                    );
                  }}
                />{" "}
                {label}
              </label>
            ))}
          </fieldset>

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
                Zugriff widerrufen
              </button>
            )}
          </div>

          <h3>Freigegebene Inhalte</h3>
          <p>
            Ohne Freigabe liefert die Schnittstelle keine Datensätze. Freigaben
            betreffen nur Lesen.
          </p>
          <ShareGroup
            title="Kampagnen"
            entityType="CAMPAIGN"
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
            entityType="SERIES"
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
            entityType="CONCEPT"
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
            entityType="CONTENT"
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
