# Abdeckungsmatrix StudioONE V1 nach V2

Stand der gelesenen Quelle: Commit `6c83b06ce95203c17efbe6146b3b744d8c22e5a0` auf `feat/studioone-v2-review-20261112`, 12. November 2026, «test(v2): cover resume and storage failure recovery».

Methode: nur Lesen von `apps/akquise` und der vorhandenen V2-Unterlagen. Kein Lauf von V1, kein Browser der laufenden Anwendung, kein Usability-Test mit einer Person. Die Matrix beschreibt, was im Quellcode angelegt ist. Sie beweist nicht, dass die auf Render laufende Revision dasselbe tut.

Die Oberfläche von V1 ist im Wesentlichen eine Seite. Route `/` in `apps/akquise/app/page.tsx`, Sprache `de-CH` in `apps/akquise/app/layout.tsx`. Die Bereiche sind Tabs im Client, keine eigenen URLs. Zusätzliche Seite: `/testzugang` in `apps/akquise/app/testzugang/page.tsx`. Fast alle Aktionen laufen über `apps/akquise/app/api/[...path]/route.ts`.

Empfehlungen sind Vorschläge für die KMU-Oberfläche. «Entfallen» heisst hier: nicht mehr als eigener Einstieg zeigen. Die fachliche Funktion und die Schutzlogik bleiben, bis Martin etwas anderes freigibt.

## Übersicht

| Funktion | Datei und Route | V2 | Empfehlung |
| --- | --- | --- | --- |
| Anmeldung, Abmeldung | `app/page.tsx`, `POST /api/login`, `POST /api/logout` | Nicht in diesem Entwurf | Übernehmen, sobald eine eigene V2-Laufzeit steht |
| Aufgabe in Alltagssprache, sechs häufige Aufgaben | `app/Dashboard.tsx`, Zuordnung `lib/task-routing` | Übersicht: Aufgabe beginnen | Übernehmen und vereinfachen. Eine hervorgehobene Aktion |
| Schnellzugriff auf sechs Bereiche plus fünf weitere | `app/Dashboard.tsx` | Die sechs Hauptbereiche bleiben in der Navigation | Als Raster auf der Übersicht entfallen lassen (Vorschlag) |
| Projektliste und Kennzahlen | `GET /api/dashboard`, Zähler in `app/page.tsx` | Wenige offene Punkte mit nächster Handlung | Vereinfachen |
| Wechsel leert Auswahl, Suche und Filter | `navigate()` in `app/page.tsx` | Arbeitskontext soll bleiben | Vereinfachen. Bewusstes Leeren statt automatisches Leeren |

Wireframe in diesem Paket: `uebersicht.html`. Kein Test mit einer ungeübten Person. Die zwei Minuten sind eine Anforderung, kein gemessenes Ergebnis.

## Akquise, Kontakte, Recherche, Import, Mailstudio

| Funktion | Datei und Route | V2 | Empfehlung |
| --- | --- | --- | --- |
| Recherche | `app/MailAssistant.tsx` Modus `RESEARCH`, Tab «Kontakte finden» | Akquise, Schritt Recherche oder Import | Übernehmen. Eigene Ansicht hier nicht gezeichnet |
| Import aus Drive und Sheets | `app/page.tsx`, `POST /api/contacts/import`, `POST /api/contacts/sheets` | Derselbe Schritt, vor den Empfängern | Übernehmen. Kein Wireframe in diesem Paket |
| Kontaktliste, Erfassung, Antwort | `app/page.tsx` Tab «Kontakte», `app/ContactReply.tsx`, `GET /api/state` | Empfängerwahl | Übernehmen und vereinfachen |
| Filter | `app/ContactFilters.tsx` | Bei Bedarf unter weiteren Optionen | Vereinfachen |
| Mengen 25, 50, 100 und einzelne Zeile | `app/MailStudio.tsx` | Alle vollständigen auf einmal, Zahl sichtbar, Zeile nur als Ausnahme | Übernehmen und vereinfachen |
| Vorbereitung und persönliche Texte | `app/ContactPreparation.tsx`, `app/MailAssistant.tsx` Modus `WRITE`, `POST /api/mail-assistant/generate`, `POST /api/mail-assistant/apply` | Nach dem Briefing, dann Einzelresultate | Übernehmen. Folgeseiten nicht gezeichnet |
| Vorschau und Text | `app/MailPreview.tsx`, `app/MailContentEditor.tsx` | Persönliche Entwürfe prüfen | Übernehmen |
| Freigabe, Zeitplan, Versand, Test | `app/MailSchedule.tsx`, Tab «Freigaben», «Versandhistorie», `GET/POST /api/mail-schedule`, `POST /api/mail-review/test`, `POST /api/smtp/test` | Konkrete Auswahl und Zeitpunkt, danach Einzelresultate | Schutzlogik übernehmen. Die getrennten Tabs «E-Mail-Entwürfe» und «Freigaben» als eigene Einstiege entfallen lassen (Vorschlag) |
| Kundenstamm | `app/customers/Customers.tsx`, `CustomerAssistant.tsx`, `CustomerImport.tsx`, `/api/customers`, `/api/customers/import`, `/api/customers/assist` | Über Projekte und Akquise erreichbar | Funktion übernehmen. Eigenen Hauptpunkt entfallen lassen (Vorschlag). Der genaue Ort ist offen |

Wireframe in diesem Paket: nur die Empfängerwahl, `akquise.html`. Nicht geprüft: echte 25/50/97/100 Kontakte, Recherchequalität, persönliche Texte, Teilfehler, Versand.

## Inhalte

| Funktion | Datei und Route | V2 | Empfehlung |
| --- | --- | --- | --- |
| Social Media, Planung, Freigabe | `app/hub/Hub.tsx` Abschnitt «Social Media», `app/hub/SocialConnections.tsx`, `app/hub/SocialMediaField.tsx`, `/api/social/status`, `/api/social/connect`, `/api/social/[provider]/callback` | Unter Inhalte | Übernehmen und vereinfachen. Fehlende Verbindung mit nächster Handlung. Kein Wireframe hier |
| Newsletter, mehrere Einstiege | `app/hub/Hub.tsx` ab «Newsletter bearbeiten», `app/newsletter/NewsletterWorkspace.tsx`, `NewsletterEditor.tsx` | Eine Ausgabe bearbeiten, vorige Ausgabe kopieren, bestehende nicht überschreiben | Vereinfachen. Grundvorlage, letzte Version und Import nicht mehr nebeneinander als gleichwertige Starts (Vorschlag) |
| Bilder | `app/newsletter/NewsletterImageField.tsx`, `POST /api/mailchimp/images` | Miniaturen direkt im Entwurf | Übernehmen. URL nur bei Bedarf |
| Links und Vorprüfung | `app/newsletter/NewsletterLinkTester.tsx`, `NewsletterPreflight.tsx`, `POST /api/newsletter/check-links` | Sichtbare Links, Prüfung hält bei fehlendem Ziel an | Übernehmen und zu einem Prüfen zusammenführen |
| Mailchimp | `app/newsletter/MailchimpTemplates.tsx`, `GET /api/mailchimp/templates`, `POST /api/mailchimp/test`. Hinweis in `Hub.tsx`: Entwurf übertragen, kein Versand aus StudioONE | Prüfen, dann Mailchimp-Entwurf, dann ausdrückliche Testmail. Versand in Mailchimp | Übernehmen |
| Website, Bestand und Neubau | `app/cms/Website.tsx`, `ExistingWebsite.tsx`, `WebsiteBuilder.tsx`, `WebsitePublication.tsx`, `WebsiteTemplates.tsx`, `Cms.tsx`, `/api/cms/state`, `/api/site-cms/*`, `/api/websites`, `/sites/[slug]/[...path]` | Unter Inhalte | Übernehmen und vereinfachen. Kein Wireframe hier |
| Text, Bild, Bildbearbeitung, Grafik, Videoplanung, Export | `app/studio/ContentStudio.tsx` Aufgaben `text`, `image`, `photo`, `graphics`, `film`, `export`; `GraphicsEditor.tsx`; `/api/studio/*` | Unter Inhalte | Übernehmen und vereinfachen. Video ist im gelesenen Code Planung, kein Rendering |
| 3D | Im gelesenen App-Code kein eigener Arbeitsbereich. Erwähnung nur in Testtexten als Leistungsbeschreibung | Nicht zuordnen, bis ein Bereich existiert | Nichts streichen, weil nichts als Modul vorliegt. Kein Wireframe |

Wireframe in diesem Paket: Newsletter-Editor, `newsletter.html`. Nicht geprüft: Mailchimp, Link-API, Bildupload, GPT-Dialog, eine echte V4-Vorlage.

## Projekte, Bibliothek, Kalender, Einstellungen

| Funktion | Datei und Route | V2 | Empfehlung |
| --- | --- | --- | --- |
| Konzepte, Versionen, Übergang zu Kampagnen | `app/concepts/Concepts.tsx`, `/api/concepts` | Projekte | Übernehmen und vereinfachen. Kein Wireframe |
| Kampagnen | `app/hub/Hub.tsx` Abschnitt «Kampagnen», `app/studio/AssistantEntry.tsx` | Projekte, zusammen mit Konzepten | Funktion übernehmen. Eigenen Hauptpunkt entfallen lassen (Vorschlag) |
| Bibliothek, Ordner, Papierkorb, Drive | `app/library/Library.tsx`, `Folders.tsx`, `DriveConnection.tsx`, `/api/library/*`, `/api/drive/*` | Bibliothek | Übernehmen und vereinfachen |
| Ordner an Kunde oder Projekt | `lib/library/folders.ts` Felder `customerId` und `projectId` | Ordner nach Kunde oder Projekt | Datenbezug übernehmen. Die Ansicht fehlt |
| Kalender, Liste, Monat, Europe/Zurich | `app/hub/Hub.tsx` Abschnitt «Kalender», `DraftPlanning` | Kalender mit Status und Rückweg | Übernehmen. Ein Termin ist im Code keine Veröffentlichung |
| Kalender nach aussen schreiben | In der gelesenen Kalender-Oberfläche keine Schreibverbindung zu Apple, Google oder Microsoft | Offene Entscheidung | Nicht erfinden |
| Verbindungen, GPT, Mailchimp-Hinweis | `app/hub/Hub.tsx` Abschnitt «Einstellungen», `SocialConnections.tsx`, `ChatGptIntegration.tsx`, `/api/integrations/gpt/*` | Einstellungen, ausserhalb der sechs Hauptbereiche | Für den Alltag vereinfachen. Technik nicht in die Übersicht |
| Rollen der Anwendung | `prisma/schema.prisma` Modell `User`: Name, E-Mail, aktiv, Sitzung. Kein Rollenfeld | Offene Entscheidung | Nicht aus LinkedIn-Kontorollen ableiten. Die stehen in Tests zu externen Seitenrechten |
| Testzugang | `/testzugang`, `POST /api/test-access` | Nicht in der KMU-Navigation | Für den Alltag entfallen lassen (Vorschlag). Interner Prüfzugang kann bleiben |

Kein Wireframe in diesem Paket für Projekte, Bibliothek, Kalender und Einstellungen. `noch-offen.html` sagt das, sie ist keine Gestaltung.

## CI und Typografie, nur gelesen

| Was | Datei | Befund aus dem Lesen |
| --- | --- | --- |
| Prüfworkflow | `.github/workflows/akquise-checks.yml` | Läuft bei Push auf `feat/akquise-production-readiness` und bei Pull Requests, die `apps/akquise/**` oder den Workflow ändern. Schritte im File: Lint, Typecheck, Unit-Tests, Integration, Build, Playwright, Docker-Build ohne Veröffentlichung. In diesem Auftrag nicht ausgeführt |
| Auto-Merge | `.github/workflows/studioone-express-automerge.yml` | Nur Pull Requests, die nicht Entwurf sind und nach `feat/akquise-production-readiness` zielen. Drafts werden übersprungen |
| UI-Schrift | `app/studioone-design-system.css`, `app/globals.css` | `Arial, Helvetica, sans-serif`. Kein `@font-face` in den gelesenen CSS-Dateien |
| Laufweite V1 | Dieselbe Design-Datei, dazu `studioone-dashboard.css`, `studioone-area-intro.css`, `studioone-workspaces.css`, `mailstudio-visual.css`, `globals.css` | Engere Laufweite bei Fliesstext, Überschriften und grossen Eyebrows, zum Beispiel `-.005em`, `-.025em`, `-.035em`, `-.045em`, `.14em`, `.32em`. Dieser Entwurf setzt `letter-spacing: normal` |
| Zwei Cyan-Werte | `globals.css` setzt `--cyan: #297dc3`. `studioone-design-system.css` setzt danach `--cyan: #00c5e8` | Der Entwurf verwendet `#00c5e8`, wie das Logo und die spätere Design-Datei. Das ist keine neue Farbe |

## Was dieser Auftrag nicht geprüft hat

- Keine Bedienung von V1 und keine der dortigen Testskripte.
- Kein Abgleich mit dem laufenden Render-Dienst. Die Zuordnung in `docs` und im Workflow ist gelesen, nicht live abgefragt.
- Kein Usability-Test, kein iPad-Gerät, kein Tastaturtest mit einer Person, kein Screenreader.
- Die PNG-Dateien sind Screenshots der statischen HTML-Dateien, keine Screenshots von StudioONE.
- Folgeseiten der Akquise, Social, Website, Bild, Video, Grafik, Projekte, Bibliothek, Kalender und Einstellungen haben keinen Entwurf.
- Kundenweg, Rollen und Kalender-Schreibsync sind offen.
