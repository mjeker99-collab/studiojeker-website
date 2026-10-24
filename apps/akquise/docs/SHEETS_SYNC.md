# Google-Masterliste → StudioONE (einseitige Kontaktsynchronisation)

**Status:** Code vorbereitet, **nicht produktiv aktiviert**. Keine E-Mail wird durch diesen Ablauf versandt.

## Datenquelle

Die bestehende native Google-Tabelle im Studiojeker-Drive-Unterordner «Adressen», Tabellenblatt `Kontakte`. Das Format ist exakt `A:O` (15 Spalten); die separate «Mailverwaltung» wird nicht gelesen.

Beim Import werden Person, Organisation, Funktion, Region, Direktadresse und Quellenlink übernommen. Prüfstatus, Prüfdatum, Priorität, Mailbetreff, vollständiger E-Mail-Entwurf, Herkunft und Hinweise bleiben als Recherche-Notizen am Kontakt erhalten. Der bestehende Entwurf kann später über «Entwurf vorbereiten» in eine überprüfbare Nachrichtenversion übernommen werden. Es erfolgt **keine** automatische Erstellung, Freigabe oder Versendung von Nachrichten.

**Keine Einwilligungs-, Versand-, Prüf- oder Freigabestatuswerte** werden übernommen. Neue Kontakte sind `UNCONFIRMED/NEW`, öffentliche Auftraggeber werden konservativ als `PUBLIC_AUTHORITY` klassifiziert. Die separate rechtliche und beschaffungsrechtliche Prüfung bleibt Pflicht. Kontakte ohne E-Mail bleiben Recherchekontakte und sind nicht versandfähig.

## Vor dem ersten Import

1. Die aktuelle StudioONE-Datenbank sichern und die Anzahl vorhandener Kontakte notieren. Bereits vorhandene Datensätze werden beim Import **nicht überschrieben**.
2. **Einfachster Weg:** Mit Martins StudioONE-Konto unter «Bibliothek → Google Drive» verbinden und den gemeinsamen Drive-Ordner «GTP-Dateiaustausch/Relaunch2026» wählen. Die Masterliste muss innerhalb dieses Ordners liegen. Die bestehende read-only Drive-OAuth-Freigabe kann so auch für den Sheets-Abruf verwendet werden (Google Sheets API im Google-Cloud-Projekt aktivieren).
3. **Alternative für dauerhaften Serverbetrieb:** Einen Google Service Account mit aktivierter Google Sheets API einrichten und nur die konkrete Masterliste als Betrachter freigeben. So bleibt der Zeitplan unabhängig vom persönlichen OAuth-Token.
4. Im Render-Webservice `studiojeker-akquise` serverseitig konfigurieren:
   - `GOOGLE_SHEET_ID` = tatsächliche Tabellen-ID (keine URL)
   - `GOOGLE_SHEET_RANGE` = `Kontakte!A1:O501`
   - `GOOGLE_CLIENT_EMAIL` und `GOOGLE_PRIVATE_KEY` = **nur bei Verwendung des Service Accounts**. Andernfalls leer lassen und die bestehende persönliche Drive-Verbindung nutzen
   - `INTERNAL_CONTACT_SYNC_TOKEN` = separater zufälliger, ausreichend langer Schlüssel
   - `MARTIN_EMAIL` = bereits bestehende persönliche StudioONE-Anmeldung
5. Secrets **nur in Render** eintragen; niemals im Chat, Git, Google Sheet oder Browser.
6. Code erst nach Review, CI und Datenbank-Backup bereitstellen. Der Render-Webservice hat Auto-Deploy deaktiviert; ein PR-Merge allein aktiviert nichts.

## Erste Synchronisation und Verifikation

Vor einem Zeitplan zuerst einmal manuell auslösen. `POST /api/internal/contact-sync` verlangt den geheimen Bearer-Token. Der Endpunkt liest die Google-Tabelle und verwendet die bestehende, transaktionale `importContacts`-Funktion mit `skipDuplicates`. Er antwortet nur mit `imported` und `duplicates`, nicht mit persönlichen Kontaktdaten.

Nach dem Import im StudioONE-Dashboard prüfen:
- Gesamtzahl und neue Kontakte
- bereits vorhandene Kontakte, Freigaben, Sperrliste und Entwurfsversionen unverändert
- keine Newsletter-Einwilligungen aus der Tabelle übernommen
- Recherchekontakte ohne E-Mail bleiben blockiert
- Entwürfe erst nach individueller Prüfung, Kontaktverifikation und Rechtsprüfung freigabefähig
- erneuter identischer Import ergibt `imported: 0`

**Einschränkung:** Diese Version importiert neue Personen, aktualisiert vorhandene Kontakte aber nicht. Das schützt Freigaben, Entwurfsversionen und manuelle Korrekturen. Eine spätere echte Aktualisierungssynchronisation braucht Konfliktregeln und einen gesonderten Test.

## Tägliche Ausführung

Erst nach erfolgreichem Test kann ein geplanter Job (beispielsweise täglich 06:00 Uhr Europe/Zurich, UTC-Zeit und Sommerzeit berücksichtigen) den obigen HTTPS-Endpunkt aufrufen. Der Job braucht nur den gesonderten Bearer-Token. Keine SMTP-Zugangsdaten und keine Freigaberechte im Job hinterlegen. Bei Fehlern alarmieren, nicht ungeprüft wiederholt importieren.

**Nicht enthalten:** automatischer Versand, automatisches Freigeben, bidirektionaler Sync, bestehende Kontakte überschreiben, Mailchimp-Opt-in übernehmen, Mailentwürfe als freigegebene Versionen importieren.
