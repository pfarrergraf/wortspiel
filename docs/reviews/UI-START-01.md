# UI-START-01 – kompakter Einstieg und Implementierungsbestand

Nutzerentscheidung 2026-10-10: **Leicht / Mittel / Schwer** im Vordergrund, Altersbegrenzung zusätzlich unter Einstellungen. Das bestehende `all` heißt sichtbar Schwer; leichte/mittlere Karten bleiben darin enthalten. Keine neue vierte Schwierigkeit, veränderte Kartenmetadaten oder Migration von laufenden Partien.

Auf Smartphones und kurzem Handy-Querformat zeigt der Einstieg Spielart, Schwierigkeit und einen unmittelbar erreichbaren Startknopf. Themen, Teams, Altersgrenze, Tabu-Stufe, Zeit/Wertung, Audio/Mikrofon und Presenter sind über Spiel anpassen erreichbar. Die vollständigen aktivierten Formularfelder bleiben dieselben; FormData enthält ihre Werte auch beim Zuklappen. Desktop und freiwilliger Fünf-Schritte-Assistent bleiben erhalten. Native Validierung öffnet verborgene Pflichtfelder vor Fokus. Gruppen-/Session-/Karten-IDs und Storage-Protokoll unverändert.

Der iPhone-Installationstipp bleibt erhalten, steht beim kompakten Start aber nach dem Formular. Beim Öffnen der Einstellungen bzw. Wechsel auf einen großen Bildschirm kehrt er an seine normale Stelle zurück. DOM- und Tastaturreihenfolge entsprechen der sichtbaren Reihenfolge; kein bloßes CSS-Umsortieren. Zwei tatsächliche 320px-Repros waren vor diesem Fix rot, weil der Hinweis den Startknopf unter den Bildschirm schob.

Prüfverlauf: 113 Unit-Tests und Build grün. Erste neue Einstiegssuite: 12/15 bestanden; kurzer Querbildschirm noch zu hoch, außerdem nahm das neue Testfixture fälschlich Team 2 statt des vorhandenen Defaults Team Rakete an. Querformat erhält eine eigene Zweispaltenanordnung; Fixture gibt den zu prüfenden Teamnamen ausdrücklich ein. Danach 57 gezielte Chrome-Fälle einschließlich beider alter Bildschirmmatrizen, Presets, Pantomime, freiwilligem Assistenten, Replay und vier Konfliktvarianten pro Projekt grün. Abschließender Einstiegstest zusätzlich mit offline neu geladener vollständiger Konfiguration: 15/15 grün. Nach iPhone-Fix laufen abschließende lokale Suite und vollständige exakte Node-22-CI; tatsächliche Resultate/Commit-/Preview-/Produktionslinks im PR-Abschluss. Kein fehlgeschlagener Zwischenstand wird als Abnahme behauptet. Bestehende fachliche Tests/Assertions bleiben erhalten; optional konfigurierende Abläufe öffnen auf dem Handy ausdrücklich Spiel anpassen.

## Was tatsächlich noch fehlt

Weiterer lokaler Zwischenlauf: 62/63 Browserfälle bestanden; der bestehende manuelle Themenauswahl-Test erwartete das jetzt absichtlich verborgene Panel ohne vorher Spiel anpassen zu öffnen. Ablauf um diesen Nutzerschritt ergänzt, alle ursprünglichen Assertions erhalten. Die kompakte Zusammenfassung zeigt die Vorbereitung der nächsten Partie; die separat fortsetzbare alte Partie behält ihre eigenen Werte. Zusätzliche Regression prüft beide Datensätze und die ausdrückliche Ersatzbestätigung. Abschließende exakte Ergebnisse werden im PR dokumentiert.

Die neue Zusammenfassungsregression war zunächst in beiden Projekten rot: Textfelder wurden korrekt gespeichert, der vorhandene Hook ohne Render aktualisierte aber nur alte Zähler und ließ den neuen Überblick veraltet. Nach erfolgreichem Commit aktualisiert er nun auch Gruppe/Teams und den kompakten Kartenzähler. Keine Änderung am Transaktionsablauf; alte Session/Gruppen und Ersatzbestätigung bleiben geprüft. Letzter Zwischenlauf 19/21 grün, beide neuen Zusammenfassungsfälle vor diesem Fix rot.

Abschließender lokaler Build `92d452f7b4e487`: alle 21 ausgewählten Chrome-Fälle grün, einschließlich sämtlicher 11 Bildschirmprojekte, Startknopf nach Wechsel auf jede der drei Spielarten im kurzen Handy-Viewport, iPhone-Hinweis, Offline-Neuladen mit vollständigen Einstellungen, nativer Pflichtfeld-Fokus, korrigierter Gruppenzusammenfassung und alter manueller Themen-/Wertungsrunde. Vollständige Sollsuite in CI: 113 Unit und 343 Browserfälle. Die source-final-Prüfung ist keine behauptete echte Safari-/Hardware-Abnahme.

| Wunsch | Stand nach diesem Paket | Fehlende Implementierung |
| --- | --- | --- |
| Tabu | spielbar | keine neue Grundfunktion nötig |
| Frei | spielbar, ohne zusätzliche Tabuwörter | keine neue Grundfunktion nötig |
| Pantomime | eigener Pool, Gesten, 1–3 Punkte, Undo | keine neue Grundfunktion nötig |
| Geräusche | vorbereitet in Issue #17, noch kein Pool oder Modus | geeignete stabile Karten, reine Regeln, Pool-/Engine-/UI-Einbindung; manuelle Wertung, kein Mikrofon nötig |
| Gemischt | B5-Technik für ältere andere Varianten vorhanden | Auswahl aus Tabu/Frei/Pantomime/Geräuschen, Pool passend zur Aufgabe, eindeutige Kartenanzeige, Moduserhalt bei Wertung/Undo/Replay |
| Smartphone | kompakter direkter Einstieg; Spielbedienung/Matrizen vorhanden | optionale Proberunde/Rollen-Einführung; reale Zwei-Personen-Lesbarkeit und Safari/Touch-Abnahme |
| Sicherung | validierter, zusammenführender Gruppenhistorien-Import/Export vorhanden | vollständige Sicherung von Partie und Einstellungen; geführte Reparatur nach abruptem Absturz ohne Web Locks |
| Ergebnisse | Punkte/Runden/Log und Korrektur vorhanden | geplante ausführliche Statistik/Auszeichnungen |
| Weitere Karten | aktueller Bestand integriert | A12 Kinder und A14 Film besitzen bislang nur Claims; redaktionelle Praxisprüfung |
| Qualität | automatische Chrome/Chromium-Prüfungen vorhanden | echte Geräte, Screenreader/Kontrast, echter Presenter und Banking-App |

Spenden-/Informationsseiten und bestätigte Kontodaten sind bereits umgesetzt und bleiben unverändert. Übersetzungen und Android-Verpackung sind spätere Erweiterungen, keine Voraussetzung für den aktuellen deutschen Offline-Webbetrieb. Kein stabiler Release-Tag und keine behauptete reale Hardware-/Banking-Abnahme.
