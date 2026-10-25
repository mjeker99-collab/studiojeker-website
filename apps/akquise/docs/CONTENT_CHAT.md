# Content-Studio: GPT-Dialog

Gespeicherte Gespräche pro Content-Serie, optional einer Kampagne zugeordnet. GPT erhält das Serienbriefing, Kampagnenziel, aktuelle Beitragsentwürfe, ausgewählte Markenregeln und Referenztexte. Die letzten zwölf erfolgreichen Gesprächsrunden werden als Text aus der Datenbank geladen.

## Projekte finden und zuordnen

Unter Kampagnen und Social Media ist die Projektauswahl bereits oberhalb des eingeklappten GPT-Dialogs sichtbar. Nach Kampagne filtern oder nach Projektname suchen, ein gespeichertes Projekt auswählen und «Projekt und GPT-Verlauf öffnen» verwenden. Projekte ohne Zuordnung bleiben sichtbar. «Mit GPT weiterarbeiten» an einer Kampagne wählt deren Kontext und, falls vorhanden, das neueste zugeordnete Projekt vor. Für neue Gespräche werden Kunde und Kampagne aus dieser Auswahl übernommen; das Öffnen allein löst keinen KI-Auftrag aus.

Im geöffneten Gespräch steht die Projektwahl vor dem Verlauf. Unter «Projektname und Zuordnung ändern» können bestehende Projekte umbenannt und nachträglich Kunde/Kampagne zugeordnet werden. «Zuordnung sichern» aktualisiert Briefing und Inhaltsentwürfe in einer Transaktion. Bei geändertem Kampagnenbezug entstehen neue Inhaltsversionen; alte Versionen und GPT-Aufträge bleiben erhalten. Inhalte ausserhalb des Entwurfsstatus werden nicht umgehängt. Ein veralteter Browserstand meldet einen Konflikt, statt eine zwischenzeitliche Zuordnung zu überschreiben. Die Kampagnenübersicht wird nach erfolgreicher Zuordnung aktualisiert.

Der Verlauf wird über die ausgewählte Projekt-ID nachgeladen. Dadurch verschwinden ältere Antworten nicht aus der Anzeige, wenn neuere Aufträge anderer Projekte das globale Startseitenlimit von 100 Aufträgen überschreiten. Der an GPT übermittelte Kontext bleibt weiterhin auf die letzten zwölf erfolgreichen Gesprächsrunden begrenzt. Diese Änderung benötigt keine Datenbankmigration.

Bis zu vier ausdrücklich ausgewählte Bibliotheksbilder werden an der aktuellen Nachricht als Base64-Bildinput übermittelt. Der Server prüft Organisationszugehörigkeit, Archivstatus, Bildtyp, Nutzungsrechte und Übermittlungsbestätigung. Im Auftrag stehen nur Asset-IDs; Bildbytes werden beim Start privat geladen und anhand ihrer Prüfsumme validiert. Die Auswahl bleibt innerhalb des geöffneten Gesprächs bestehen, wird beim Gesprächswechsel geleert und vor jeder Sendung sichtbar ausgewiesen. Bilder aus historischen Nachrichten werden nicht erneut geladen. Upload verwendet die bestehende private Bibliothek (JPEG/PNG/WebP, 8 MB, 20 MP); ohne eingerichteten Speicher bleibt der Bildbereich deaktiviert. Das konfigurierte Textmodell muss Bildinput unterstützen. Bildtokens können die tatsächlichen Kosten erhöhen; Reservierungen sind kein Preislimit.

Der Dialog verwendet die vorhandenen StudioJob-Datensätze (kind CHAT). Keine Datenbankmigration. Aufträge durchlaufen dieselben serverseitigen Rollen-, Budget-, Tageslimit- und Einmalstart-Prüfungen wie andere KI-Aufträge. Antworten erscheinen im Gespräch und werden nicht automatisch als freigegebene Inhalte übernommen.

Bild- und Videoaufträge lassen sich im GPT-Dialog ausdrücklich markieren. GPT formuliert ein Produktionsbriefing; nach erfolgreicher Antwort kann der Nutzer einen Übergabetext kopieren und ChatGPT öffnen. Dort wählt GPT mit den im eigenen ChatGPT-Konto verfügbaren Werkzeugen gegebenenfalls Higgsfield und holt vor kostenpflichtiger Generierung die Freigabe ein. Ausgewählte Bildreferenzen aus StudioONE werden **nicht** mit dem Text kopiert und müssen in ChatGPT erneut angehängt werden. Keine automatische Auftragserteilung, Generierung oder Rückübertragung in die StudioONE-Bibliothek.

## Aktivierung

Vorhandene serverseitige Konfiguration: OPENAI_API_KEY, CONTENT_AI_ENABLED=true, CONTENT_TEXT_MODEL. Das Modell muss für den verwendeten API-Account verfügbar sein. Die Budgetreservierung ist kein garantierter Preis. Keine Schlüssel im Browser oder Repository hinterlegen.

## Noch offen

Der Chat analysiert ausgewählte Bilder und formuliert Texte, Ideen und Produktionsprompts. Er führt noch keine Bild- oder Videowerkzeuge aus. Für die vollständige dialogbasierte Produktion innerhalb von StudioONE fehlen OAuth-Verbindung, werkzeuggestützte Aufträge mit Vorschau, Freigabe und Rückgabe ins Gespräch.

Am 17.10.2026 wurde StudioONE über den veröffentlichten Dynamic-Registration-Endpunkt registriert. Öffentliche Client-ID: B7qdeQzsJZwc4HOB. Callback: https://studiojeker-akquise.onrender.com/api/studio/higgsfield/callback. Dies bestätigt nur die Registrierung, KEINE Kontoverbindung. Callback, PKCE/State, verschlüsselte Tokenspeicherung, Erneuerung und Generierungsadapter sind noch zu implementieren. Keine bestehenden ChatGPT-Tokens übernehmen.

Higgsfield MCP (https://mcp.higgsfield.ai/mcp) verwendet OAuth und das bestehende Kontoguthaben. StudioONE benötigt eine eigene autorisierte Verbindung, deren Tokens serverseitig gespeichert und erneuert werden. Die Verbindung in ChatGPT ist nicht übertragbar. Die normale Higgsfield API wird separat abgerechnet. Keinen API-Fallback ohne bewusste Entscheidung einrichten.

Quellen, geprüft 17.10.2026:

- https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api
- https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp

Vor Live-Aktivierung: Datenbankspeicherung/Neuladen, doppelte Starts, Budgetgrenzen und Serienzuordnung in der Zielumgebung prüfen. Ohne Schlüssel bleiben Sendeschaltflächen deaktiviert. Ein vorhandener Schlüssel allein bestätigt keine erfolgreiche Anbieteranfrage.
