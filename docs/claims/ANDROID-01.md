# ANDROID-01 – Android und Play-Store-Vorbereitung

- Codex, alleiniger Integrator; 2026-10-10; Branch `v2/ANDROID-01-playstore`, Basis main `6efee20`.
- Nutzerauftrag: committen, sichern und App für Google Play fertig machen. Der frühere Aufschub der Android-Verpackung ist durch diesen neuen Auftrag aufgehoben; echte Geräte-/redaktionsseitige Release-Abnahme bleibt offen.
- Exklusive Dateien: `mobile/**`, `.github/workflows/android.yml`, `docs/play-store/**`, `docs/reviews/ANDROID-01.md`, dieser Claim. Integrator ergänzt `.gitignore`, `docs/plan-v2.md`, Architektur/Releasecheckliste sowie nötige kleine Native-Anpassungen im Frontend (Start, Dateisicherung, Systemränder und Installationshinweis).
- Keine Änderung an Engine, Storage, Kartenquellen, stabilen IDs oder Schema. Web-App bleibt statisch und relativ deploybar. Keine automatische Migration oder gemeinsame Speicherung zwischen Website und Android.
- Abnahme: lokale Assets im Paket, API 36, APK/AAB-Build, Android-Dateiauswahl ohne Speicherberechtigung, kein Cloud-Mikrofon, native App ohne alten Service-Worker-Cache, reproduzierbarer CI-Build und konkrete Store-Materialien. Private Signierschlüssel und Build-Ausgaben niemals committen.
- Main-Recovery vor Start nach GitHub gepusht; lokales vollständiges Git-Bundle und Kopien der ursprünglichen Prototypdateien unter `.private/backups/2026-10-10-android/`. Paketname vor Veröffentlichung bestätigen; Upload und finale Store-Erklärungen benötigen Konto und Verantwortlichen.
