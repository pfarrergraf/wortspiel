# INFO-01 – Gemeindebezug, Impressum und Unterstützung

Basis main `2eedbea10b83dc75d47831c40be2286e10a068b3`, Branch `v2/INFO-01-community`. Öffentliches Branding noch nicht geändert: der Nutzer meint einen früheren Favoriten, dessen Name im verfügbaren Verlauf/Repository fehlt. Rückfrage ist gestellt; kein Ersatzname erfunden. Cloudflare-Auftrag DEPLOY-BRAND-01: [Issue #26](https://github.com/pfarrergraf/wortspiel/issues/26), Hosting bleibt bei Claude, UI/Kernintegration bei Codex.

## Tatsächlich implementiert

- Vier eigenständige statische Seiten: Projekt, Impressum, Datenschutz beim Spielen und freiwillige Unterstützung. Footer verlinkt sie, links umbrechend und mindestens 44px hoch. Kein Backend, keine Registrierung/Zahlungsabwicklung/externen Fonts/QR-Dienste.
- Eine laufende Runde wird vor Informationsnavigation über die vorhandene `change()`-Aktion dauerhaft pausiert. Bei Speicherfehler keine Navigation. Rückkehr behält aktuelle Karte, Punkte, Log und gesehenen Bestand.
- Banking-QR lokal als SVG und PNG, Empfänger/IBAN/BIC aus offizieller Quelle. Betrag leer, Zweck `Spende Jugendarbeit`. Manuelles Kopieren plus Download auf demselben Smartphone; ohne JS bleiben Kontodaten und QR lesbar, nicht funktionierende Kopierbuttons werden nicht angezeigt. Bei Clipboard-Verweigerung verständliche manuelle Alternative.
- Bestehender Service Worker nimmt die statischen Dateien automatisch in den Offlinebestand auf. Kein neuer State-/Storage-/Modusmechanismus, keine Karten-/Schema-/Lockfile-Änderung. Historischer `app: wortspiel`-Backuptyp und Speicherpräfixe bleiben auch nach einer öffentlichen Umbenennung stabil.

## Nachprüfbare offizielle Quellen (Abruf 2026-10-10)

- [Gemeinde-Impressum](https://kirchengemeinde-oberlahnstein.ekhn.de/impressum): Evangelische Kirchengemeinde Oberlahnstein, Körperschaft des öffentlichen Rechts, Wilhelmstraße 53, 56112 Lahnstein, Telefon 02621 2236, kirchengemeinde.oberlahnstein@ekhn.de; Vertretung **Kerstin Graf**. Der Footer derselben Gemeindeseite nennt das gemeinsame Gemeindebüro in Bad Ems; diese Verwaltungsanschrift wurde nicht mit der Impressumsanschrift vermischt.
- [Pfarrteam](https://kirchengemeinde-oberlahnstein.ekhn.de/ansprechpartner/pfarrteam): Pfarrer **Benjamin Graf**, benjamin.graf@ekhn.de. Im Entwurf Projektkontakt, nicht eigenmächtig zum gesetzlichen Gemeindevertreter umbenannt.
- [Spendenseite](https://kirchengemeinde-oberlahnstein.ekhn.de/spenden), identisch auch `/spenden-2`: Empfänger Evangelische Kirchengemeinde Oberlahnstein, Nassauische Sparkasse, IBAN **DE50 5105 0015 0656 2363 79**, BIC **NASSDE55XXX**. Zweckbindungen sind dort ausdrücklich erlaubt; die Nutzeranweisung legt hier `Spende Jugendarbeit` fest. Für Spendenbescheinigungen verweist die Quelle ans Gemeindebüro.
- [Gemeinde-Datenschutz](https://kirchengemeinde-oberlahnstein.ekhn.de/datenschutz): DSG-EKD. Hosting-/Analyse-/Vertragsbehauptungen der Gemeindehomepage wurden **nicht** als Tatsachen über diese App kopiert. Spielbezogene Hinweise beschreiben lokale Daten, technischen Hostingverkehr, optionale lokale Sprachverarbeitung, eigenständige externe Links/Bank und Originwechsel. Keine erfundenen Speicherfristen, AV-Verträge oder Einwilligungen.

**Rechtliche Veröffentlichung noch nicht freigegeben:** Der Nutzer muss für diese Spiel-App den tatsächlichen Anbieter, die Vertretung und Verantwortlichkeit bestätigen. Ein offizielles Gemeinde-Impressum belegt die dort veröffentlichten Daten, aber nicht automatisch die rechtliche Zuordnung einer neuen App. Texte sind auf dem Entwicklungsbranch reviewbar, kein Merge/Produktionsdeploy. Echte Banking-App-Prüfung und tatsächliche neue Cloudflare-Adresse ebenfalls offen.

## Banking-QR-Prüfung

EPC-Payload: `BCD`, Version `002`, UTF-8 `1`, `SCT`, offizieller BIC/Empfänger/IBAN, leerer Betrag und strukturierte Referenz, unstrukturierter Zweck `Spende Jugendarbeit`. 115 UTF-8-Bytes, QR-Version 7, Fehlerkorrektur M, vier Module Weißrand. IBAN-Mod97 = 1. Mit isoliertem segno 1.6.6 erzeugt und **unabhängig mit zxing-cpp 2.3.0 aus PNG dekodiert**; vollständige Payload-Übereinstimmung bestanden. Tools nur in Audit-venv, keine Client-/npm-Abhängigkeiten. Nicht als realer Banking-App-Test ausgegeben.

## Prüfstand

`npm ci`, 98 Unit, Kartencheck und Produktionsbuild bestanden. 14 neue Browserfälle auf Mobile/Desktop bestanden: neun Breiten 320px bis Desktop, Pausieren/Rückkehr, alle Seiten/QR offline ohne fremde Requests, genaue Clipboard-/Downloadwerte, ohne JavaScript, defekter Speicher unangetastet, Clipboard-Verweigerung/gescheitertes Pause, strikte CSP. Ein eigener Test verwendete anfangs Browser-Request.url als Methode statt Eigenschaft; korrigiert, keine Assertion entfernt.

Vollständige Sollsuite: 116 Browserfälle, inklusive unveränderter Claude-Suite. Tatsächliches volles Ergebnis, Commit/PR und exakte CI im Paket-Abschlusskommentar. Keine Freigabe aus bloßen Testzahlen ableiten.

## Befund zur gewünschten einfacheren Auswahl

Der Eindruck geringer Unterschiede ist messbar: bei allen Erklärungsthemen, ohne gesehene Karten, Stufen easy/medium/all ergeben ageGroup=14 **1133/1962/2734** Karten, ageGroup=null **1133/1962/2736**. Erwachsene haben derzeit nur zwei zusätzliche Karten. ageGroup=8 ergibt **786/847/851**. Das sind reale Filterzahlen, keine Qualitätsgarantie.

Deshalb Schwierigkeit prominent und Alter/Themen nicht damit vermischen. Vorschlag zur Klärung: Leicht/Mittel/Schwer als Hauptauswahl, altersgerechte Kinderauswahl zusätzlich; Konfis als Themenvorlage. Eine verständlich bezeichnete Erwachsenenauswahl kann den vorhandenen ungefilterten Alterswert null verwenden. Eine Vereinfachung darf keine alten numerischen Alterswerte, Preset-IDs, ausgewählten Themen, Sessions oder gemeinsamen Seen-IDs stillschweigend umschreiben. Aktuelle Schwierigkeit ist kumulativ (medium enthält auch easy, all enthält alle), daher Schwer erläutern und nicht heimlich nur harte Karten wählen. Hier noch keine Engine-/Settings-Änderung; Entscheidung steht aus.
