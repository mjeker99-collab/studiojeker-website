# Lead-Recherche in StudioONE V1

Die Maske steht unter **Akquise → Kontakte finden**. Sie sucht Gewerbe und kleine Firmen, standardmässig im Umkreis von 10 km um Solothurn, mit einem Tagesziel von 200 neu belegten Leads. 200 ist ein Ziel. Die Suche endet ehrlich, wenn Quellen, Kosten- oder Zeitlimit vorher erreicht sind.

Es wird nichts versendet und nichts freigegeben. Neue Kontakte bleiben «Nicht kontaktiert». Die bestehende Mail-, Newsletter- und Versandstrecke wird nicht verwendet.

## Bedienung

1. Region, Umkreis und Tagesziel prüfen. Weitere Angaben sind zugeklappt.
2. **Recherche starten.** Das ist die einzige blaue Hauptaktion.
3. **Pause** und **Fortsetzen** behalten denselben Lauf. **Abbrechen** beendet ihn.
4. Die Zahlen zeigen neue belegte Leads, Dubletten, Ausgeschlossene, offene Prüfungen, alte Nachträge, fertige Entwürfe, den Excel-Export, in Sheets rückgelesene Zeilen und den Fehlbestand.
5. Excel oder CSV enthält alle Masterlisten-Felder plus Status. Solange eine Quelle oder eine Berechtigung fehlt, steht das im Status. Es erscheinen keine erfundenen Firmen.

Alte Nachträge zählen nicht ins Tagesziel. Ein unvollständiger Abgleich der Masterliste blockiert die Aufnahme, nicht die weitere Suche.

## Betriebsmodus

Standard ist aus. `LEAD_RESEARCH_PROVIDER=unconfigured` erzeugt keine Leads und ruft keine kostenpflichtige Schnittstelle auf.

`LEAD_RESEARCH_PROVIDER=fixture` ist nur ein Schalter für Tests. Der Dienst liefert dabei ebenfalls keine Leads.

`LEAD_RESEARCH_PROVIDER=live` nutzt vorhandene Server-Konfiguration:

- Websuche nur, wenn `CONTENT_AI_ENABLED=true` und `OPENAI_API_KEY` gesetzt sind. Jeder Schritt ist auf 20 Sekunden begrenzt und zählt auf `LEAD_RESEARCH_MAX_COST_USD`.
- Seitenabruf nur mit `LEAD_RESEARCH_FETCH=live`. HTTPS, öffentliche Adressen, robots.txt, keine Weiterleitung auf interne Netze, begrenzter Text. Seiteninhalt ist Daten, keine Anweisung.
- Google Sheets liest alle Tabellenblätter, wenn `GOOGLE_SHEET_ID`, `GOOGLE_CLIENT_EMAIL` und `GOOGLE_PRIVATE_KEY` gesetzt sind. Schreiben nur zusätzlich mit `LEAD_RESEARCH_SHEETS_WRITE=true`. Geschrieben wird nur per Anhängen ins Blatt `Kontakte`, danach Rücklesen von Betreff und Entwurf. Eine fehlende Dateifreigabe wird von einer fehlenden Konfiguration unterschieden.
- Aufnahme in StudioONE-Kontakte nur mit `LEAD_RESEARCH_ADMIT_CONTACTS=true`. Status bleibt neu, Einwilligung bleibt nein. Bestehende Kontakte werden nicht überschrieben.

Ein Cron darf `POST /api/internal/lead-research-tick` mit `Authorization: Bearer <LEAD_RESEARCH_TICK_TOKEN>` aufrufen. Der Aufruf selbst dauert nicht den ganzen Lauf.

## Tests

Automatisierte Tests arbeiten mit synthetischen `.example`-Adressen und einem Speicher im Arbeitsspeicher. Sie schreiben nicht nach Google und versenden nichts. Die Prisma-Migration `20261124170000_lead_research_agent` ist additiv und wird in diesem Entwicklungsstand nicht auf eine produktive Datenbank angewendet.

## Render-Aktivierung und Abnahme

Der bestehende V1-Dienst `studiojeker-akquise` verwendet den Branch
`feat/akquise-production-readiness`. Vor dem Merge die effektive
Auto-Deploy-Einstellung im Render-Dashboard prüfen. Der Testpersonen-Dienst
verfolgt denselben Branch. Die Recherche-Schalter dort deaktiviert lassen.

1. Den Entwurfs-PR und die V1-Checks gegen den effektiven Deploy-Branch prüfen.
   Den verwendeten Next.js-Sicherheitsstand über Lockdatei und Audit bestätigen.
   Vor einer ausstehenden Migration das Datenbankbackup und dessen
   Wiederherstellbarkeit prüfen. Die bestehende Lead-Tabelle ist additiv.
2. Die Zielrevision zunächst mit deaktivierter Recherche ausrollen. Die
   tatsächlich laufende Revision, `/api/health/ready` und den bestehenden
   Akquise-Ablauf prüfen. V2 verwendet seine eigene Codebasis.
3. Suchzugang und vollständigen Lesezugriff auf die Masterliste serverseitig
   prüfen. Auf dem V1-Dienst zuerst `LEAD_RESEARCH_ENABLED=true`,
   `LEAD_RESEARCH_PROVIDER=live` und `LEAD_RESEARCH_FETCH=live` setzen.
   `LEAD_RESEARCH_DAILY=true` startet beim ersten erfolgreichen Takt des
   Zürcher Kalendertags einen Standardlauf. Der Produktionseinstieg ruft die
   interne Route minütlich mit einem eigenen Token auf. Dies nimmt auch
   einen aktiven Lauf vom Vortag wieder auf. Das Laufzeitlimit gilt weiter.
4. Nach vollständigem Abgleich Schreibzugriff auf das Zielblatt prüfen.
   Nur mit `LEAD_RESEARCH_SHEETS_WRITE=true` werden bestätigbare Zeilen
   angehängt. `LEAD_RESEARCH_ADMIT_CONTACTS` ist ein separater Schalter
   für eine manuelle, authentifizierte Aufnahme. Der Zeitplan übergibt
   keinen StudioONE-Benutzer.
5. Für die Abnahme Revision, Lauf-ID, Zürcher Datum, Anzahl qualifizierter
   Entwürfe, Dubletten und bestätigte Rücklesungen protokollieren. Einen
   kontrollierten Neustart durchführen und denselben Lauf mit seinem
   gespeicherten Suchfortschritt wiederfinden. Die 200 zählen erst bei
   belegten und eindeutigen Datensätzen mit personalisierten Entwürfen,
   nachweislich gespeichertem Lauf und bestätigt rückgelesenen Zeilen.
   Keine Kontaktdaten in PR oder Logs ablegen.

Bei einem Fehler Recherche und Schreibschalter deaktivieren. Bei einer
Deploy-Regression die zuvor verifizierte V1-Revision über Render wieder
bereitstellen. Gespeicherte Läufe und Tabellenzeilen zur Prüfung erhalten.
