# ANDROID-01 – offline Android-Paket

Nutzerauftrag 2026-10-10: aktuellen Stand committen, sichern und ludeverbis für Google Play vorbereiten. Paketname `io.github.pfarrergraf.ludeverbis` ausdrücklich bestätigt; keine App bereits angelegt. Basis main `6efee20`; Recovery auf GitHub und vollständiges privates Git-Bundle samt ursprünglichen Prototypdateien angelegt. Quellbranch bleibt erhalten.

## Umsetzung

Separates `mobile/` mit Capacitor 8.5.3 und App-Plugin 8.1.2, gepinnter Lockdatei, Gradle-Wrapper, API 36 und Version 1.0.0 / versionCode 1. Vollständige Web-Oberfläche/Karten/Schriften werden lokal kopiert und gegen das Web-Build SHA-256-geprüft. Feste Origin `https://localhost`; keine remote App-URL, keine automatische Live-Aktualisierung. Native Startseite verwendet das installierte Paket ohne Service Worker. Web-SW/relativer Basis-Pfad bleiben erhalten.

Native Gerätefunktionen: Android-SAF für ausdrücklich gewählten JSON-Export/Import und QR-PNG; keine allgemeine Speicherberechtigung, striktes UTF-8 und 5-MB-Limit. Native Importdaten gehen durch die unveränderte vollständige Importprüfung vor Speichermutation. Abbrechen verändert keinen Kartenspeicher. Pause beim App-Wechsel/Zurück, Zurück schließt Dialoge vor Navigation und fragt beim Beenden. Bei fehlgeschlagener dauerhafter Pause wird das Beenden blockiert. Bildschirm bleibt nur während der Runde an. Systemränder funktionieren über die Capacitor-CSS-Insetvariablen, auch in Informationsseiten. Kein Mikrofonplugin oder Android-Mikrofonrecht; manuelle Wertung bleibt immer verfügbar.

Engine, transaktionaler Storage, Schema 1, Kartendaten und veröffentlichte IDs sind unverändert. Android und Website besitzen getrennte Speicher. Sicherung überträgt nur historische Karten, keine laufende Partie. Android-Cloud-Sicherung und automatischer Gerätetransfer explizit ausgeschlossen; Deinstallation verliert App-Daten, darum manuelle Sicherung vorab. Keine Ads/Tracking/Firebase und keine neuen Cloud-Konten.

Store-Texte, 512×512-Icon und 1024×500-Grafik als Quell-/Exportdateien vorbereitet. Android-CI erstellt tatsächliche App-Screenshots im API-36-Emulator bei deaktiviertem Netzwerk; deren Ergebnis wird im PR ergänzt. GPL/MIT/Apache/OFL-Lizenztexte sind im Paket erreichbar. Upload-Schlüssel ausschließlich im privaten geschützten Dateisystem; keine Geheimnisse oder Signierdaten im Client/Git/CI. CI baut absichtlich ein unsigniertes Release-Bundle; der geprüfte Kandidat wird lokal signiert und verifiziert.

## Prüfung und Grenzen

123 Web-Unit-Tests lokal bestanden. Sechs gezielte Native-Bridge-Browserfälle bestanden (Android-Schnittstelle simuliert, keine behauptete reale Geräteprüfung): Offline-Markierung ohne SW, ausgeblendete Installation, Systemränder, autoritativer Datei-Export/ungültiger Import/Valid-Import, Hintergrundpause und Abbruch des Beendens bei erhaltener Kartenreservierung. Bestehende PLAY-05/UI-COLOR-Fälle bleiben erhalten. Erster Android-CI-Build bewies APK/AAB/Lint-Kompilierbarkeit; Zwischenstände sind keine Freigabe des aktuellen SHA.

Android-CI prüft zwei echte Dokumentgrenzfälle als JVM-Tests und zwei Instrumentierungsfälle (Manifest/Offline-Spiel): Erststart im API-36-WebView ohne Netzwerk, Geräuschmodus/Treffer, unveränderte Session/Historie nach Activity-Neustart, native Dateiauswahl-Abbruch und Zurück-Dialog. Vollständige Web-CI und genaue finale Android-/main-/Artifact-SHAs stehen im PR-Abschluss; automatische Prüfungen ersetzen keine menschlichen Geräte-, Karten- oder Play-Console-Tests.

[Play-Console-Checkliste](../play-store/console-checklist.md) hält Zugang, Entwickleridentität, Zielgruppe/IARC/Families, Datensicherheit, Datenschutz-/Spendenprüfung, interne/gegebenenfalls geschlossene Tests und Produktionsfreigabe offen. Nutzerauftrag hebt früheren Aufschub der technischen Verpackung auf, bestätigt aber keine rechtlichen Store-Erklärungen. Keine Account-Eröffnung, Kosten/DNS-Änderung oder Store-Veröffentlichung; kein stabiler Release-Tag.

## Integrationsbedarf

Integrator kontrolliert UI-Imports, Frontend-Package/Lock, nativen Start/Sicherung/Systemränder, öffentliche Lizenz-/Informationsseiten und Plan/Architektur. Separate Web-CI muss unverändert grün sein. Generierte Web-/Android-Ausgaben, Schlüssel und private Konfiguration niemals committen. GitHub Pages bleibt Rückfall; erforderliche öffentliche Lizenz-/Android-Informationsseiten nach Integration mit dem geprüften Web-Build veröffentlichen.
