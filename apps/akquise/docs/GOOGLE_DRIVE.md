# Google Drive in StudioONE

Die Bibliothek verbindet pro StudioONE-Benutzer ein eigenes Google-Konto. Nach der Anmeldung wird ein Ordnerlink oder eine Ordner-ID eingetragen. StudioONE zeigt bis zu 50 direkte Einträge pro Seite an. Es gibt keine automatische Durchsuchung anderer Ordner, keinen Download, keine Übermittlung an KI und keine Schreibzugriffe.

## Einrichtung

1. Im eigenen Google-Cloud-Projekt die Google Drive API aktivieren.
2. OAuth-Zustimmungsbildschirm konfigurieren. Im Testmodus die verwendeten Google-Konten als Testnutzer hinzufügen.
3. OAuth-Client vom Typ Webanwendung anlegen. Autorisierte Weiterleitungs-URI exakt:
   `https://studiojeker-akquise.onrender.com/api/drive/callback`
4. Beim Render-Webservice diese Variablen hinterlegen:
   - `DRIVE_CLIENT_ID`: Google OAuth Client-ID
   - `DRIVE_CLIENT_SECRET`: Google OAuth Client-Secret
   - `DRIVE_TOKEN_ENCRYPTION_KEY`: zufälliger Schlüssel, 64 Hex-Zeichen
5. Den Verschlüsselungsschlüssel lokal mit `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` erzeugen. Geheimnisse ausschliesslich in Render hinterlegen, nicht in Git oder Chat.
6. `APP_URL` muss die HTTPS-Origin des Webservice enthalten. Migrationen mit `npm run db:migrate` vor dem Start anwenden. Danach deployen und in Bibliothek → Google Drive verbinden anmelden.

Der Scope `https://www.googleapis.com/auth/drive.readonly` erlaubt Google-seitig Lesezugriff auf das gesamte Drive. Die Anwendung fragt nur den ausgewählten Ordner und dessen direkte Einträge ab. Diese Einschränkung ist eine Anwendungsregel, keine Google-Berechtigungsgrenze. Für öffentlich angebotene Anwendungen kann Google eine Verifizierung verlangen. Im externen Testmodus können Refresh-Tokens nach sieben Tagen ablaufen; dann erneut verbinden. ChatGPTs bestehende Drive-Verbindung wird nicht übernommen.

## Schutz und Grenzen

Refresh-Tokens sind mit AES-256-GCM verschlüsselt und an die StudioONE-Benutzer-ID gebunden. OAuth verwendet PKCE und einen einmaligen, zehn Minuten gültigen Zustand, gebunden an Browser und ursprüngliche aktive Sitzung. Die normale Strict-Sitzungscookie bleibt unverändert. Statusantworten enthalten keine Tokens.

„Verbindung trennen“ entfernt lokale Tokens und ausstehende Anmeldungen. Die Google-Freigabe kann zusätzlich im Google-Konto widerrufen werden. Ein Wechsel des Verschlüsselungsschlüssels erfordert erneute Verbindungen.

Diese Ausbaustufe zeigt Dateien und öffnet sie in Drive. Direkte Verwendung von Drive-Bildern im GPT-Chat, Medienimport, Speichern generierter Inhalte und Higgsfield-Ausführung sind hier nicht implementiert. Die bestehende private S3-Bildablage bleibt separat.

## Prüfung nach Einrichtung

Anmelden, Ordner wählen, Liste laden und nächste Seite prüfen. Mit zweitem StudioONE-Benutzer sicherstellen, dass dessen Verbindung separat bleibt. Trennen und erneutes Verbinden prüfen. Google-Freigabe widerrufen und verständliche Fehleranzeige prüfen. Auf dem iPad Ordnerlink aus Drive kopieren und in StudioONE einfügen.

Offizielle Referenz: https://developers.google.com/identity/protocols/oauth2/web-server
