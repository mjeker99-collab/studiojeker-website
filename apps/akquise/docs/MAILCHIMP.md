# Mailchimp in StudioONE

## Einrichtung auf Render

1. In Mailchimp unter **Account → Extras → API keys** einen separaten API-Key für StudioONE erstellen. Den vollständigen Key nur in Render als geheime Umgebungsvariable `MAILCHIMP_API_KEY` setzen. Er endet mit dem Rechenzentrum, für dieses Konto `-us17`. Nicht in Git, Chat oder eine `NEXT_PUBLIC_`-Variable kopieren.
2. Die neue Prisma-Migration `20261018130000_mailchimp_transfer` beim Deployment ausführen. Die bestehende Render-Vorlage führt Migrationen im Pre-Deploy-Schritt aus. Danach den Service neu starten.
3. In StudioONE unter **Einstellungen** prüfen, ob die Audiences angezeigt werden. Ein Key allein belegt noch keine erfolgreiche Verbindung; der Status wird durch die echte Listenabfrage geprüft.

## Benutzung

Im Newsletter-Bereich eine Version speichern, prüfen und freigeben. Audience auswählen und **Entwurf an Mailchimp übertragen** drücken. StudioONE erstellt eine reguläre Kampagne mit Betreff, Preheader, Absender aus den Audience-Standardeinstellungen sowie HTML- und Textinhalt. Die Audience ist zugeordnet, ein Segment wird nicht vorausgewählt. Kontakte und Einwilligungen werden nicht aus StudioONE synchronisiert.

Eine freigegebene Version kann nur einmal übertragen werden. Der Nachweis enthält Version, Inhalts-Hash, Audience, Nutzer und Mailchimp-ID. Im Mailchimp-Account Empfänger, Absender, Bilder, Links, Abmeldetags und Testsendung prüfen. Der Versand wird ausschliesslich dort manuell ausgelöst. Der bestehende HTML-/Text-Download bleibt verfügbar.

Wenn ein Netzwerkfehler während der Übertragung auftritt, steht der Nachweis auf `UNKNOWN`. Die Mailchimp-Kampagnen zunächst nach dem Titel `StudioONE V…` und der gespeicherten Kampagnen-ID durchsuchen. Die App blockiert eine automatische Wiederholung, da ein abgebrochener API-Aufruf remote erfolgreich gewesen sein kann. Eine neue Inhaltsversion kann nach bewusster Prüfung separat übertragen werden.

Die Mailchimp-Verbindung nutzt einen serverseitigen Key für das Studiojeker-Konto. Schlüsselrotation und Widerruf erfolgen in Mailchimp und Render; StudioONE zeigt oder speichert den Schlüssel nicht in der Datenbank. Ohne Key bleibt die manuelle Exportfunktion erhalten.

## Read-only Prüfung

StudioONE liest Kontakte nur mit GET. Der Serverpräfix ist das Rechenzentrum am Ende von `MAILCHIMP_API_KEY`. Für dieses Konto ist das `us17`, der Host also `https://us17.api.mailchimp.com/3.0/`. `MAILCHIMP_SERVER_PREFIX` ist optional. Gesetzt muss der Wert exakt `us17` sein und mit dem Key-Suffix übereinstimmen. Ein abweichender Präfix blockiert die Abfrage. Den Key nie in diese Variable, in Git oder in eine `NEXT_PUBLIC_`-Variable schreiben.

Unter **Einstellungen** steht die Aktion **Mailchimp-Kontakte prüfen**. Sie zeigt nur Zählwerte: Audiences, abonniert, bereits vorhanden, noch nicht übernommen, abgemeldet, bereinigt, ausstehend, ausgeschlossen, Dubletten und fehlerhafte Einträge. Es gibt kein Eingabefeld für Key oder Server. Abgemeldete, bereinigte und ausstehende Adressen zählen als ausgeschlossen. Dieselbe normalisierte Adresse oder dieselbe Person bei derselben Firma zählt als bereits vorhanden, auch wenn sie nur in Kontakten, Kunden, Sperrliste, Mailentwürfen oder einer eindeutig beschrifteten Vorbereitungsnotiz steht. Nichts davon wird in die Masterliste geschrieben. `imported` bleibt 0.

Die angemeldete Diagnose `GET /api/hub/mailchimp/diagnosis` liefert ausschliesslich `configured`, `reachable`, `audienceCount` und `errorClass`. `GET /api/hub/mailchimp/contacts` liefert dieselben Felder plus Zählwerte und die festen Angaben `imported: 0`, `persisted: false`, `sent: false`. Beide Antworten dürfen keinen Key, keine Autorisierung und keine Kontaktdaten enthalten.

### Sichere Live-Prüfung nach separater Freigabe

Diese Schritte sind erst nach Merge und Deploy sinnvoll. In diesem Branch wurden sie nicht gegen Render oder Mailchimp ausgeführt.

1. In Render nur prüfen, dass der Variablenname `MAILCHIMP_API_KEY` existiert. Den Wert nicht öffnen, kopieren oder protokollieren. `MAILCHIMP_SERVER_PREFIX` leer lassen oder auf `us17` setzen.
2. In StudioONE anmelden, **Einstellungen** öffnen und **Mailchimp-Kontakte prüfen** wählen.
3. Die Meldung muss Zählwerte nennen und ausdrücklich sagen, dass nichts gespeichert und nichts versendet wurde.
4. Alternativ im Browser, in derselben angemeldeten Sitzung, `https://studiojeker-akquise.onrender.com/api/hub/mailchimp/diagnosis` öffnen. Die JSON-Antwort darf nur die vier Diagnosefelder enthalten. `audienceCount` ist die Anzahl Audiences, nicht eine Kontaktliste.
5. Die Antwort und die Serverlogs auf den Key, `Basic`, E-Mail-Adressen und `email_address` prüfen. Nichts davon darf erscheinen.
6. Keine Masterliste, keinen Google-Sheet-Tab und keinen Versand als Teil dieser Prüfung verändern.

Ohne angemeldete Sitzung antwortet StudioONE mit 401. Ein erfolgreicher HTTP-Code allein beweist nicht, dass Kontakte übernommen wurden; `persisted` muss `false` bleiben.

## GPT-Lesezugriff

ChatGPT liest Audiences, Statuszählwerte und Kampagnen über den bestehenden Read-Bearer und den Schalter `mailchimp`. Der Schalter ist standardmässig aus. Der Server verwendet `MAILCHIMP_API_KEY` nur mit GET. Die Antwort ist ein Live-Stand mit Zeitpunkt, Quelle `mailchimp`, Fehler, Paging und bereinigten Feldern. Kontakte werden nicht zurückgegeben, nichts wird gespeichert oder versendet.

Der bisherige Connector-Katalog ist das OpenAPI-Dokument. ChatGPT sieht `readMailchimp` erst nach erneutem Import. Ein app-gestützter MCP-Katalog existierte nicht. `POST /api/integrations/gpt/mcp` stellt das Werkzeug `read_mailchimp` bereit und verlangt die Anmeldung auch für `initialize` und `tools/list`. Tokens in der URL werden abgelehnt. Die konkrete Einrichtung steht in `CHATGPT_CONNECTOR.md`. Dieser Branch ist nicht gemergt und nicht deployt. Eine Live-Abfrage gegen das echte Mailchimp-Konto ist damit nicht ausgeführt.
