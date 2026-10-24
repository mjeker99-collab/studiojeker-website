# Strategie & Konzepte

StudioONE erhält einen internen Bereich zur Entwicklung von Kommunikations- und Marketingkonzepten für Studiojeker und interne Kundenprofile. Es gibt keine neuen Kundenlogins. Der Bereich nutzt bestehende Konten, Rollen und OpenAI-Konfiguration.

## Ablauf

1. «Strategie & Konzepte» öffnen, Titel und Kunde festlegen. Optional eine bestehende Kampagne als Projektkontext wählen. Speichern. Die Kundenzuordnung bleibt nach dem ersten Speichern fest, damit Gesprächsinhalte nicht in ein anderes Kundenprojekt gelangen.
2. Im GPT-Gespräch die Übermittlung bestätigen und das Briefing entwickeln. Der Dialog erhält das aktuelle gespeicherte Dokument, Kundenname, Website, Notizen, optionalen Kampagnenkontext und maximal zwölf erfolgreiche Gesprächsrunden. Keine Webrecherche und keine Mediengenerierung.
3. Antworten bewusst in ein ausgewähltes Kapitel übernehmen oder Text selbst bearbeiten. Jede Speicherung erzeugt eine neue unveränderliche Inhaltsversion. Ungespeicherte Änderungen werden nicht an GPT gesendet. Fehlgeschlagene oder unklare KI-Aufträge werden nicht automatisch wiederholt.
4. Vollständiges Konzept prüfen und die exakte Version freigeben. Neue Änderungen erfordern eine neue Freigabe. Der Verlauf zeigt frühere Texte, Autor und Freigabe.
5. Word exportiert eine echte DOCX-Datei. Die PDF-Druckansicht enthält den gespeicherten Stand; im Browser «Als PDF speichern» verwenden. Exporte weisen Version und Entwurf/Freigabe aus.
6. Eine freigegebene Version mit Start-/Enddatum als neue Kampagne übernehmen. Wiederholung derselben Übergabe liefert dieselbe Kampagne. Ein Link in der Kampagnenkarte öffnet das vollständige Konzeptbriefing. GPT erhält diese freigegebene Version in neuen Text- und Chat-Aufträgen der zugeordneten Content-Serien. Spätere Konzeptänderungen verändern das übernommene Briefing nicht. Bei Wechsel des Kampagnenkunden wird der alte Konzeptkontext nicht übertragen.

## Daten und Betrieb

Additive Migration `20261019160000_strategy_concepts`: `StrategyConcept` und `StrategyVersion`, verknüpft mit einer bestehenden `StudioSeries` als Gesprächscontainer. Konzeptserien erzeugen keine Social-Entwürfe und erscheinen nicht im Content-Studio. Historische Versionen und Übergaben bleiben erhalten. Bearbeitungen nutzen Versionsprüfung und Transaktionslocks. Rollen-/Organisationsprüfungen und Origin-Prüfung erfolgen serverseitig. KI-Aufträge laufen durch die vorhandene Budget-, Tageslimit- und Einmalstart-Pipeline.

Vor Bereitstellung wie bei bisherigen Migrationen Datenbank sichern und `prisma migrate deploy` ausführen. Keine neuen Secrets oder Pakete. Kein automatischer Merge, kein Produktionsdeploy, kein Versand.

## Prüfung

Lokal: TypeScript, ESLint, Unit-/Provider-/Exporttests und Produktionsbuild. Neue PostgreSQL-Tests prüfen Versionierung, konkurrierende Bearbeitungen, Freigabe, Zuordnung, idempotente Übergabe, Snapshot-Erhalt und den gespeicherten GPT-Dialog mit simuliertem Provider. Der neue Browsertest prüft Speichern/Neuladen, Freigabe, DOCX/PDF-Druckansicht, Übergabe, vier Bildschirmbreiten und axe.

PostgreSQL-Start ist in dieser Arbeitsumgebung nicht möglich (Benutzerwechsel wird vom Betriebssystem abgelehnt). Datenbank- und echte Browserabläufe müssen deshalb in der bestehenden GitHub-CI laufen. Es wurde keine kostenpflichtige OpenAI-Anfrage ausgelöst. Ein Praxistest mit der produktiven Verbindung bleibt nach dem Deployment erforderlich.

## Grenzen dieser ersten Ausbaustufe

Kapitel werden als frei bearbeitbarer Text gespeichert (bis 4000 Zeichen pro Kapitel). Übernahmen aus dem Dialog erfolgen bewusst pro Kapitel. Die Übergabe erstellt eine Kampagne mit Konzeptbriefing, noch keine automatisch ausgefüllten Newsletter, Redaktionskalender oder Präsentationen. PDF erfolgt über die Browser-Druckfunktion. Externe Recherchen und Dokument-/Bildanhänge gehören nicht zum Konzeptdialog.
