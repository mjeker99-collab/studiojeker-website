# Täglicher personalisierter Versand

Unter Kontakte/Akquise → Versandhistorie steht der tägliche Mailversand.
Standard: pausiert, 25 pro Tag, Montag–Freitag 09–17 Uhr, 15 Minuten Abstand,
Zeitzone Europe/Zurich (Sommer-/Winterzeit automatisch).

1. Personalisierte Entwürfe vorbereiten, Kontaktprüfung dokumentieren und jede
   aktuelle Nachricht einschliesslich Signatur persönlich freigeben.
2. In Versandhistorie die freigegebenen Nachrichten auswählen und Einplanen bestätigen.
   Pro Nachricht wird das Ergebnis angezeigt. Fehlende Freigaben werden nicht erzeugt.
3. Zeitplan speichern. Für 25/Tag muss DAILY_SEND_LIMIT mindestens 25 betragen.
   Das bestehende Serverlimit wird nicht automatisch erhöht.
4. Nach erfolgreichem internen Test MAIL_MODE=production setzen; vorhandene SMTP-
   Aktivierung und Bestätigung bleiben erforderlich. Erst die ausdrückliche
   Bestätigung und „Automatik starten“ aktivieren den echten Versand.
5. Mit Pausieren stoppen. Bereits laufender SMTP-Versand kann noch abgeschlossen werden.

Keine neue Render-Ressource und kein zusätzlicher Secret erforderlich. Der bestehende
Produktionsstarter scripts/start-production.mjs ruft alle 60 Sekunden den internen
Tick mit einem zufälligen, nur an den Kindprozess übergebenen Token auf. Browser-
Sitzungen sind dafür nicht erforderlich. Der Web-Service muss durchgehend laufen;
bei Schlafmodus/Stillstand erfolgt kein Versand und kein Nachholen verpasster Mengen.
Die Oberfläche zeigt fehlenden Heartbeat nach drei Minuten. Nach Neustart wird die
persistierte Warteschlange mit Abstand und gleichem Tageszähler fortgesetzt.

Deployment: prisma migrate deploy (neue Tabellen), Build und üblicher Render-Start.
Vorhandene Nachrichten und Freigaben werden durch diese Migration nicht verändert.
Prüfung nach Deployment: Heartbeat sichtbar, Standard pausiert, Testmodus kann die
Automatik nicht starten. Noch keine echten Kontakte für einen Infrastrukturtest anschreiben.

Alle Produktions-Versandversuche einschliesslich Einzelversand zählen gegen das
Tageslimit ab Schweizer Mitternacht. Das kleinere Limit aus Zeitplan und Server gilt
für die Automatik. Leere Warteschlange wartet auf weitere ausdrücklich eingeplante
Versionen. Kein automatisches Generieren, Freigeben oder Nachfassen bei Kontakten.

Der globale Datenbank-Lock serialisiert Claim, Pause und Zeitplanänderungen. Eine
durable SENDING-Reservierung erfolgt vor SMTP. Bei Absturz wird sie nie erneut
gesendet; nach zwei Minuten erkennt der Runner den unterbrochenen Vorgang und pausiert.
SMTP-Fehler/unklare Zustellung pausieren ebenfalls. Postfach/Provider-Protokoll prüfen,
Ergebnis bei UNKNOWN dokumentieren und anschliessend bewusst neu starten. Die
Idempotenzsperre bleibt auch nach manuellem Abgleich erhalten.

Geänderte/entzogene Freigabe, geänderter Kontakt, Sperrliste oder Signatur blockieren
die betroffene Nachricht. Sie kann nach Korrektur und Freigabe erneut eingeplant
werden, solange kein Versandversuch existiert. Jede Aktivierung und Auswahl wird
mit der handelnden Person protokolliert. Deaktivierte Benutzer dürfen weder
aktivieren noch als Auftraggeber oder Freigebende versenden.
