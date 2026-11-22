"use client";
import { useEffect, useState } from "react";
import {
  interpretMasterlistNotice,
  type MasterlistNotice,
} from "../lib/masterlist-actor";

export default function GoogleReconnectNotice() {
  const [notice, setNotice] = useState<MasterlistNotice | null>(null);
  const [phase, setPhase] = useState<"loading" | "failed" | "ready">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setPhase("loading");
    setError("");
    try {
      const response = await fetch("/api/drive/status?masterlist=1", {
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) {
        setNotice(null);
        setPhase("failed");
        return;
      }
      const parsed = interpretMasterlistNotice(await response.json());
      if (parsed === "invalid") {
        setNotice(null);
        setPhase("failed");
        return;
      }
      setNotice(parsed);
      setPhase("ready");
    } catch {
      setNotice(null);
      setPhase("failed");
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/drive/status?masterlist=1", {
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
        });
        if (!active) return;
        if (!response.ok) {
          setNotice(null);
          setPhase("failed");
          return;
        }
        const parsed = interpretMasterlistNotice(await response.json());
        if (!active) return;
        if (parsed === "invalid") {
          setNotice(null);
          setPhase("failed");
          return;
        }
        setNotice(parsed);
        setPhase("ready");
      } catch {
        if (active) {
          setNotice(null);
          setPhase("failed");
        }
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

  if (phase === "loading") {
    return (
      <section
        className="panel google-reconnect"
        role="status"
        aria-labelledby="google-check-title"
        aria-busy="true"
      >
        <h2 id="google-check-title">Kontaktliste wird geprüft</h2>
        <p>Einen Moment. Die Liste bleibt unverändert, und es wird keine E-Mail versendet.</p>
      </section>
    );
  }

  if (phase === "failed") {
    return (
      <section
        className="panel google-reconnect"
        role="alert"
        aria-labelledby="google-check-failed-title"
      >
        <h2 id="google-check-failed-title">Kontaktliste gerade nicht prüfbar</h2>
        <p>
          Die Prüfung ist gerade nicht gelungen. Die Liste bleibt unverändert,
          und es wird keine E-Mail versendet.
        </p>
        <button type="button" disabled={busy} onClick={() => void load()}>
          Erneut prüfen
        </button>
      </section>
    );
  }

  if (!notice || notice.role === "unset" || notice.access === "ready") return null;

  if (notice.role === "other") {
    const name = notice.actorName;
    if (notice.access === "unreachable") {
      return (
        <section className="panel google-reconnect" role="status" aria-labelledby="google-unreachable-title">
          <h2 id="google-unreachable-title">Google ist gerade nicht erreichbar</h2>
          <p>
            Die Kontaktliste bleibt unverändert. Sie wird über die Verbindung
            von {name} gelesen. Es wird keine E-Mail versendet. Bitte später
            erneut versuchen.
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
    return (
      <section className="panel google-reconnect" role="alert" aria-labelledby="google-other-title">
        <h2 id="google-other-title">Google-Verbindung von {name}</h2>
        <p>
          Die Kontaktliste wird über die Google-Verbindung von {name} aktualisiert.
          {notice.access === "missing"
            ? ` ${name} hat diese Verbindung noch nicht eingerichtet.`
            : " Diese Freigabe ist abgelaufen."}{" "}
          {name} muss sich anmelden und die Verbindung erneuern. Eine Erneuerung
          in diesem Konto ändert die Liste nicht. Es wird nichts gelöscht und
          keine E-Mail versendet.
        </p>
      </section>
    );
  }

  if (notice.access === "unreachable") {
    return (
      <section className="panel google-reconnect" role="status" aria-labelledby="google-unreachable-title">
        <h2 id="google-unreachable-title">Google ist gerade nicht erreichbar</h2>
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

  const folder = notice.folderName?.trim();
  return (
    <section className="panel google-reconnect" role="alert" aria-labelledby="google-reconnect-title">
      <h2 id="google-reconnect-title">Google-Verbindung erneuern</h2>
      <p>
        {notice.access === "missing"
          ? "Die Kontaktliste hat noch keine Google-Verbindung. Richte sie mit dem Konto ein, in dem der Ordner der Liste liegt."
          : folder
            ? `Die Freigabe für deine Kontaktliste ist abgelaufen. Der Ordner «${folder}» bleibt erhalten, wenn du dasselbe Google-Konto bestätigst.`
            : "Die Freigabe für deine Kontaktliste ist abgelaufen. Bestätige dasselbe Google-Konto, damit die bisherige Ordnerauswahl erhalten bleibt."}{" "}
        Ein anderes Google-Konto startet ohne den bisherigen Ordner. Es wird
        vorher nichts getrennt oder gelöscht, und es wird keine E-Mail versendet.
      </p>
      {error && <p>{error}</p>}
      <button type="button" disabled={busy} onClick={() => void renew()}>
        Google-Verbindung erneuern
      </button>
    </section>
  );
}
