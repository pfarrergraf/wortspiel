# UI-COLOR-01 – bunter Einstieg und neutrale Spielartnamen

- Codex, alleiniger Integrator; 2026-10-10; Branch `v2/UI-COLOR-01-bunte-spielarten`, Basis main `2f3e6c7`.
- Auftrag: farbige Hintergrundkarte mit „Ludeverbis – Spiele mit Wörtern“, animiertem Kreis und fünf Spielarten mit Symbolen. Sichtbarer Spielartname „Verbotene Wörter“ ersetzt „Tabu“. Play-Store-Veröffentlichung bleibt ein optionales Entwicklungsziel.
- Exklusiv: Setup-Ansicht, reine UI-Texte in Regeln/Karte/Spiel/Hilfe/Presenter und Einstellung `audience`, eigene CSS-Teilmodule/Index, Animation als UI-Feature und Import in main.js; UI-Reihenfolge in `features/mobile-wizard.js`, zugehörige Browser-/Textregressionen, eigener Claim/Review und integratorseitiger aktueller Plan.
- Integrationsbedarf: zentrale Textmetadaten, UI-Import und Plan durch den Integrator. Interne `taboo`-IDs, Kartenquellen, Schema, Storage, Spiellogik, Scores, Historien und laufende Sitzungen bleiben unverändert.
- Abnahme: fünf Spielarten direkt auswählbar; bunte Karte/Kreis auch auf Smartphone; Start ohne Pflichtassistent erreichbar. Bewegung pausierbar und bei reduzierter Bewegung ausgeschaltet, Labels und Touch-Ziele stabil. Build, relevante Chrome-/Chromium-Browserfälle und unveränderte Speicherregressionen vor Veröffentlichung. Kein Android-Paket/Store-Upload in diesem Auftrag.
