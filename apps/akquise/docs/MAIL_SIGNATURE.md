# Nora-Signatur

Freigegebene Angaben vom 20.10.2026: Nora Jeker, ohne Funktion; Studiojeker GmbH, Hauptstrasse 73, CH-4528 Zuchwil; +41 78 601 78 85; njeker@studiojeker.ch; studiojeker.ch; WE CREATE VISIBILITY.

Die beiden unveränderten Originalbilder liegen unter `brand/mail/`. Ihre SHA-256-Prüfsummen sind im Signaturmodul hinterlegt und werden beim Laden geprüft. Die bestehende Next.js-Dateiverfolgung für `brand/**` nimmt sie in das Produktionsartefakt auf.

Für Versand und Vorschau werden die Originale proportional verkleinert: Portrait 160 × 90 Pixel, Logo 180 × 83 Pixel. Dadurch bleiben die intrinsischen Bildmasse klein, auch wenn beim Weiterleiten HTML-Grössen verloren gehen. HTML-Bildattribute, Inline-CSS und eine 240 Pixel breite Signaturtabelle begrenzen zusätzlich die Darstellung. Schriftgrössen stehen direkt auf Zellen und Links; ein HTML-Font-Fallback erhält lesbare Kontaktdaten ohne vererbte Tabellenformatierung. Die Zielmasse sind Bestandteil des Freigabehashs und der Vorschau-Cache-URL.

`signedMessage()` erzeugt HTML und Klartext für Vorschau, SMTP-Test, lokale Simulation und Akquiseversand. Der Versand verwendet eingebettete CID-Bilder, keine externen Bildabrufe. Die Vorschau verwendet dieselben Bilddateien über eine feste Route mit Dateinamen-Allowlist. HTML aus dem Nachrichtentext wird maskiert. Bekannte Nora-Textsignaturen werden ersetzt; zusätzliche Texte und Widerspruchshinweise bleiben erhalten.

Der Freigabehash umfasst Rohtext, gerenderten Text, HTML und Bildprüfsummen. Alte Entwürfe müssen einmal als neue Version gespeichert und erneut freigegeben werden. Keine automatische Aktualisierung oder Übernahme bestehender Freigaben. Bei künftigen Bildwechseln müssen Datei und Prüfsumme gemeinsam geändert werden.

Nach Deployment zuerst die interne Testmail auslösen und Darstellung sowie Bilder in den verwendeten Mailprogrammen prüfen. Manche Mailprogramme können auch eingebettete Bilder ausblenden; die Kontaktdaten bleiben im Text lesbar.
