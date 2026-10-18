# Interne Kundenprofile in StudioONE

Unter **Kunden** erfassen Martin und Nora interne Firmenprofile mit Name, Website,
Ansprechperson, E-Mail und Notizen. Ein Profil kann aktiv oder inaktiv sein.
Es ist ausdrücklich **kein Benutzerkonto**: Kunden können sich nicht anmelden und
erhalten keinen Zugriff auf StudioONE, Entwürfe oder Medien.

Kampagnen und neue Content-Serien können einem aktiven Kunden zugeordnet werden.
Bei einem Serienbriefing werden nur Kampagnen desselben Kunden angeboten; der
Server prüft diese Zuordnung erneut. Ohne Kunde bleiben interne Kampagnen und
Serien möglich. Bereits bestehende Datensätze behalten ihre leere Zuordnung.
Der bestehende Studiojeker-Workspace samt Markenprofil bleibt erhalten; ein
Kundenprofil übernimmt das Studiojeker-Branding nicht automatisch und führt
keine Kundendaten an externe Dienste über.

## Bereitstellung

Vor dem Render-Deploy Datenbankbackup erstellen und die additive Migration
`20261018160000_internal_customers` mit `prisma migrate deploy` ausführen.
Keinen Reset und keine automatische Zuordnung bestehender Kontakte vornehmen.
Nach dem Deploy ein internes Testprofil anlegen, Kampagne und Serie zuordnen,
Bearbeitung und Inaktivsetzung prüfen. Kein E-Mail-Versand wird ausgelöst.

Bestehende Akquise-Kontakte sind personenbezogene Leads und werden vorerst nicht
automatisch mit Kundenprofilen verknüpft. Künftige Erweiterungen können eigene
Kundenmarkenprofile, Medienfreigaben und Mandatsübersichten ergänzen.
