# Social-Media-Konten in StudioONE

## Einrichtung

In Render für StudioONE als geheime Umgebungsvariablen setzen:

- `SOCIAL_TOKEN_ENCRYPTION_KEY`: 32 zufällige Bytes als 64 Hexzeichen, getrennt vom Drive-Schlüssel. Den Schlüssel sicher aufbewahren; ein Wechsel erfordert neue Kontoverbindungen.
- `META_CLIENT_ID`, `META_CLIENT_SECRET`: eigene Meta-Entwickler-App mit Facebook Login und Berechtigungen `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`: eigene LinkedIn-Entwickler-App mit `openid`, `profile` und genehmigtem `w_organization_social`-Zugriff.
- `APP_URL`: vorhandener HTTPS-Origin der produktiven StudioONE-Instanz.

Exakte OAuth-Redirect-URLs in den Anbieter-Apps registrieren:

- `${APP_URL}/api/social/meta/callback`
- `${APP_URL}/api/social/linkedin/callback`

In Facebook muss die verbindende Person die Aufgabe `CREATE_CONTENT` für die Studiojeker-Seite haben. Für Instagram muss ein professionelles Instagram-Konto mit dieser Facebook-Seite verknüpft sein. Nur Seiten mit `studiojeker` im Namen werden übernommen. Die Anbieter-Apps benötigen die angefragten Rechte und gegebenenfalls App Review. Die LinkedIn-Entwickler-App braucht Zugang zur Community-Management-API für Unternehmensbeiträge.

Nach der Konfiguration StudioONE neu deployen. Unter **Social Media** oder **Einstellungen** die jeweilige Anmeldung starten. Danach die angezeigten Konten prüfen. Instagram erscheint nur mit passender professioneller Verknüpfung und erteilten Instagram-Rechten.

## Umfang und Grenzen

Zugangsdaten werden serverseitig verschlüsselt gespeichert. Der OAuth-Rücksprung ist an eine aktive StudioONE-Sitzung gebunden und nur einmal gültig. Das Trennen löscht die lokale Verbindung; die Freigabe beim Anbieter kann separat widerrufen werden.

LinkedIn verknüpft in dieser Phase das authentifizierte Mitglied. Die konkrete Unternehmensseite ist noch nicht ausgewählt oder als publizierbar bestätigt. Die bestehenden redaktionellen Freigaben und manuellen Veröffentlichungsnachweise bleiben unverändert. Diese Änderung sendet keine Beiträge und plant keine Beiträge beim Anbieter. Für das spätere Publizieren müssen Unternehmensseite, Medienformat, aktuelle Rechte, freigegebene Inhaltsversion und Remote-Beleg separat geprüft werden.

Die Migration `20261018100000_social_connections` ist additiv. Vor `prisma migrate deploy` in Produktion ein Backup erstellen. Ohne die Variablen bleiben die Verbindungs-Schaltflächen deaktiviert.
