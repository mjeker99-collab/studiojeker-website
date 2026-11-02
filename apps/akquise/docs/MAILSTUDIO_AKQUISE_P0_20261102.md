# StudioONE P0 – Mailstudio & Akquise zuerst (02.11.2026)

## Verbindliche Priorität des Auftraggebers
**P0: Mailstudio und Akquise/Leadrecherche**, vor Newsletter-Cursor-Anbindung (#322, weiterhin Draft) und generischer GPT-Auftrags-Engine (#326, weiterhin Draft). Wir wollen **nutzbare vollständige Arbeitsabläufe, keine weitere allgemeine Architektur und kein Redesign**.

Ziel-Repository `mjeker99-collab/studiojeker-website`, aktueller StudioONE/Render-Branch `feat/akquise-production-readiness` (zuletzt Live-Commit #328, vor jedem Codechange Branch frisch prüfen), root `apps/akquise`. Lies `AGENTS.md`, `apps/akquise/AGENTS.md`, `docs/STUDIOONE_OPERATING_AGREEMENT.md`, `docs/STUDIOONE_UX_GUIDELINES.md`.

## Bereits implementierte Grundlagen (nicht doppelt bauen)
- #315 geprüfte Teilmengen, #317/#318 info@-Adressen nicht in Sammelversand.
- #320/#324 «Sofort senden», 50er-Freigabe und vereinfachte Vorschau/Zeiten.
- #323 Bilder, Links und Testmail in personalisierten Mails.
- #327 Recherche, personenspezifische Mailtexte und Unternehmen/Branche-Filter.
- #328 OpenAI-Ausgabeformat der Recherche repariert.
Mache bei Funktionen, die existieren, **nur konkrete Fehlerkorrekturen**; die sechs PRs sind bereits gemergt. Nutze die echte Codebasis, nicht frühere Screenshots als Beweis.

## P0.1 – Mailstudio: nachweisbar bedienbar für 50 Kontakte
**Kernablauf** in einer möglichst einzigen, übersichtlichen Ansicht: «Kontakte auswählen» → «E-Mail vorbereiten» → «Prüfen und jetzt senden». Wichtigste Aktion sichtbar möglichst oben. Nach Auswahl von 50 Adressen erscheint «Sofort senden (50)» und führt ohne technische Zwischenhürden zur Vorschau. Wenn nicht alle bereit: exakten Grund + Zahl pro Grund und **funktionierende Aktion** für die qualifizierte Teilmenge; keine 50/50 Sackgasse.
- Sammelbestätigung mit tatsächlichem Prüfergebnis, nicht versteckten zusätzlichen Dropdown-Freigaben. Link/Bild-Prüfung und individuell erstellte Texte dürfen Freigaben nur versionsgebunden invalidieren, dann klar erläutern und neu bestätigen.
- «Alle jetzt senden» und «Jetzt senden» müssen sichtbare und tatsächlich verdrahtete Aktionen sein, keine tote Buttons.
- Zeitplan nur bei Bedarf anzeigen; einfache Start/Pause-Option statt Fachkonfiguration.
- **SMTP-Senden/Warmlauf begrenzen**: Keine echten E-Mails im Entwicklungstest; kein automatischer Versand. Nur nach ausdrücklicher rechtlich/empfängerbezogener Nutzerfreigabe an die konkret selektierten Adressen. Testmail nur durch bewussten Klick. Fehler sind sichtbar, kein scheinbarer Erfolg.
- Bestehende Dublettensperren aus Versandhistorie respektieren. Negative Rückmeldungen («kein Bedarf», Abmeldung) sollen als Suppression/keine automatischen Follow-ups behandelt werden, ohne andere Kontaktdaten zu löschen; prüfe vorhandene Implementierung, ergänze nur falls wirklich fehlend.

## P0.2 – Akquise: recherchierte Kontakte führen direkt zu individualisierten Mails
**Kernablauf**: «Neue Leads suchen» → Ergebnis mit überprüfbaren Quellen, persönlichem Kontakt und nutzbarer E-Mail-Adresse → «In Masterliste übernehmen» → Filter «Kunde/Unternehmen» und «Branche» → «Persönliche Mails vorbereiten» → bereits bestehende Mailstudio-Prüfvorschau. **Eine Masterliste, keine zweite Datenhaltung.**
- Recherche in bestehenden Zielregionen: Solothurn, Grenchen, Biel, Bern, Burgdorf, Langenthal, Aarau, Olten und erweiterte Orte Bellach, Selzach, Biberist, Gerlafingen, Langnau i.E., Basel-Landschaft/Basel-Stadt. Vorrang Industrie, Dienstleistung, KMU, Architekturbüros, Immobilien; bestehende Leads nicht nochmals recherchieren/anschreiben.
- **Nur Leads mit tatsächlich gefundener Mailadresse**, bevorzugt persönliche Adressen. Keine `info@`-Adressen als neue Leads; `marketing@` und `kommunikation@` sind zulässig, aber korrekt als Team-Postfach kennzeichnen. Keine erratenen Adressen oder Personen, Quellen nachvollziehbar angeben. Keine Umgehung von Consent/Suppression.
- Masterlistenfilter für Kunde, Branche und «ohne Branche», konsistent für Auswahl und Vorbereitungsmenge; Änderungen setzen versteckte Auswahl zurück, nicht gespeicherte Kontakte.
- Personalisierung aus realen Quellen und Kundendaten; keine erfundenen Angaben. Template-/Text- und Signaturfunktion nicht doppelt bauen. Fehlende OpenAI- oder Webzugänge melden als BLOCKIERT und konkrete Adminlösung, nicht als «Erledigt».
- Keine automatische externe Nachricht bei Recherche/Import/Textgenerierung.

## P0.3 – Verifizieren und beheben
1. Code-Zustand und letzte PRs prüfen, um redundante Änderungen zu verhindern.
2. Echte **UI-/Integrationstests mit synthetischen Kontakten**, insbesondere 50-Lead-Flow; 50 bereit, 45 bereit + 5 blockiert, 0 bereit, info@, Einträge ohne Mail, unsaubere Quellen, negative Antwort / Dubletten, Filterwechsel.
3. Browsercheck 390px und 1024px – **Hauptaktion oben erreichbar, nur eine eindeutige Aktion je Schritt, keine Sackgassen**. Test-Server simuliert Provider/SMTP, keine echten Providerkosten, keine versendeten Mails.
4. Nur tatsächlich gefundene P0-Defekte beheben. Kein komplettes Redesign, keine neue Architektur, keine reinen Testschleifen.
5. Lint, TS, Unit, Integration, Build (jeweils wirklich ausgeführt). Kurzer Bericht: voriger Fehler, konkrete Reparatur, Dateiliste, Tests, offene echte Blocker.

## Fertigkriterium
Eine KMU-Testperson kann eine Menge von 50 vorhandenen geeigneten Kontakten auswählen, sauber individualisierte Mailentwürfe bis zur Freigabe vorbereiten und **ohne IT-Kenntnisse** sehen, ob und an wen sie mit einem bewussten Klick senden könnte. Daneben können neue qualifizierte Leads direkt über Recherche, Import, Filter und Entwurfsvorbereitung in denselben Ablauf gelangen.

**Keine Live-Mails, keine ungewollte Datenänderung, kein Merge/Deploy durch Cursor-Agent.** Abschluss als prüfbarer PR gegen den **aktuellen** Render-Branch, mit wirklicher Codeänderung dort, wo Fehler gefunden wurden. Bei bereits funktionierendem Bereich ausdrücklich nachweisen statt umbauen. Keine Änderungen an Newsletter V3/V4, Website, Design, Social, externer Versandautomatik oder PR #322/#326.
