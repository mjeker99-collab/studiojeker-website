# Einfacher Einstieg und dauerhaftes Wissen

Das Content-Studio startet mit «Was möchtest du machen?» und einer Nachricht an GPT. «Text erstellen», «Bild bearbeiten» und «Video planen» sind optionale Einstiege. Eine Nachricht genügt zum Start; GPT fragt nach fehlenden Angaben. Bildquellen und Auftragsoptionen werden bei Bedarf geöffnet. Kosten und Übermittlung werden erst beim ausgefüllten Auftrag bestätigt. Es gibt keinen kostenpflichtigen Begrüssungsaufruf.

Unter «Projekte öffnen oder neues Gespräch beginnen» lassen sich bestehende Gespräche fortsetzen und neue Aufträge einer Firma bzw. Kampagne zuordnen. «Beiträge bearbeiten» öffnet die vorhandenen Briefing-, Grafik-, Foto-, Filmplanungs-, Freigabe- und Exportfunktionen. Der Wechsel erhält ungespeicherte Editor-Eingaben. GPT startet keine Veröffentlichung und keinen Video-Render.

## Was GPT kennt

- Das aktuelle Markenprofil der eigenen Organisation, jeweils mit Revision.
- Name des angemeldeten Benutzers und dessen gespeicherte Arbeitsvorgaben.
- Bei einem Kundenauftrag dessen aktuelles Kundenwissen.
- Optional die fünf zuletzt angelegten anderen Content-Projekte derselben Organisation und desselben Kunden (einschliesslich der eigenen Firma ohne Kundenzuordnung).

Projektwissen enthält Titel, Thema, Ziel und gekürzte Auszüge des jeweils letzten erfolgreichen GPT-Gesprächs. Es ist keine vollständige Erinnerung, keine automatische Bestätigung früherer Vorschläge und keine erneute Übertragung früherer Bilddateien. Strategiekonzepte und Projekte anderer Kunden werden nicht als Projektgedächtnis geladen. Historische Projekte werden nicht verändert. Ältere Projekte können gezielt über die Projektwahl wieder geöffnet werden.

Unter «Was GPT über dich und die Firma weiss» stehen die verwendeten Quellen und die aktuellen früheren Projekte. Die Projektberücksichtigung lässt sich pro Auftrag ausschalten. Persönliche Vorgaben werden über «Meine Vorgaben speichern» dauerhaft gespeichert; auch Leeren ist möglich. Es gibt keine automatische Extraktion angeblicher Fakten aus Gesprächen. Firmenangaben werden im bestehenden Markenprofil bzw. Kundenwissen gepflegt. Es werden ausschliesslich Daten aus StudioONE genutzt, keine Erinnerungen aus einem privaten ChatGPT-Konto.

Der Server stellt den Kontext organisations- und kundenbezogen zusammen und speichert ihn beim Einplanen im Auftrag. Spätere Profiländerungen verändern einen bereits bestätigten Auftrag nicht. Die Chatnachricht zeigt die verwendeten Firmen-/Projektquellen. Der gewöhnliche Gesprächsverlauf bleibt auf zwölf erfolgreiche Runden begrenzt. Direkte Bildbearbeitung erhält weiterhin nur Bild, aktuelle Anweisung und gegebenenfalls den ausdrücklich ausgewählten Vorschlag.

Benutzer bearbeiten ausschliesslich ihre eigenen Vorgaben. Der aktuelle Benutzerzustand liefert keine Vorgaben anderer Benutzer. Projektaufträge und ihre Ergebnisse gehören zum gemeinsamen internen Arbeitsbereich; im Auftrag gespeicherte Vorgaben können dort eingesehen werden. Kundenzugänge oder neue Mandanten werden nicht freigeschaltet.

## Deployment und Prüfung

Additive Migration `20261021100000_studio_user_context` vor dem Umschalten mit dem bestehenden Migrationsablauf anwenden (`npm run db:migrate`). Sie ergänzt zwei Benutzerfelder; bestehende Projekte, Dateien und Freigaben bleiben bestehen. Readiness prüft die neuen Spalten. Keine neue Abhängigkeit, kein Modellwechsel, kein zusätzlicher Dienst.

Tests prüfen dauerhafte Vorgaben und Konfliktschutz, serverseitigen Kontext mit unverändertem Auftrags-Snapshot, Ausschluss anderer Kunden sowie Abschalten des Projektgedächtnisses. Browserprüfungen decken den einfachen Einstieg auf iPad/Telefon, ausgeblendete Fachoptionen, erneutes Laden persönlicher Vorgaben und die weiterhin nutzbaren Bild-, Grafik- und Exportabläufe ab. KI-Aufrufe bleiben simuliert.
