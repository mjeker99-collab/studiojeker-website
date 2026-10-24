# Metanet SMTP in StudioONE auf Render

StudioONE nutzt `jovinus.metanet.ch` für individuell freigegebene
Akquise-E-Mails von `Nora Jeker <njeker@studiojeker.ch>`. Newsletter-Kampagnen
bleiben bei Mailchimp. Ein SMTP-Konto allein aktiviert keinen Versand.

## Einrichtung

1. Bei Metanet für das Postfach `njeker@studiojeker.ch` den Submission-Port,
   TLS-Modus und SMTP-Anmeldung bestätigen. `465` mit implizitem TLS
   (`SMTP_SECURE=true`) und `587` mit verpflichtendem STARTTLS
   (`SMTP_SECURE=false`) sind übliche Kombinationen, aber für dieses Konto
   noch zu bestätigen. Gegebenenfalls SMTP-Egress von Render prüfen.
2. Im **Render Web Service `studiojeker-akquise` → Environment** das
   Postfachpasswort als geheime Variable `SMTP_PASSWORD` hinterlegen. Niemals
   in Git, Chat oder `NEXT_PUBLIC_*` kopieren. `SMTP_HOST`, `SMTP_USER` und
   `MAIL_FROM` sind im Blueprint auf `jovinus.metanet.ch` und
   `njeker@studiojeker.ch` gesetzt. `SMTP_PORT` und `SMTP_SECURE` gemäss
   Metanet ergänzen. `TEST_MAIL_RECIPIENTS` auf exakte interne Adressen setzen,
   etwa `njeker@studiojeker.ch`; keine Wildcards oder fremde Domains.
3. Für den **internen Test** `MAIL_MODE=test`,
   `SMTP_CONFIGURATION_CONFIRMED=true` und `ENABLE_EMAIL_SENDING=true`
   setzen, dann einen manuellen Deploy/Neustart auslösen. Fehlende oder
   widersprüchliche Werte verhindern den Start. Die Blueprint-Defaults
   `disabled/false/false` dürfen bei erneutem Sync nicht unbeabsichtigt
   die manuell gesetzten Service-Werte ersetzen; danach Environment prüfen.
4. In der Render Shell aus dem App-Quellverzeichnis `npm run smtp:verify`
   ausführen. Das prüft TLS und Anmeldung, sendet keine Nachricht und
   verändert keine Versanddatensätze. Erfolg zeigt nur die SMTP-Verbindung,
   nicht Zustellung oder Domain-Authentifizierung.
5. Unter **Einstellungen → Verbindungen & Sicherheit → Interne Testmail** kann
   «Testmail an njeker@studiojeker.ch senden» einen neutralen Zustellungstest
   auslösen. Dafür muss der interne Testmodus aktiv sein und diese Adresse in
   `TEST_MAIL_RECIPIENTS` stehen. Empfänger und Inhalt sind serverseitig festgelegt.
   Es wird kein Akquisekontakt oder Entwurf freigegeben. Das Audit-Protokoll zeigt
   `SMTP_TEST_STARTED`, danach `SMTP_TEST_ACCEPTED` oder `SMTP_TEST_UNCERTAIN`.
   SMTP-Annahme ist noch keine bestätigte Zustellung: Posteingang/Spam prüfen.
   Eine Anfrage wird nicht automatisch wiederholt; höchstens ein neuer Test pro Minute.
6. Für einen anschliessenden Test eines Akquiseentwurfs muss unter **Einstellungen** „Interner SMTP-Testmodus“
   erscheinen. Einen verifizierten Kontakt mit aktueller rechtlicher Prüfung
   und freigegebener Nachrichtenversion auswählen, den Versand ausdrücklich
   bestätigen und ausschliesslich an die feste interne Liste umleiten lassen.
   Im Versandprotokoll `TEST_SENT` und das interne Postfach prüfen. Vor einer
   externen Nachricht auch SPF/DKIM/DMARC und Antwortadresse prüfen.

Produktivmodus erst nach dem internen Test bewusst mit
`MAIL_MODE=production` wählen und erneut deployen. Jeder echte Versand
erfordert weiterhin die Freigabe der exakten Version sowie die separate
Bestätigung. Der SMTP-Transport verwendet TLS 1.2+, Zertifikatsprüfung,
Authentifizierung und bei Port 587 verpflichtendes STARTTLS. Ein unklarer
SMTP-Erfolg wird nicht automatisch wiederholt; Message-ID zuerst in Metanet
abgleichen. Zum Abschalten `MAIL_MODE=disabled`, `ENABLE_EMAIL_SENDING=false`
und `SMTP_CONFIGURATION_CONFIRMED=false` setzen und neu starten.
