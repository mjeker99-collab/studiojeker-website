# Prüfbericht 27.11.2026 – umgesetzte Punkte

Grundlage: Prüfbericht vom 27.11.2026 (Befunde SO-001 bis SO-017) zum Stand `aaec49f`.
Dieser Stand behebt Fehler und kleine Bedienhürden. Versandlogik, Mailtexte,
Navigation und Gestaltung sind unverändert.

| ID | Änderung |
| --- | --- |
| SO-001 | Schritt 2 der Akquise: Checkboxen und Radios im Ablauf behalten ihre eigene Grösse. Der Bestätigungstext steht wieder neben der Checkbox. |
| SO-002 | Kontaktimport: deutsche Spaltennamen (Firma, Vorname, Nachname, E-Mail, Branche, Ort, Funktion, Website, Quelle, Anknüpfungspunkt, Dienstleistung, Verantwortlich, Notizen) werden erkannt. Doppelte Zeilen in der Datei brechen den Import nicht mehr ab, sie werden als übersprungen gezählt. Fehlermeldungen nennen Zeile und Feld in Alltagssprache. Status-, Einwilligungs- und Freigabespalten bleiben abgelehnt. |
| SO-003 | Abschlussmeldung bei ausgeschaltetem Versand sagt klar, dass eingeplante Mails beim Einschalten ohne Rückfrage hinausgehen und wo sie entfernt werden können. Die Logik ist unverändert. |
| SO-004 | Versandverlauf zeigt die Antwortquote. Das Zeilenmenü angeschriebener Kontakte hat den Eintrag «Antwort erfassen». |
| SO-006 | Die eingegebene Grundlage der Kontaktaufnahme bleibt beim Neuladen erhalten. |
| SO-007 | Mails ohne Grundlage heissen «Grundlage fehlt noch» statt «Bereit». Eingeplante Kontakte sind in der Kontaktliste gekennzeichnet. |
| SO-008 | Kontakt erfassen zeigt vier Felder; Recherche- und Rechtsfelder liegen unter «Weitere Angaben». Die Grundlage der Kontaktaufnahme hat Beispiele. |
| SO-009 | Meldungen nennen die Firma statt der internen Kennung. Hinweise ohne «Render», «GitHub» und «Hintergrunddienst». |
| SO-016 | «1 Entwurf», Datum als 27.11.2026, «alle 15 Minuten eine Mail». |
| SO-017 | Versandverlauf erklärt, dass das Zeitfenster nur für den laufenden Zeitplan gilt. |

Nicht Teil dieses Stands, weil eine Entscheidung nötig ist: SO-005 (Mandantenfähigkeit),
SO-010 (Einstieg Newsletter, Social Media, Website), SO-011 (Mailvorlage), SO-012
(Versandtakt, Abmelde-Header), SO-013 (Datenbank-Freigabe), SO-014 (Repository
öffentlich), SO-015 (Adresse in der Signatur).
