# Google Play – verbleibende Konto- und Veröffentlichungsarbeit

Stand 2026-10-10. Ein gebautes und signiertes Bundle ist ein Upload-Kandidat, keine Store-Zulassung. Aktuelle Quellen: [Google-Ziel-API](https://support.google.com/googleplay/android-developer/answer/11926878), [Testanforderungen für neue persönliche Konten](https://support.google.com/googleplay/android-developer/answer/14151465), [Store-Bilder](https://support.google.com/googleplay/android-developer/answer/9866151), [Datensicherheit](https://support.google.com/googleplay/android-developer/answer/10787469).

## Technisch vorbereitet

- Paketname vom Nutzer bestätigt: `io.github.pfarrergraf.ludeverbis`. Nach erster Anlage/Veröffentlichung dauerhaft beibehalten.
- Version `1.0.0`, versionCode `1`; für jedes spätere Play-Update einen höheren versionCode verwenden.
- Capacitor 8.5.3, Ziel-/Compile-API 36; lokale Web-Inhalte ohne remote `server.url`. Android-Mindestsystem API 24 mit geeignetem aktuellem WebView.
- Debug-APK für Installation/Tests und Release-App-Bundle; CI-Bundle absichtlich unsigniert. Lokale Signierung ausschließlich mit privatem Upload-Key.
- Store-Icon 512×512 und Feature-Grafik 1024×500 in `assets/`. Android-Emulator erzeugt echte App-Screenshots; keine Browser-Screenshots als echte Android-Aufnahmen ausgeben.
- [Deutsche Texte](listing-de.md). Datenschutz ist öffentlich ohne Login verfügbar; Android-spezifischer Abschnitt erklärt App-Speicher und manuelle Dateien.

## Vom Kontoinhaber zu erledigen

- [ ] Vorhandenes Play-Entwicklerkonto verwenden oder selbst eröffnen/verifizieren. Eventuelle Kontogebühr und Entwickleridentitätsprüfung sind keine automatisch beauftragte Zahlung.
- [ ] App mit bestätigtem Paketnamen anlegen. Tatsächlichen Entwickler-/Anzeigenamen, Kontakt- und Pflichtangaben prüfen; keine Organisation oder Gemeindeträgerschaft erfinden.
- [ ] Upload-Schlüssel, Passwort und öffentliche Upload-Zertifikatsdatei an einem zweiten sicheren Ort sichern. Private Datei nicht in GitHub, Chat oder ein Store-Listing geben. Play App Signing einrichten; Upload-Key und Googles App-Signing-Key sind unterschiedliche Schlüssel.
- [ ] Support-Adresse, Datenschutzerklärung und Impressum abschließend freigeben. Bestehende Gemeindekontodaten bleiben unverändert; die Zulässigkeit der Spendenhinweise/externen Banküberweisung im konkreten Store-Eintrag prüfen.
- [ ] Zielgruppe und IARC-Fragebogen anhand der tatsächlichen Karten festlegen. Keine künstliche 18+-Beschränkung aus Schwierigkeiten ableiten. Wenn Kinder zur Zielgruppe gehören, einschlägige Families-Anforderungen beantworten; ein technischer Modus ersetzt diese Entscheidung nicht.
- [ ] App-Zugriff: alle Funktionen ohne Login. Werbung: nein. Finanz-/Gesundheits-/Nachrichten-Erklärungen wahrheitsgemäß gemäß den aktuellen Formularfragen beantworten.
- [ ] Datensicherheit anhand genau dieses Android-Pakets prüfen. Technischer Entwurf: keine vom Entwickler gesammelten/geteilten Daten, keine Analyse-, Werbe- oder Cloud-Sprach-SDKs. Gruppennamen/Punkte/Historien bleiben lokal; manuell gewählte Dokument-Anbieter und externe Links werden vom Nutzer geöffnet. Antworten nicht ungeprüft aus Website-Hostingprotokollen übernehmen.
- [ ] Internen Testtrack mit signiertem AAB starten. Originalgerät: Erststart im Flugmodus, fünf Spielarten, Bildschirmränder/Zurück/Rotation, Hintergrund-Pause, Prozessneustart, Speicherupdate ohne Deinstallation, Dateiexport/import und QR-Bild in echter Dateiauswahl prüfen.
- [ ] Falls das Konto den Anforderungen für neue persönliche Konten unterliegt: geschlossenen Test mit aktuell mindestens 12 Testern, durchgehend mindestens 14 Tagen, durchführen und anschließend Produktionszugang beantragen. Console-Anzeige ist maßgeblich; automatisierte CI zählt dafür nicht.
- [ ] Pre-Launch-Bericht, Inhalts-/Geräteprüfung und echte menschliche Geräusch-Ratetests prüfen; danach bewusst Produktionsrollout auslösen. Keine stabile Release-Markierung vor Pflichtabnahme.

## Nicht vorgetäuscht

Dieser Auftrag legt kein Entwicklerkonto an, zahlt keine Gebühr, erteilt keine rechtliche Freigabe und meldet keine menschlichen Tester an. Zugriff und endgültige Erklärungen bleiben beim Verantwortlichen. Der technische Kandidat darf bis dahin intern getestet und weiterentwickelt werden.
