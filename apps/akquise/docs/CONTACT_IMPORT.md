# Masterlisten importieren

StudioONE akzeptiert den XLSX-Export der zusammengeführten Google-Tabelle mit dem Blatt «Kontakte» und ihren 15 vorhandenen Spalten. «Mailverwaltung» wird nicht als Kontaktquelle gelesen. Das ältere Format «Masterkontakte» bleibt unterstützt.

Kontakte ohne E-Mail bleiben recherchierbare Kontakte. Eine fehlende Adresse verhindert Verifikation, Entwurf und Versand. Unterschiedliche Personen dürfen dieselbe Adresse verwenden. Wiederholte Importe erkennen Personen anhand des normalisierten Vor- und Nachnamens und der Organisation; bestehende Einträge werden nicht überschrieben. Geänderte Namensschreibweisen müssen vor dem Import abgeglichen werden.

Prüfstatus, Einwilligung, Akquise-Status und vorhandene Mailtexte werden als Recherche-Notizen erhalten. Ein Import setzt keine Einwilligung oder Versandfreigabe.

## Bereitstellung

Die additive Migration `20261019143000_contact_optional_email` entfernt die Eindeutigkeit der Kontakt-E-Mail zugunsten eines Suchindexes. Die bestehende Eindeutigkeit des Personenschlüssels bleibt erhalten. Bestehende Kontaktdaten werden nicht geändert. Vor Deployment Datenbank sichern, Migration mit dem bestehenden Render-Pre-Deploy ausführen. Ein Rollback auf den alten E-Mail-Unique-Index ist nach neuen Kontakten mit leeren oder gemeinsamen Adressen nicht ohne Datenabgleich möglich.

Die aktuellen 179 Drive-Zeilen wurden lokal durch den Parser geprüft: 179 Kontakte, davon acht ohne E-Mail. Ein echter Datenbankimport wurde nicht ausgeführt. Für den Import die aktuelle Google-Tabelle als Microsoft Excel (.xlsx) herunterladen und unter Kontakte importieren. Bei unveränderten 64 vorhandenen Personen werden 115 neue Kontakte erwartet.
