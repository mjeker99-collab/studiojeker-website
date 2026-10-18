"use client";
import { useEffect, useState } from "react";
type Connection = {
  provider: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
  accountId: string;
  accountName: string;
  ownerId: string;
  expired: boolean;
};
type Status = {
  configured: { meta: boolean; linkedin: boolean };
  connections: Connection[];
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
  useEffect(() => {
    request("status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
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
              Meta-App und Verschlüsselungsschlüssel müssen zuerst in Render
              konfiguriert werden.
            </p>
          )}
          {!status.configured.linkedin && (
            <p>
              LinkedIn-App und Verschlüsselungsschlüssel müssen zuerst in Render
              konfiguriert werden.
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
                  : "· verbunden"}
                {c.provider === "LINKEDIN" &&
                  " · Unternehmensseite und Schreibberechtigung vor dem Publizieren prüfen"}
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
