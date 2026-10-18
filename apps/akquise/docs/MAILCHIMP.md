# Mailchimp in StudioONE

## Einrichtung auf Render

1. In Mailchimp unter **Account → Extras → API keys** einen separaten API-Key für StudioONE erstellen. Den vollständigen Key nur in Render als geheime Umgebungsvariable `MAILCHIMP_API_KEY` setzen. Er endet mit dem Rechenzentrum, z. B. `-us21`. Nicht in Git, Chat oder eine `NEXT_PUBLIC_`-Variable kopieren.
2. Die neue Prisma-Migration `20261018130000_mailchimp_transfer` beim Deployment ausführen. Die bestehende Render-Vorlage führt Migrationen im Pre-Deploy-Schritt aus. Danach den Service neu starten.
3. In StudioONE unter **Einstellungen** prüfen, ob die Audiences angezeigt werden. Ein Key allein belegt noch keine erfolgreiche Verbindung; der Status wird durch die echte Listenabfrage geprüft.

## Benutzung

Im Newsletter-Bereich eine Version speichern, prüfen und freigeben. Audience auswählen und **Entwurf an Mailchimp übertragen** drücken. StudioONE erstellt eine reguläre Kampagne mit Betreff, Preheader, Absender aus den Audience-Standardeinstellungen sowie HTML- und Textinhalt. Die Audience ist zugeordnet, ein Segment wird nicht vorausgewählt. Kontakte und Einwilligungen werden nicht aus StudioONE synchronisiert.

Eine freigegebene Version kann nur einmal übertragen werden. Der Nachweis enthält Version, Inhalts-Hash, Audience, Nutzer und Mailchimp-ID. Im Mailchimp-Account Empfänger, Absender, Bilder, Links, Abmeldetags und Testsendung prüfen. Der Versand wird ausschliesslich dort manuell ausgelöst. Der bestehende HTML-/Text-Download bleibt verfügbar.

Wenn ein Netzwerkfehler während der Übertragung auftritt, steht der Nachweis auf `UNKNOWN`. Die Mailchimp-Kampagnen zunächst nach dem Titel `StudioONE V…` und der gespeicherten Kampagnen-ID durchsuchen. Die App blockiert eine automatische Wiederholung, da ein abgebrochener API-Aufruf remote erfolgreich gewesen sein kann. Eine neue Inhaltsversion kann nach bewusster Prüfung separat übertragen werden.

Die Mailchimp-Verbindung nutzt einen serverseitigen Key für das Studiojeker-Konto. Schlüsselrotation und Widerruf erfolgen in Mailchimp und Render; StudioONE zeigt oder speichert den Schlüssel nicht in der Datenbank. Ohne Key bleibt die manuelle Exportfunktion erhalten.
