# Content-Studio: GPT-Dialog

Erster Ausbau: gespeicherte Textgespräche pro Content-Serie, optional einer Kampagne zugeordnet. GPT erhält das Serienbriefing, Kampagnenziel, aktuelle Beitragsentwürfe, ausgewählte Markenregeln und Referenztexte. Die letzten zwölf erfolgreichen Gesprächsrunden werden aus der Datenbank geladen. Keine Bilder werden an diesen Textdialog übertragen.

Der Dialog verwendet die vorhandenen StudioJob-Datensätze (kind CHAT). Keine Datenbankmigration. Aufträge durchlaufen dieselben serverseitigen Rollen-, Budget-, Tageslimit- und Einmalstart-Prüfungen wie andere KI-Aufträge. Antworten erscheinen im Gespräch und werden nicht automatisch als freigegebene Inhalte übernommen.

## Aktivierung

Vorhandene serverseitige Konfiguration: OPENAI_API_KEY, CONTENT_AI_ENABLED=true, CONTENT_TEXT_MODEL. Das Modell muss für den verwendeten API-Account verfügbar sein. Die Budgetreservierung ist kein garantierter Preis. Keine Schlüssel im Browser oder Repository hinterlegen.

## Noch offen

Der Chat formuliert Texte, Ideen und Produktionsprompts. Er führt keine Bild- oder Videowerkzeuge aus. Für die vollständige dialogbasierte Produktion fehlen noch Werkzeuggestützte Aufträge mit Vorschau, Freigabe und Rückgabe ins Gespräch sowie Referenzbildübertragung.

Higgsfield MCP (https://mcp.higgsfield.ai/mcp) verwendet OAuth und das bestehende Kontoguthaben. StudioONE benötigt eine eigene autorisierte Verbindung, deren Tokens serverseitig gespeichert und erneuert werden. Die Verbindung in ChatGPT ist nicht übertragbar. Die normale Higgsfield API wird separat abgerechnet. Keinen API-Fallback ohne bewusste Entscheidung einrichten.

Quellen, geprüft 17.10.2026:

- https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api
- https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp

Vor Live-Aktivierung: Datenbankspeicherung/Neuladen, doppelte Starts, Budgetgrenzen und Serienzuordnung in der Zielumgebung prüfen. Ohne Schlüssel bleiben Sendeschaltflächen deaktiviert. Ein vorhandener Schlüssel allein bestätigt keine erfolgreiche Anbieteranfrage.
