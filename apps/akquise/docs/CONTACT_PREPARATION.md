# Prüfdaten gesammelt übernehmen

In Kontakte eine Auswahl markieren (maximal 200). Oberhalb der Tabelle erscheint
„Prüfdaten aus Notizen prüfen“. Das ist eine Vorschau ohne Schreibzugriff.

Übernommen werden nur leere Felder aus eindeutig beschrifteten Notizen:
Quellen-URL (HTTP/S), Prüfdatum (TT.MM.JJJJ oder JJJJ-MM-TT), ausdrücklich
bestätigte persönliche Adresse und dokumentierter Anknüpfungspunkt. Fehlt letzterer,
wird der erste Absatz eines gültigen importierten Mailentwurfs nach der Anrede
als Vorschlag angezeigt. Der Benutzer muss dessen tatsächlichen Bezug prüfen.
Vorhandene Werte und abweichende Vertrauensstatus werden nicht überschrieben.

Vollständige Vorschläge auswählen, Angaben bestätigen und übernehmen. Die
Vorschläge werden serverseitig neu berechnet; veränderte Kontaktrevisionen sind
blockiert. Änderungen nutzen die vorhandene Kontaktaktualisierung und deren Audit,
Revisionierung und Invalidierung früherer Freigaben. Unvollständige, gesperrte und
allgemeine Adressen bleiben sichtbar und können im Kontaktformular bearbeitet
werden. Danach die Vorschau erneut laden.

Die Funktion recherchiert keine Quellen erneut und erklärt keinen Versand für
zulässig. Newsletter-Einwilligung, Rechtsprüfung und Mailfreigaben werden weder aus
öffentlicher Verfügbarkeit noch aus Notizen abgeleitet. Importverhalten unverändert.

„Entwürfe für Auswahl vorbereiten“ verarbeitet jeden Kontakt separat. Ein
Prüffehler stoppt die übrigen Kontakte nicht. Pro Kontakt erscheinen Erfolg oder
konkrete fehlende Daten. Aktuelle Entwürfe mit passender Kontaktrevision und
Signatur werden unter dem Kontakt-Lock wiederverwendet, auch bei wiederholten oder
gleichzeitigen Sammelanfragen. Es werden keine Mails versendet oder eingeplant.

Keine Datenmigration oder neue Umgebungsvariable erforderlich.
