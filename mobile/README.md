# ludeverbis für Android

Die statische App in `../frontend` bleibt die gemeinsame Quelle. Dieses Projekt bündelt das komplette Web-Build mit Capacitor; es lädt keine Website als App. `https://localhost` ist die feste interne Origin und muss auch bei Updates erhalten bleiben. Browser/Web-App und Android besitzen getrennte Kartenhistorien. Import vereinigt historische Karten, überträgt keine laufende Partie.

## Build

Node 22, JDK 21 und Android SDK mit Plattform 36 verwenden. Die [Android-CI](../.github/workflows/android.yml) baut und prüft APK/AAB plus API-36-Emulator; Web-Regressionssuite läuft separat.

```sh
npm ci --prefix frontend
npm ci --prefix mobile
npm run sync --prefix mobile
cd mobile/android
./gradlew assembleDebug bundleRelease lintDebug testDebugUnitTest
```

Unter Windows `npm.cmd` und `gradlew.bat` verwenden. `sync` baut die aktuelle Oberfläche und prüft alle kopierten Dateien. Hostrichtlinien/Service Worker werden aus dem Android-Paket entfernt; die native App markiert die eingebauten Assets unmittelbar als offline verfügbar. Die Website registriert weiterhin ihren Service Worker.

Ausgaben: `android/app/build/outputs/apk/debug/app-debug.apk` und `android/app/build/outputs/bundle/release/app-release.aab`. Debug-APK ist installierbar, CI-Release-Bundle vor privater Signierung nicht hochladbar. Ausgaben, Schlüssel und Passwörter sind ignoriert und gehören nicht ins Repository.

## Signierung

Das Gradle-Build kann über `LUDEVERBIS_KEYSTORE`, `LUDEVERBIS_STORE_PASSWORD`, `LUDEVERBIS_KEY_ALIAS`, `LUDEVERBIS_KEY_PASSWORD` lokal signieren. Alternativ signiert [sign-bundle.ps1](scripts/sign-bundle.ps1) das exakt geprüfte, unsignierte CI-Bundle mit einer ausschließlich privaten Konfigurationsdatei (`javaHome`, `keystore`, `alias`, `storePassword`, `keyPassword`). Nie Passwörter als Argumente oder in GitHub-Logs ausgeben. Gleichen Upload-Key für Updates behalten; Schlüssel und Passwort separat sicher sichern.

```powershell
powershell -NoProfile -File mobile/scripts/sign-bundle.ps1 -Bundle '<unsigned.aab>' -SigningConfig '<private-signing.json>' -Output '<new-signed.aab>'
```

Der Nutzer bestätigte den Paketnamen `io.github.pfarrergraf.ludeverbis`. VersionCode vor Updates erhöhen. App-Signing in Play Console und Upload-Key sind getrennt.

## Native Funktionen

- Explizite Android-Dateiauswahl (SAF) für JSON-Backup und QR-PNG, ohne allgemeine Speicherrechte; Import maximal 5 MB, striktes UTF-8 und bestehende vollständige Schema-Prüfung vor Mutation.
- Pause beim App-Wechsel, Zurück schließt zuerst Dialoge/navigiert zurück und fragt vor dem Beenden; laufende Karte bleibt reserviert.
- Bildschirm nur während der laufenden Runde eingeschaltet; Android-Systemränder über Capacitor-CSS-Insets.
- Kein Mikrofon-/Cloud-Erkennungsplugin, keine Kamera, kein Tracking, keine Firebase-Abhängigkeit. Native automatische Cloud-/Gerätetransfer-Sicherung ausgeschlossen; manueller Export bleibt wichtig, insbesondere vor Deinstallation.
- GPL-3.0-or-later und ursprüngliche Daten-/Drittanbieterhinweise bleiben gültig. [Store-Vorbereitung](../docs/play-store/console-checklist.md).

CLI-Abhängigkeit `xcode` nutzt per Override die kompatible `uuid`-Version 11.1.1: behoben ist [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Dieses Werkzeug wird nicht im Android-App-Paket ausgeliefert.
