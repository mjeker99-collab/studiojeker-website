# V2 Detailprüfung: Mailassistent, Newsletter und Übergänge
Stand 12.11.2026. Geprüfter Repository-Stand: 0a20b5706d689a29eb5eab862b82dc61d98e51f4.
Methode: statische Quellcodeprüfung. Keine Browser-, iPad-, Provider- oder Versandtests ausgeführt. Keine V1-Codeänderung. Dieser Bericht ergänzt und präzisiert V2-ARBEITSAUFTRAG.md.

## Priorisierte Befunde
### P1 – Manuelle Newsletter-Arbeit kann verloren gehen
Beleg: app/hub/Hub.tsx, edit() Zeilen 278–297 ersetzt form ohne dirty-Prüfung; Vorlagenstart Zeilen 1037–1051 und 1093–1115 ersetzt ebenfalls den lokalen Entwurf. app/page.tsx Zeilen 747–780 rendert Hub mit key={tab}; Bereichswechsel erzeugt eine neue Instanz. navigate() prüft nur conceptDirty. Manuelle Änderungen werden im Hub lokal gehalten und über «Version speichern» gespeichert.
Folge: Nutzer ändert Text, öffnet andere Ausgabe oder wechselt Bereich; noch nicht gespeicherte Eingaben gehen in diesen Pfaden verloren.
V2: automatische versionierte Sicherung, sichtbarer Speicherstatus, Konfliktbehandlung und Wiederaufnahme pro Dokument. Bei fehlgeschlagener Sicherung Entwurf erhalten und Wechsel abfangen.
Abnahme: Text ändern, andere Ausgabe öffnen, zurückkehren; Bereich wechseln; neu laden; Speichern bei Netzfehler. Alle Eingaben erhalten oder sichtbar wiederherstellbar.

### P1 – Newsletter-Check ist von der eigentlichen Freigabe getrennt
Beleg: NewsletterPreflight.tsx hat lokalen confirmed-State und keine Rückmeldung an den Parent; Hub.tsx 1463–1503 bindet Freigabe an read/dirty, 1582–1623 Export/Transfer an gespeicherte freigegebene Version. Der Vorabcheck ist dort keine Voraussetzung. lib/hub/api.ts nimmt für Freigabe version/decision/read und für Export version entgegen, keinen Check-Nachweis.
Keine Behauptung eines unautorisierten Versands: Freigabe und Transfer haben eigene Schutzlogik. Das Problem ist ein irreführender zusätzlicher «versandbereit»-Status.
V2: eine verständliche Prüfung des konkreten Stands. Pflichtfehler blockieren die relevante Aktion; manuell zu prüfende Punkte benennen. Redaktionelle Freigabe, Mailchimp-Übertragung und tatsächlichen Versand unterscheiden.
Abnahme: fehlendes Feld/ungültiger Link nach Prüfung ändern; Status muss zum aktuellen Stand passen. Geprüft wird der exportierte Stand.

### P1 – Gruppenfehler bei persönlichen Mailtexten sind nicht ausreichend zugeordnet
Beleg: MailAssistant.tsx generate() verarbeitet Zehnergruppen, zählt gespeicherte Texte, reduziert apply-Fehler aber auf message und fügt sie als Text zusammen. Ein Requestfehler beendet mit break die restlichen Gruppen. lib/mail-assistant/service.ts liefert bereits Ergebnisse mit id/ok/message.
Folge: Nutzer erfährt die Erfolgszahl, aber nicht klar, welche Empfänger fehlgeschlagen oder noch unbearbeitet sind.
V2: je Empfänger gespeichert/fehlgeschlagen/nicht bearbeitet/unklar anzeigen; Wiederaufnahme nur für betroffene Einträge. Bei unklarem Providerergebnis zuerst bestehenden Auftrag abgleichen.
Abnahme: 97 Entwürfe; Fehler in zweiter Gruppe. Erfolgreiche, fehlgeschlagene und noch nicht gestartete Elemente getrennt zeigen; keine erneute Generierung erfolgreicher Texte.

### P2 – Statusabfrage und Wiederaufnahme erfordern Wissen über den Verlauf
Beleg: MailAssistant.tsx lädt Verlauf beim Öffnen; Hinweis «Verlauf zum Aktualisieren erneut öffnen». Auftragsschlüssel wird pro Generierung neu erzeugt. Server verhindert Wiederholung desselben Schlüssels und schützt Budget/laufende Jobs.
V2: Status im aktuellen Arbeitsablauf aktualisieren; laufenden Auftrag nach Rückkehr anzeigen. Technische Jobzustände in verständliche Handlung übersetzen. Keine blinde Wiederholung kostenpflichtiger Aufträge.
Abnahme: während eines Auftrags unterbrechen und zurückkehren; Ergebnis oder ungeklärten Zustand ohne neue Generierung finden.

### P2 – Recherche → neue Kontakte hat keinen gezielten Anschluss
Beleg: Import liefert Anzahl und Dubletten; onOpenContacts in page.tsx 853 setzt nur den Tab. Die gerade importierten IDs werden nicht als gezielte Auswahl übergeben.
V2: «Für diese neuen Kontakte Nachrichten vorbereiten» mit konkreter Teilmenge. Vorhandene Kontakte separat behandeln.
Abnahme: Recherche importieren und exakt die neuen Kontakte weiterbearbeiten, ohne sie erneut in der gesamten Liste zu suchen.

### P2 – Auswahl bleibt je nach Navigationsweg unterschiedlich erhalten
Beleg: page.tsx navigate() 225–227 leert Auswahl/Suche/Filter. Der direkte Weg «Mails erstellen» 1007–1015 übernimmt die gewählten IDs dagegen korrekt.
V2: Arbeitskontext pro Aufgabe erhalten, bewusstes «Auswahl leeren» anbieten.
Abnahme: dieselbe Kontaktgruppe über Dashboard, Navigation und direkten Folgeschritt öffnen; keine überraschenden Verluste.

### P2 – Mehrere konkurrierende Newsletter-Einstiege
Beleg: Hub.tsx 1033–1123 bietet Grundvorlage, letzte gespeicherte Version und ausgewählte Vorlage; hinzu kommen Import und Vorschau.
V2: ein klarer Start «Newsletter erstellen», vorhandene Ausgabe unter «Weiterbearbeiten». Vorlagenwahl und Import nachgeordnet. Letzte Ausgabe als Basis nutzen, ohne diese versehentlich zu überschreiben.
Abnahme: unerfahrene Person erstellt neue Ausgabe und bearbeitet bestehende Ausgabe ohne Verwechslung.

### P2 – Links in der Newsletter-Vorschau sind absichtlich inaktiv
Beleg: NewsletterEditor.tsx zeigt explizit «Links sind in der Vorschau inaktiv» und nutzt eine eingeschränkte iframe-Vorschau. NewsletterLinkTester bietet separate Ziel-Links.
Dies erklärt das Verhalten dieser internen Newsletter-Vorschau; es beweist NICHT die Ursache der früher nicht öffnenden lokalen V2-HTML-Dateilinks.
V2: eindeutig sichtbarer Prüfmodus mit benannten Links/Zielen, ohne Vorschau-Sicherheitsgrenzen pauschal aufzuheben.
Abnahme: jeden sichtbaren CTA seinem Ziel zuordnen und in eigenem Tab prüfen; iPad prüfen.

### P2 – Linktest hat bewusst begrenzte Aussagekraft
Beleg: NewsletterLinkTester prüft editierbare Link-Slots, keine Bild-Slots. API maximal 20 URLs / 8000 Bytes. newsletter-link-check.ts prüft ausgewählte Hosts mit HEAD; Umleitungen/Timeout/andere Hosts werden als manuell zu prüfen gemeldet.
V2: Zielerreichbarkeit, inhaltliche Kontrolle und Bildverfügbarkeit getrennt verständlich zeigen. Keine grüne Gesamtfreigabe allein aufgrund HTTP-Erreichbarkeit. Für viele Links begrenzte Batches verwenden.
Abnahme: 404, Redirect, Timeout, externer Host, defektes Bild, mehr als 20 Links. «Nicht automatisch prüfbar» nicht als kaputt bezeichnen.

### P2 – Bildimport ist vorhanden, Speichern bleibt ein zusätzlicher Schritt
Beleg: NewsletterImageField.tsx bietet Upload und LibraryPicker, lädt über /api/mailchimp/images und meldet «Newsletter noch speichern». Sichtbares URL-Feld bleibt parallel bestehen.
Korrektur zum früheren Bericht: Manuelle Bildbearbeitung verlangt NICHT ausschliesslich das Einfügen einer öffentlichen URL. Upload und Bibliotheksauswahl existieren bereits; beim GPT-Dialog gelten andere Eingabegrenzen.
V2: Bild direkt wählen, Vorschau aktualisieren und Änderung automatisch sichern. URL unter Erweitert. Rechte und externen Mailchimp-Upload weiterhin verständlich kenntlich machen.
Abnahme: Upload, Bibliotheksbild, zu grosse Datei, Uploadfehler und anschliessender Bereichswechsel.

## Bereits vorhandene Verbesserungen erhalten
- Hub edit() bindet templateId an die gewählte Ausgabe; Originalvorlage wird beim Bearbeiten ausgeblendet.
- Editor wird nach Öffnen gescrollt und fokussiert. Frühere Scroll-/Versionsprobleme nicht pauschal erneut als bestehend behaupten.
- NewsletterWorkspace zeigt den aktuellen form-Stand; Mailtexte haben einen direkten Übergang mit Kontakt-IDs.
- Mailassistent prüft Dubletten/Qualifikation serverseitig erneut.
- applyMailAssistant kontrolliert Kontaktrevision, behandelt bereits übernommene identische Texte, bewahrt vorhandene Links/Medien und liefert Einzelresultate. Diese Logik wiederverwenden.
- Budgetlimits, Auftragsschlüssel und kein automatischer Neustart bei unklarem Providerresultat sind vorhanden.
- Linkprüfung unterscheidet kaputt und manuell zu prüfen; begrenzte Hosts und keine Weiterleitung von Cookies bleiben erhalten.

## Ergebnis und nächste Umsetzung
Die genannten offenen Komponenten und ihre zentralen Übergänge sind statisch vertieft geprüft. Die Prüfungen belegen Verbesserungsbedarf in Arbeitszustand, Ergebniszuordnung und Bedienführung. Sie ersetzen keine praktische Gesamtabnahme.

V2 zuerst: (1) zuverlässige Sicherung/Wiederaufnahme, (2) eindeutiger Folgeschritt samt Kontext, (3) konkrete Einzelresultate und Wiederaufnahme nach Fehlern, (4) einheitliche versionsgebundene Prüfung, (5) reduzierte Editoroberfläche.
Danach diese Fälle in isolierter V2 mit Testdaten ausführen und echte Desktop-/iPad-Screenshots liefern. Noch keine Codekorrektur, kein Merge und kein Deployment in diesem Prüfschritt.
