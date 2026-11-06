# Auslagerung nach studiojeker-akquise ohne Datenverlust

## Ergebnis der Strukturprüfung

Die Anwendung ist eigenständig. Ihr Paket, Lockfile, Prisma-Schema, Migrationen, Styles und Konfigurationen liegen vollständig in `apps/akquise/`. Es gibt keine Imports aus der Website, keine Änderungen am Root-Paket und keine Verbindung zum Website-CMS. `outputFileTracingRoot` und Turbopack-Root zeigen auf das eigene Anwendungsverzeichnis. Alle Befehle funktionieren später unverändert im neuen Repository-Root.

Git enthält Quellcode und Migrationen; die produktiven Daten liegen ausschliesslich in PostgreSQL. Ein Git-Umzug verschiebt keine Datenbank und darf sie nicht neu anlegen oder zurücksetzen.

## Empfohlener Weg: bestehende Datenbank weiterverwenden

1. Arbeit auf den freigegebenen Branch/Commit festlegen; bestehende Website nicht ändern.
2. Aus einem separaten Clone einen Subtree-Branch erzeugen: `git subtree split --prefix=apps/akquise -b export/akquise-v1`. Das verändert keine Website-Dateien. Alternativ `git filter-repo --path apps/akquise/ --path-rename apps/akquise/:` ausschliesslich in einem Wegwerf-Clone verwenden.
3. Privates Repository `studiojeker-akquise` erstellen. Den Export-Branch dorthin pushen. Kein Force-Push ins Website-Repository. Repository-Erstellung und Remote-Änderungen wurden hier nicht ausgeführt.
4. `.env`, Benutzer-Passwörter, Google-Zugangsdaten und ggf. lokale `.local/postgres`-Daten separat und geschützt erhalten. Sie sind absichtlich nicht in Git. Deployment-Secrets neu binden; DATABASE_URL auf dieselbe PostgreSQL-Datenbank und dasselbe Schema richten.
5. Im neuen Repository `npm ci`, `npm run db:generate`, `npm run db:migrate`, Tests und Build ausführen. `migrate deploy` verwendet die bestehende `_prisma_migrations`-Tabelle und wendet nur fehlende Migrationen an. Niemals `migrate reset`, `db push --force-reset` oder den Seed gegen produktive Daten ausführen.
6. Anwendung zunächst lesend prüfen: Kontaktanzahl, IDs, Versionen, Freigaben, Sperrliste, Audit- und Zustellprotokoll vergleichen. Bestehende Message-IDs und Idempotenzschlüssel bleiben erhalten. Sessions können mit derselben Datenbank weiterbestehen; empfohlen ist eine kontrollierte Abmeldung zum Umzug.
7. Bei unveränderter Datenbank und Domain nur die Anwendung umstellen. Eine Anwendung zur Zeit schreiben lassen; alte Instanz stoppen. Die bestehende Website hat einen unabhängigen Betrieb.

## Falls auch PostgreSQL umzieht

- Geplantes Schreibfenster sperren, alte Anwendung stoppen und mit einem zum Server passenden `pg_dump` ein verschlüsseltes/geschützt abgelegtes Custom-Format-Backup erstellen: `pg_dump --format=custom --file=/sicher/akquise.dump "$DATABASE_URL"`. Prisma-spezifischen URL-Parameter `?schema=public` für die libpq-URL weglassen; Passwort vorzugsweise über einen geschützten `PGPASSFILE` liefern.
- In eine leere Zieldatenbank mit `pg_restore --exit-on-error --no-owner --dbname="$TARGET_DATABASE_URL" /sicher/akquise.dump` wiederherstellen. Keine Sessions, rechtlichen Nachweise, Freigaben, Sperrlisten, Versions- oder Audit-Tabellen auslassen. Keine gleichzeitigen Schreibzugriffe während der Übernahme.
- Vorher einen Restore im Staging testen. Zeilenanzahlen pro Tabelle, Fremdschlüssel, höchste Versionsnummern, Freigabehashes, Message-IDs und Migrationsstand vergleichen. Sperrliste zwingend vollständig prüfen.
- Erst nach erfolgreichem Vergleich DATABASE_URL umstellen. Altes System bis zur Abnahme stillgelegt erhalten. Rollback auf alte Instanz nur, solange die neue Instanz noch keine zusätzlichen Schreibvorgänge angenommen hat; andernfalls Daten abgleichen, nicht blind zurückschalten.
- Ein laufendes PostgreSQL-Datenverzeichnis nicht kopieren. Für lokale Embedded-Datenbank entweder sauber stoppen und auf derselben Major-Version kopieren oder logisch dumpen/restoren. Das hier installierte Embedded-PostgreSQL ist ein Entwicklungshilfsmittel, kein Produktionsbetrieb.

## Nicht ausgeführt

Kein neues Repository erstellt, keine Daten übertragen, kein produktives Deployment, keine Domain- oder DNS-Änderung. Auslagerung ist vorbereitet und dokumentiert; tatsächlicher Umzug erfolgt separat nach Backup und Restore-Prüfung.
