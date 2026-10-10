# UI-COLOR-01 – bunter Einstieg

Nutzerauftrag vom 2026-10-10, Basis main `2f3e6c7`. PLAY-05 ist bereits vollständig integriert und veröffentlicht: fünf Spielarten, 160 Geräuschbegriffe, geeignete Darstellung pro Wort und Schwierigkeit sowie gespeicherte Aufgabe. Diese Änderung gestaltet den Einstieg neu und benennt die erklärende Spielart neutral.

## Oberfläche

Eine violette Karte mit gelber und rosafarbener Hinterlegung zeigt „Ludeverbis – Spiele mit Wörtern“. Fünf farbige, beschriftete Auswahlfelder mit Symbolen stehen um einen rotierenden Ring: Verbotene Wörter / Frei / Pantomime / Geräusche / Gemischt. Der Ring bewegt sich; native Radiofelder und Beschriftungen bleiben stabil antippbar. Auswahl und Schwierigkeit führen unmittelbar zu „Los geht’s“. Das bisher ausgeblendete Smartphone-Motiv wird damit durch eine sichtbare, interaktive farbige Karte ersetzt, statt eine zusätzliche Dekoration vor die Auswahl zu stapeln.

Auf kleinen Bildschirmen steht das Formular zuerst; Anpassungen und Kartenspeicher folgen. Die DOM-Reihenfolge wird tatsächlich geändert, damit Tastatur und Screenreader dieselbe Reihenfolge haben. In den optionalen Einstellungen und auf größeren Bildschirmen bleibt die komplette Vorbereitung verfügbar. Kein verpflichtender Assistent, keine zusätzliche Anmeldung.

Die Animation lässt sich pausieren; die Präferenz bleibt während der Setup-Neudarstellungen im UI-Kontext erhalten, ohne ein Spiel zu schreiben. „Fortsetzen“ startet den Ring auch bei weiterhin fokussierter Taste. Die Systemeinstellung für reduzierte Bewegung schaltet ihn aus. Kein blinkender Effekt, keine fremden Grafik-/Font-/Iconquellen und keine neue Abhängigkeit.

Der sichtbare Name „Verbotene Wörter“ ersetzt „Tabu“, einschließlich Auswahl, gespeicherter Mischkarten-Anzeige, Regeloptionen, Hilfe, Presentertexten und Wertungsknopf. Das interne Format (`taboo`, `tabooMode`, Karten-IDs und Resultate) bleibt kompatibel. Es gibt keine Speichermigration, keine neue Reservierungs-/Wertungsregel und keine Änderung veröffentlichter Kartendaten. Dies ist eine Umbenennung, keine rechtliche Prüfung oder Zusage einer Store-Freigabe.

## Optionales Android-Ziel

Der Nutzer nennt eine Veröffentlichung im Play Store als mögliches Ziel, ausdrücklich ohne Verpflichtung. Die lokale, statische, offlinefähige Web-App bleibt die Grundlage; eine spätere Android-Verpackung wird nach stabiler Web-/Geräteabnahme separat entschieden. Dieser Auftrag erstellt kein Android-Projekt, vergibt keine endgültige Paket-ID und lädt nichts in einen Store hoch.

## Prüfung

123 vorhandene Unit-Tests bestanden nach Anpassung ausschließlich der sichtbaren Metadaten-Erwartungen. Bestehende Regelfälle/Fixtures bleiben erhalten. Build sowie aktuelle Browser-/Hostnachweise werden im PR ergänzt. Die bestehenden Smartphone-Matrixprüfungen behalten alle Start-/Formular-/Historienassertions und prüfen zusätzlich Titel, Ring und fünf Symbole. Neue Browserfälle prüfen fünf unterschiedliche Farben, unbewegte Touch-Ziele bei laufender Animation, native Tastaturwahl, UI-Pause ohne Speichermutation und reduzierte Bewegung. PLAY-05-/Undo-/Offline-/Korrekturfälle sowie die Geräteprüfung bleiben relevant. Menschliche Geräusch-Ratetests, echte Geräte und andere offene Releasepunkte bleiben ausdrücklich offen.

## Integrationsbedarf

UI-Import, gemeinsame Textmetadaten, aktuelle Planung und genaue Hosting-Abnahme erfolgen durch den alleinigen Integrator. Quellbranches und Recovery bleiben erhalten; `dist`, Lockfiles, Kartenquellen, Storage und Spiellogik werden nicht committed oder verändert. Kein stabiler Release-Tag.
