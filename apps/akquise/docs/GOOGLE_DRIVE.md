# Google Drive in StudioONE

Die Bibliothek verbindet pro StudioONE-Benutzer ein eigenes Google-Konto. Nach der Anmeldung wird ein Ordnerlink oder eine Ordner-ID eingetragen. StudioONE zeigt bis zu 50 Einträge pro Seite an. Im Content-Studio können Benutzer Unterordner öffnen und einzelne Bilder als GPT-Referenz auswählen. Es gibt keine automatische Durchsuchung, keine Schreibzugriffe und keinen Import in die Bibliothek.

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

Der Scope `https://www.googleapis.com/auth/drive.readonly` erlaubt Google-seitig Lesezugriff auf das gesamte Drive. Die Anwendung erlaubt nur den ausgewählten Ordner und dessen Unterordner. Die Elternkette wird bei jeder Auswahl und vor sowie nach dem Bilddownload geprüft (maximal 32 Ebenen); Verknüpfungen werden nicht verfolgt. Diese Einschränkung ist eine Anwendungsregel, keine Google-Berechtigungsgrenze. Für öffentlich angebotene Anwendungen kann Google eine Verifizierung verlangen. Im externen Testmodus können Refresh-Tokens nach sieben Tagen ablaufen; dann erneut verbinden. ChatGPTs bestehende Drive-Verbindung wird nicht übernommen.

## Schutz und Grenzen

Refresh-Tokens sind mit AES-256-GCM verschlüsselt und an die StudioONE-Benutzer-ID gebunden. OAuth verwendet PKCE und einen einmaligen, zehn Minuten gültigen Zustand, gebunden an Browser und ursprüngliche aktive Sitzung. Die normale Strict-Sitzungscookie bleibt unverändert. Statusantworten enthalten keine Tokens.

„Verbindung trennen“ entfernt lokale Tokens und ausstehende Anmeldungen. Die Google-Freigabe kann zusätzlich im Google-Konto widerrufen werden. Ein Wechsel des Verschlüsselungsschlüssels erfordert erneute Verbindungen.

## Bilder im GPT-Chat

Im Content-Studio → Mit GPT entwickeln → Bilder aus Google Drive wählen den gewünschten Unterordner öffnen. Maximal vier Bilder insgesamt aus Drive und privater Bibliothek auswählen. Unterstützt: herunterladbare JPEG-, PNG- und WebP-Einzelbilder bis 8 MB und 20 Megapixel. Ausgewählte Drive-Bilder erhalten eine Vorschau; andere Bildinhalte werden nicht geladen. Danach Nachricht schreiben, Nutzungsrechte/Übermittlung an OpenAI bestätigen und senden. Jede Änderung der Bildauswahl setzt die Bestätigung zurück. Die Auswahl bleibt im Gespräch für weitere Nachrichten erhalten, beim Gesprächswechsel wird sie geleert.

Dafür ist kein S3-Speicher erforderlich und der vorhandene readonly-Scope genügt. StudioONE lädt nur die ausgewählten Bilder, prüft Grösse, tatsächliches Bildformat, Prüfsumme und Version, entfernt Metadaten und begrenzt die Kantenlänge auf 2048 Pixel (Vorschau: 512). Die Originale bleiben unverändert. Temporäre Bilddaten werden nur im Arbeitsspeicher verarbeitet; keine Bildbytes oder Google-Tokens werden im Chat gespeichert. Aufträge enthalten IDs, Dateinamen, Prüfsummen, Versionen und die Versionsbindung der Verbindung. OpenAI erhält die Bildbytes mit der aktuellen Nachricht, keine Google-Zugangsdaten oder Drive-Links. Historische Gesprächsrunden werden nur als Text übermittelt.

Nur der Benutzer, der den Auftrag angelegt hat, darf einen Auftrag mit eigenen Drive-Bildern starten. Vor dem Start werden Verbindung, gewählter Ordner, Dateiversion und Downloadfreigabe erneut geprüft. Trennen, Ordnerwechsel, geänderte oder verschobene Dateien verhindern die Übermittlung. Fehler vor einem Anbieteraufruf markieren den Auftrag als fehlgeschlagen; es gibt keine automatische Wiederholung. Ein bereits angelegter Auftrag bleibt bei Wiederholung desselben Auftragsschlüssels identisch.

Medienimport, Speichern generierter Inhalte in Drive und Higgsfield-Ausführung sind nicht implementiert. Die private S3-Bildablage für Uploads und generierte Medien bleibt separat.

## Prüfung nach Einrichtung

Anmelden, Ordner wählen, Liste laden und nächste Seite prüfen. Mit zweitem StudioONE-Benutzer sicherstellen, dass dessen Verbindung separat bleibt. Trennen und erneutes Verbinden prüfen. Google-Freigabe widerrufen und verständliche Fehleranzeige prüfen. Auf dem iPad Ordnerlink aus Drive kopieren und in StudioONE einfügen.

Zusätzlich im Content-Studio einen Unterordner öffnen, ein Bild auswählen, Vorschau und Übermittlungsbestätigung prüfen. Ohne privaten Bildspeicher einen Chat mit Bild ausführen. Vor Start eines wartenden Auftrags Drive trennen oder das Bild verschieben: Die Übermittlung muss stoppen.

Offizielle Referenz: https://developers.google.com/identity/protocols/oauth2/web-server

Drive-Download: https://developers.google.com/workspace/drive/api/guides/manage-downloads
