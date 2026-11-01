"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

export default function Testzugang() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  useEffect(() => {
    fetch("/api/test-access", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Testzugang nicht verfügbar.");
        const response = await r.json();
        setEnabled(response.enabled === true);
      })
      .catch(() => setEnabled(false));
  }, []);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/test-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          invitationCode: form.get("code"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Anmeldung nicht möglich.");
      setCreated(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Anmeldung nicht möglich.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="login-card">
        <p className="eyebrow">STUDIOONE / PRAXISTEST</p>
        <h1>Testzugang einrichten</h1>
        {enabled === null ? (
          <p>Testzugang wird geprüft …</p>
        ) : !enabled ? (
          <p>Diese Adresse bietet keine Testregistrierung an.</p>
        ) : created ? (
          <div role="status">
            <h2>Dein Testkonto ist bereit.</h2>
            <p>Du kannst dich jetzt mit deiner E-Mail-Adresse und deinem eigenen Passwort anmelden.</p>
            <p>Hier arbeitest du mit Beispieldaten. Echte E-Mails und Veröffentlichungen sind ausgeschaltet.</p>
            <Link href="/">Zur Anmeldung →</Link>
          </div>
        ) : (
          <>
            <p>Du testest StudioONE in einer eigenständigen Umgebung mit Beispieldaten. Bitte verwende keine echten Kundendaten.</p>
            <form onSubmit={register}>
              <label>
                Dein Name
                <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
              </label>
              <label>
                Deine E-Mail-Adresse
                <input name="email" type="email" autoComplete="email" maxLength={254} required />
              </label>
              <label>
                Eigenes Passwort (mindestens 14 Zeichen)
                <input name="password" type="password" autoComplete="new-password" minLength={14} maxLength={256} required />
              </label>
              <label>
                Einladungscode
                <input name="code" type="password" autoComplete="off" minLength={32} maxLength={256} required />
              </label>
              <button disabled={busy} type="submit">{busy ? "Konto wird erstellt …" : "Testzugang erstellen →"}</button>
            </form>
            {error && <p role="alert" className="error">{error}</p>}
            <p className="muted">Nur für eingeladene Testpersonen. Deine Testarbeiten können von anderen Testpersonen gesehen werden.</p>
          </>
        )}
        <p><Link href="/">Zur StudioONE-Anmeldung</Link></p>
      </div>
    </main>
  );
}
