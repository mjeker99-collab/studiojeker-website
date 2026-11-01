"use client";
import { useEffect, useState } from "react";
type Connection = {
  provider: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
  accountId: string;
  accountName: string;
  ownerId: string;
  expired: boolean;
  needsOrganization: boolean;
};
type Organization = { accountId: string; accountName: string; url: string };
type Status = {
  configured: { meta: boolean; linkedin: boolean };
  connections: Connection[];
  setup?: Record<
    "meta" | "linkedin",
    {
      sandbox: boolean;
      checks: { key: string; ready: boolean }[];
      redirectUri: string;
    }
  >;
};
async function request(path: string, body?: unknown) {
  const response = await fetch(`/api/social/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Verbindung fehlgeschlagen.");
  return data;
}
export default function SocialConnections({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [choices, setChoices] = useState<{
    source: string;
    organizations: Organization[];
  } | null>(null);
  useEffect(() => {
    request("status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel padded"
      aria-labelledby="social-connections-heading"
      aria-busy={busy}
    >
      <h2 id="social-connections-heading">Social-Media-Konten</h2>
      <p>
        Facebook-Seite und verknüpftes Instagram-Profikonto über Meta verbinden.
        LinkedIn verwendet eine eigene Anmeldung. Die Verbindung veröffentlicht
        keine Beiträge.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() =>
          void act(async () => {
            setStatus(await request("status"));
            setChoices(null);
            setMessage("Verbindungsstatus aktualisiert.");
          })
        }
      >
        Status aktualisieren
      </button>
      {!status && !error && <p>Verbindungen werden geladen …</p>}
      {status && (
        <>
          <div className="actions">
            <button
              type="button"
              disabled={busy || !status.configured.meta}
              onClick={() =>
                void act(async () => {
                  const result = await request("connect/meta", {});
                  window.location.assign(result.url);
                })
              }
            >
              Facebook &amp; Instagram verbinden
            </button>
            <button
              type="button"
              disabled={busy || !status.configured.linkedin}
              onClick={() =>
                void act(async () => {
                  const result = await request("connect/linkedin", {});
                  window.location.assign(result.url);
                })
              }
            >
              LinkedIn verbinden
            </button>
          </div>
          {!status.configured.meta && (
            <p>
              Facebook und Instagram: Die technische Einrichtung ist noch offen.
              Die fehlenden Angaben stehen unter «Einrichtungsdetails».
            </p>
          )}
          {!status.configured.linkedin && (
            <p>
              LinkedIn: Die technische Einrichtung ist noch offen. Die fehlenden
              Angaben stehen unter «Einrichtungsdetails».
            </p>
          )}
          <ul>
            {status.connections.map((c) => (
              <li key={`${c.provider}:${c.accountId}`}>
                {c.provider === "FACEBOOK"
                  ? "Facebook"
                  : c.provider === "INSTAGRAM"
                    ? "Instagram"
                    : "LinkedIn"}
                : {c.accountName}{" "}
                {c.expired
                  ? "· Freigabe abgelaufen – erneut verbinden"
                  : c.needsOrganization
                    ? "· Anmeldung erfolgt – Unternehmensseite noch auswählen"
                    : "· verbunden"}
                {c.provider === "LINKEDIN" &&
                  !c.expired &&
                  !c.needsOrganization &&
                  " · Unternehmensseite"}
                {c.provider === "LINKEDIN" &&
                  c.ownerId === userId &&
                  !c.expired && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          const data = await request(
                            `linkedin/organizations?accountId=${encodeURIComponent(c.accountId)}`,
                          );
                          setChoices({
                            source: c.accountId,
                            organizations: data.organizations,
                          });
                        })
                      }
                    >
                      {c.needsOrganization
                        ? "Unternehmensseite auswählen"
                        : "Seitenrechte prüfen"}
                    </button>
                  )}
                {c.ownerId === userId && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          await request("disconnect", {
                            provider: c.provider,
                            accountId: c.accountId,
                          });
                          setStatus(await request("status"));
                          setChoices(null);
                        })
                      }
                    >
                      Trennen
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!status.connections.length && (
            <p>Noch kein Social-Media-Konto verbunden.</p>
          )}
          {choices && (
            <section aria-label="LinkedIn-Unternehmensseite auswählen">
              <h3>Studiojeker-Unternehmensseite</h3>
              {choices.organizations.length === 0 && (
                <p role="status">
                  Keine Studiojeker-Seite mit bestätigtem Seitenrecht gefunden.
                  Melde dich mit einem Seitenadministrator an und erteile die
                  angefragten Rechte.
                </p>
              )}
              {choices.organizations.map((org) => (
                <div key={org.accountId}>
                  <p>
                    <a href={org.url} target="_blank" rel="noopener noreferrer">
                      {org.accountName}
                    </a>
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await request("linkedin/organization", {
                          accountId: choices.source,
                          organizationId: org.accountId,
                        });
                        setStatus(await request("status"));
                        setChoices(null);
                        setMessage(
                          "Studiojeker-Unternehmensseite verbunden. Es wurde kein Beitrag veröffentlicht.",
                        );
                      })
                    }
                  >
                    Diese Unternehmensseite verbinden
                  </button>
                </div>
              ))}
            </section>
          )}
          {status.setup && (
            <details>
              <summary>Einrichtungsdetails</summary>
              <p>
                Für die technische Administration. Es werden keine geheimen
                Schlüssel angezeigt.
              </p>
              {(["meta", "linkedin"] as const).map((provider) => {
                const setup = status.setup![provider];
                return (
                  <div key={provider}>
                    <h3>
                      {provider === "meta"
                        ? "Facebook & Instagram"
                        : "LinkedIn"}
                    </h3>
                    {setup.sandbox && (
                      <p>
                        Kontoverbindungen sind in dieser Testumgebung
                        deaktiviert.
                      </p>
                    )}
                    <ul>
                      {setup.checks.map((check) => (
                        <li key={check.key}>
                          <code>{check.key}</code>:{" "}
                          {check.ready ? "vorhanden" : "fehlt oder ungültig"}
                        </li>
                      ))}
                    </ul>
                    <p>
                      Rücksprungadresse für die Anbieter-App:
                      <br />
                      <code style={{ overflowWrap: "anywhere" }}>
                        {setup.redirectUri}
                      </code>
                    </p>
                    <p>
                      {provider === "meta"
                        ? "Meta-App: Facebook-Seitenrechte und Instagram-Veröffentlichung freischalten. Instagram muss als Profikonto mit der Studiojeker-Facebook-Seite verknüpft sein."
                        : "LinkedIn-App: Community Management sowie r_organization_admin und w_organization_social freischalten. Nach einer Erweiterung der Rechte erneut verbinden."}
                    </p>
                  </div>
                );
              })}
            </details>
          )}
          <p className="muted">
            Die App benötigt Rechte für die Studiojeker-Facebook-Seite, das
            damit verknüpfte Instagram-Profikonto und die
            LinkedIn-Unternehmensseite. Abgelaufene oder widerrufene Freigaben
            erneut verbinden. Nach dem Trennen kannst du die Freigabe zusätzlich
            beim Anbieter widerrufen.
          </p>
        </>
      )}
    </section>
  );
}
