# Newsletter im GPT-Dialog bearbeiten

Im Newsletter-Bereich eine gespeicherte Ausgabe oder Vorlage öffnen. Vorschau
(Desktop/Mobil) und GPT-Dialog stehen direkt im Editor. Der Dialog erhält bei
jeder Nachricht die aktuelle gespeicherte Newsletter-Version und die erlaubten
Vorlagenfelder. Änderungen werden automatisch als neue Entwurfsversion gespeichert.
Texte, Bildadressen, Bildbeschreibungen und Ziel-Links sind bearbeitbar. Layout,
Schriften, Logos und Mailchimp-Fusszeile bleiben Bestandteile der Vorlage.

Der Gesprächsverlauf ist dauerhaft über `MarketingContent.studioSeriesId` verknüpft.
Das Öffnen eines Dialogs erzeugt keine Social-Media-Platzhalter. Bestehende
StudioJob-Rollen-, Budget-, Einmalstart- und Kostenkontrollen werden wiederverwendet.
Die Ausgabe wird als JSON-Patch validiert; unbekannte/doppelte Felder und unsichere
Links werden verworfen. Der Server prüft vor Übernahme die ursprüngliche
Inhaltsversion und speichert Änderung und Auftragsstatus gemeinsam. Wiederholte
Übernahme erzeugt keine zweite Version. Eine neue Version invalidiert Freigaben.
Es findet kein Mailversand und keine Mailchimp-Übertragung statt.

Nach einer Änderung kann in derselben Editorsitzung der vorige Entwurf über
«Letzte Änderung rückgängig» als neue Version gespeichert werden. Alle älteren
Versionen bleiben erhalten. Nach einer Unterbrechung zeigt «Status aktualisieren»
den Auftrag; erfolgreiche, noch nicht gespeicherte Antworten können über
«Änderung übernehmen» übernommen werden. Unsichere Anbieterfehler werden nicht
automatisch wiederholt.

Bildwahl über die bestehende manuelle Bildauswahl oder eine bekannte öffentliche
HTTPS-Adresse. GPT hat hier keine autonome Suche in Drive und keine ausführenden
Bildwerkzeuge. Eine API-Anbindung ist für den Dialog erforderlich. Ohne Verbindung
bleiben Vorschau und manuelle Bearbeitung verfügbar.

Validierung: Unit-Tests für begrenzte Patches/Links, Integrationstests für dauerhafte
Zuordnung, wiederholte Übernahme und Versionskonflikte, bestehender Browserablauf
für Vorschau, manuelle Änderungen, Responsive-Verhalten und Freigabe.
