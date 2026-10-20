# Direkte Bildbearbeitung im Content-Studio

Im GPT-Dialog «Bild bearbeiten · direkt ausführen» wählen, genau ein Ausgangsbild auswählen und die Änderung beschreiben. Bilder kommen direkt vom Computer/iPad/Smartphone, aus der StudioONE-Bibliothek oder aus Google Drive. Gerätebilder werden privat hochgeladen und automatisch ausgewählt. Unterstützt: JPEG, PNG, WebP bis 8 MB und 20 Megapixel. HEIC vorher als JPEG exportieren.

Nach bewusster Kosten-/Übermittlungsbestätigung führt «Bild jetzt bearbeiten» die Anweisung über den bestehenden OpenAI-Bilddienst aus. Es wird kein vorbereitender Textauftrag benötigt. Nur das gewählte Bild und die aktuelle Anweisung gehen an die Bildbearbeitung; vorherige Chatnachrichten sind kein impliziter Bearbeitungskontext. Das bestehende `CONTENT_IMAGE_MODEL` bleibt unverändert. Der Images-Edits-Endpunkt verwendet automatische Ausgabegrösse; bei gpt-image-1/1.5 wird hohe Eingabetreue angefragt. Ausgabeauflösung und Seitenverhältnis können sich trotzdem ändern. Generative Ergebnisse sind auf Motiv-/Personendetails zu prüfen.

Original und Ergebnis werden nebeneinander gezeigt. Das Ergebnis wird als separate Bibliotheksdatei gespeichert, Drive-Originale zusätzlich als private Vergleichskopie. «Als neue Version übernehmen» ordnet es dem Zielbeitrag zu und entwertet die alte Freigabe. Zwischenzeitlich geänderte Beiträge werden nicht überschrieben. Download und weitere Bearbeitung des Ergebnisses sind möglich. Bei Serien mit mehreren Beiträgen ist der Zielbeitrag auswählbar.

Bestehende Budgetreservierungen, Rechteprüfung, Organisationsgrenzen, Auftragsstatus und Wiederholungsverbot gelten auch hier. Ein Timeout/unklarer Anbieterstatus wird nicht automatisch neu gestartet. Die Bibliotheksdatei ist nach Browser-Neuladen verfügbar; ein laufender Auftrag kann über den Status erneut angezeigt werden. Keine neuen Pakete oder Datenbankmigration. Kein kostenpflichtiger Live-Aufruf während der automatisierten Tests.

API-Referenz: https://developers.openai.com/api/reference/resources/images/methods/edit
