# Social-Media-Konten in StudioONE

## Einrichtung

In Render für StudioONE als geheime Umgebungsvariablen setzen:

- `SOCIAL_TOKEN_ENCRYPTION_KEY`: 32 zufällige Bytes als 64 Hexzeichen, getrennt vom Drive-Schlüssel. Den Schlüssel sicher aufbewahren; ein Wechsel erfordert neue Kontoverbindungen.
- `META_CLIENT_ID`, `META_CLIENT_SECRET`: eigene Meta-Entwickler-App mit Facebook Login und Berechtigungen `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`: eigene LinkedIn-Entwickler-App mit `openid`, `profile`, `r_organization_admin` und genehmigtem `w_organization_social`-Zugriff.
- `LINKEDIN_API_VERSION`: unterstützte Version der Community-Management-API; Standard `202610` (Oktober 2026). Vor Ablauf der Anbieterunterstützung aktualisieren.
- `APP_URL`: vorhandener HTTPS-Origin der produktiven StudioONE-Instanz.

Exakte OAuth-Redirect-URLs in den Anbieter-Apps registrieren:

- `${APP_URL}/api/social/meta/callback`
- `${APP_URL}/api/social/linkedin/callback`

In Facebook muss die verbindende Person die Aufgabe `CREATE_CONTENT` für die Studiojeker-Seite haben. Für Instagram muss ein professionelles Instagram-Konto mit dieser Facebook-Seite verknüpft sein. Nur Seiten mit `studiojeker` im Namen werden übernommen. Die Anbieter-Apps benötigen die angefragten Rechte und gegebenenfalls App Review. Die LinkedIn-Entwickler-App braucht Zugang zur Community-Management-API für Unternehmensbeiträge.

Nach der Konfiguration StudioONE neu deployen. Unter **Social Media** oder **Einstellungen** die jeweilige Anmeldung starten. Danach die angezeigten Konten prüfen. Instagram erscheint nur mit passender professioneller Verknüpfung und erteilten Instagram-Rechten.

### Einrichtung ohne Passwortweitergabe

1. In StudioONE unter **Social Media → Social-Media-Konten → Einrichtungsdetails** prüfen, welche Variablen vorhanden sind. Die Anzeige enthält nur Statuswerte und Rücksprungadressen, keine Schlüssel. «Vorhanden» bestätigt nicht die Anbieterfreigabe oder die Gültigkeit des Schlüssels.
2. Die Entwickler-Apps bei Meta und LinkedIn mit den oben genannten Rechten einrichten. App-Secrets ausschliesslich in Render speichern. Kontopasswörter, Google-Logins und die Render-Anmeldung sind keine Social-App-Schlüssel.
3. Die angezeigten Rücksprungadressen exakt registrieren. Für die produktive Instanz sind dies `https://studiojeker-akquise.onrender.com/api/social/meta/callback` und `https://studiojeker-akquise.onrender.com/api/social/linkedin/callback`.
4. Im eigenen Browser bei StudioONE anmelden und **Facebook & Instagram verbinden** beziehungsweise **LinkedIn verbinden** wählen. Die Freigabe findet direkt beim jeweiligen Anbieter statt.
5. Nach LinkedIn-Anmeldung **Unternehmensseite auswählen** und **Diese Unternehmensseite verbinden** wählen. StudioONE lädt die eigenen genehmigten Seitenrollen erneut und übernimmt ausschliesslich die offizielle Seite mit Vanity-Namen `studiojeker`. Rollen `ADMINISTRATOR` und `CONTENT_ADMINISTRATOR` sind zulässig; Analysten, ausstehende Rollen und reine Anzeigenrechte nicht.
6. Der Status muss den Namen der Unternehmensseite anzeigen. Bei fehlenden API-Rechten zuerst die App freischalten und anschliessend erneut verbinden. Alte persönliche Profilverbindungen bleiben als «Unternehmensseite noch auswählen» erkennbar.

Ein vorhandener `SOCIAL_TOKEN_ENCRYPTION_KEY` darf bei der Einrichtung nicht überschrieben werden. In der isolierten Testpersonen-Instanz bleiben externe Kontoverbindungen deaktiviert.

## Umfang und Grenzen

Zugangsdaten werden serverseitig verschlüsselt gespeichert. Der OAuth-Rücksprung ist an eine aktive StudioONE-Sitzung gebunden und nur einmal gültig. Das Trennen löscht die lokale Verbindung; die Freigabe beim Anbieter kann separat widerrufen werden.

LinkedIn speichert zunächst die persönliche Anmeldung. Erst die explizite Auswahl verbindet die überprüfte Studiojeker-Unternehmensseite. Der Zugriff ist an die verbindende StudioONE-Person gebunden, und die Auswahl prüft die Rollen erneut serverseitig. Die Organisations-URN wird als `accountId` gespeichert; vorhandene Mitglieds-IDs bleiben kompatibel. Es ist keine neue Datenbankmigration nötig.

Die bestehenden redaktionellen Freigaben und manuellen Veröffentlichungsnachweise bleiben unverändert. Diese Änderung sendet keine Beiträge und plant keine Beiträge beim Anbieter. «Verbunden» bestätigt die Kontoverknüpfung, keinen erfolgreichen Publikationstest. Für das spätere Publizieren müssen Medienformat, aktuelle Rechte, freigegebene Inhaltsversion und Remote-Beleg separat geprüft werden.

Referenzen (geprüft 01.11.2026):

- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api
- https://learn.microsoft.com/en-us/linkedin/marketing/versioning

Die Migration `20261018100000_social_connections` ist additiv. Vor `prisma migrate deploy` in Produktion ein Backup erstellen. Ohne die Variablen bleiben die Verbindungs-Schaltflächen deaktiviert.
