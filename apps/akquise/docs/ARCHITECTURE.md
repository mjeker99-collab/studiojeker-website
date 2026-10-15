# Architekturplan – vor Implementierung festgelegt

Die bestehende Website liegt im Repository-Root. Alle Ergänzungen liegen isoliert in apps/akquise. Keine Root-Abhängigkeiten, Website-Komponenten, CMS-Konfigurationen oder Deployments werden geändert.

- Next.js App Router, TypeScript, Tailwind, Node-Runtime, eigene Portnummer 3100.
- PostgreSQL und Prisma: individuelle Benutzer und gehashte Sitzungen, Kontakte, unveränderliche Nachrichtenversionen, Freigabeereignisse, separate rechtliche Prüfungen, Sperrliste, Nachrichten- und Audit-Protokoll.
- Keine Registrierung; Martin und Nora werden über administratives CLI einzeln provisioniert. Scrypt-Passwörter, zufällige HttpOnly-Sitzungen mit 8 Stunden Ablauf, SameSite Strict, Secure in Produktion, Origin-Prüfung und persistente Login-Sperren. Keine gemeinsam verwendeten Zugangsdaten.
- Alle API-Aktionen prüfen serverseitig die Sitzung. Workflow-Funktionen prüfen aktive Benutzer erneut. Advisory Locks serialisieren Änderungen und Simulationen. Unique Constraints sichern Versionen, Identitäten und Idempotenz.
- Freigaben speichern Benutzer, Zeit, Kontakt, Versionsnummer und SHA-256 über Empfänger, Betreff und Text. Jede Kontaktänderung entwertet Freigaben und über Revisionen auch rechtliche Prüfungen. Nachrichtenedits erzeugen neue Versionen.
- Zustände: Kontaktprozess (alle angeforderten Status), Freigabe und Zustellung sind separate Daten. In V1 erzeugt eine Freigabe keinen Versandauftrag. Simulationen bleiben SIMULATED; niemals SENT oder SEND_READY.
- Rechtliche Zulässigkeit ist eine separate menschliche Entscheidung mit Begründung. Öffentliche Auftraggeber benötigen zusätzliche beschaffungsrechtliche Prüfung. Newsletter-Einwilligung ist unabhängig und wird niemals aus Importen abgeleitet.
- SMTP: Nodemailer erstellt ausschliesslich lokale MIME-Nachrichten per Stream-Transport. Kein SMTP-Transport, keine Verbindung, keine Test-Mailbox-Weiterleitung in V1. Der Code blockiert auch bei ENABLE_EMAIL_SENDING=true. Port, TLS und Authentifizierung sind erst nach Metanet-Bestätigung zu konfigurieren.
- KI: austauschbares DraftGenerator-Interface mit engen Fakten und dokumentierten Regeln; V1 liefert eine klar gekennzeichnete lokale Vorlage. Kein externer KI-Dienst wird ohne Konfiguration aufgerufen.
- Google Sheets: manuell ausgelöster, read-only Snapshot-Import; streng validierte Kontaktspalten. Bestehende Identitäten werden nicht überschrieben. Kein bidirektionaler Status-Sync in V1.
- IMAP: Header-Zuordnung anhand Message-ID, In-Reply-To und References vorbereitet. Keine Netzwerkverbindung, automatische Analyse oder Follow-ups.
- Wiederholung: identische Simulationsanfrage liefert dasselbe Ergebnis. Keine automatischen Wiederholungen oder externen Versandversuche; eine spätere SMTP-Version benötigt gesonderte Behandlung unklarer Zustellergebnisse.
