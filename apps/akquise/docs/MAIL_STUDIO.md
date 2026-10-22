# Mail-Studio und globale Prüfung

Kontakte/Akquise öffnet das Mail-Studio. Der gemeinsame Arbeitsbereich führt
durch Auswahl, globale Prüfung und Versand. Die bisherigen Detailansichten
bleiben erreichbar.

1. Vorhandene Entwürfe suchen und bis zu 200 auswählen (Schnellauswahl: 25).
   Alternativ Kontakte direkt im Mail-Studio auswählen und mit der bestehenden
   Sammelvorbereitung vervollständigen. Danach zu den Mailentwürfen wechseln.
2. Vollständige Nachrichten mit Empfänger, Betreff und Signatur gemeinsam prüfen.
   Die Vorschau zeigt konkrete Hindernisse pro Nachricht. Solche Zeilen sind
   nicht vorausgewählt. Zum Korrigieren den bestehenden Nachrichteneditor öffnen
   und anschliessend die Prüfvorschau neu laden.
3. Wo aktuelle Versandprüfungen fehlen, kann eine ausdrücklich bestätigte
   gemeinsame Grundlage für die gewählte Gruppe eingetragen werden. Sie muss für
   alle betroffenen Kontakte gelten. Öffentliche Auftraggeber verlangen zusätzlich
   die bestehende Beschaffungsrechtsbestätigung. Bestehende gültige Prüfungen
   werden beibehalten. Newsletter-Einwilligungen werden nicht verändert.
4. Gelesene ausgewählte Nachrichten mit einem Klick gemeinsam freigeben.
   Ergebnisse werden pro Nachricht angezeigt. Es wird dabei nichts versendet
   oder eingeplant.
5. Im selben Arbeitsbereich zum Versand wechseln. Die vorhandene Warteschlange
   und der Tagesplan werden unverändert verwendet; Einplanen und Start brauchen
   weiterhin die ausdrückliche Versandbestätigung.

## Technische Grenzen

POST /api/mail-review/preview ist nur eine Prüfung. POST /api/mail-review/approve
verlangt `read: true` und pro Nachricht ID, Version, Hash und Kontaktrevision aus
der Vorschau. Eingaben sind begrenzt und strikt validiert. Die vorhandene
authentifizierte, gegen fremde Origins geschützte API wird verwendet.

Jede Freigabe sperrt den Kontakt und prüft die aktuelle Version, Kontaktrevision,
Signatur, Sperrliste, Versandhistorie und rechtliche Prüfung erneut. Eine neu
bestätigte rechtliche Prüfung und die Mailfreigabe werden in derselben Transaktion
mit individuellem Audit gespeichert. Fehler rollen diese Nachricht vollständig
zurück; andere Zeilen liefern eigene Ergebnisse. Die globale Prüfung umgeht keine
Versandgrenzen. Teilfehler oder Verbindungsabbrüche erfordern erneutes Laden der
Vorschau; es gibt keinen automatischen Versand oder Wiederholungsauftrag.

Das Mail-Studio ist ein geführter Arbeitsbereich. Eine Steuerung durch freie
KI-Chat-Aufträge ist nicht Bestandteil dieser Änderung.
