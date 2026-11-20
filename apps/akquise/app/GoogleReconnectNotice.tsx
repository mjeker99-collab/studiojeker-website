"use client";
import { useEffect, useState } from "react";

type Probe = {
  access?: "ready" | "consent_required" | "unreachable" | "missing";
  connection?: { folderName?: string | null } | null;
};

export default function GoogleReconnectNotice() {
  const [probe, setProbe] = useState<Probe | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/drive/status?probe=1", {
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) {
        setProbe(null);
        return;
      }
      setProbe((await response.json()) as Probe);
    } catch {
      setProbe(null);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/drive/status?probe=1", {
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
        });
        if (!active) return;
        if (!response.ok) {
          setProbe(null);
          return;
        }
        setProbe((await response.json()) as Probe);
      } catch {
        if (active) setProbe(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function renew() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/drive/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await response.json()) as { url?: unknown };
      if (
        !response.ok ||
        typeof data.url !== "string" ||
        !data.url.startsWith("https://")
      ) {
        setError(
          "Die Google-Anmeldung konnte nicht gestartet werden. Bitte später erneut versuchen.",
        );
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError(
        "Die Google-Anmeldung konnte nicht gestartet werden. Bitte später erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (probe?.access === "consent_required") {
    const folder = probe.connection?.folderName?.trim();
    return (
      <section
        className="panel google-reconnect"
        role="alert"
        aria-labelledby="google-reconnect-title"
      >
        <h2 id="google-reconnect-title">Google-Verbindung erneuern</h2>
        <p>
          Die Freigabe für deine Kontaktliste ist abgelaufen.
          {folder
            ? ` Der Ordner «${folder}» bleibt erhalten, wenn du dasselbe Google-Konto bestätigst.`
            : " Bestätige dasselbe Google-Konto, damit die bisherige Ordnerauswahl erhalten bleibt."}{" "}
          Ein anderes Google-Konto startet ohne den bisherigen Ordner. Es wird
          vorher nichts getrennt oder gelöscht, und es wird keine E-Mail
          versendet.
        </p>
        {error && <p>{error}</p>}
        <button type="button" disabled={busy} onClick={() => void renew()}>
          Google-Verbindung erneuern
        </button>
      </section>
    );
  }

  if (probe?.access === "unreachable") {
    return (
      <section
        className="panel google-reconnect"
        role="status"
        aria-labelledby="google-unreachable-title"
      >
        <h2 id="google-unreachable-title">
          Google ist gerade nicht erreichbar
        </h2>
        <p>
          Die Kontaktliste bleibt unverändert. Es wird keine E-Mail versendet.
          Bitte später erneut versuchen.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void load().finally(() => setBusy(false));
          }}
        >
          Erneut prüfen
        </button>
      </section>
    );
  }

  return null;
}
