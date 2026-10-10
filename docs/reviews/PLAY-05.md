# PLAY-05 – fünf Spielarten

Basis main `4caee6b`, Claim PLAY-05, alleiniger Integrator. Nutzerauftrag: Geräusche benötigt einen eigenen geeigneten Wortschatz; Gemischt wählt die passende Darstellung und macht sie für darstellende und kontrollierende Person sofort sichtbar.

## Verhalten

Die Auswahl enthält Tabu, Frei, Pantomime, Geräusche und Gemischt. Geräusche verwendet `frontend/data/noises-de.json`: 160 originale, konkrete Begriffe in sieben Kategorien, davon 72 leicht, 58 mittel und 30 schwer. Mittel enthält leichte und mittlere Begriffe, Schwer alle drei Stufen. Keine Altersbegrenzungen; die ältere vorbereitete ageMin-Anforderung aus Issue #17 ist durch den jüngeren Nutzerauftrag ersetzt. Ausdrücklich sexuelle Inhalte werden nicht hinzugefügt.

Im Mischmodus wird zuerst gleichverteilt eine verfügbare Darstellungsart gewählt, dann ein passender, ungespielter Begriff. Dadurch dominiert der größere Erklärungspool nicht das Geräuscheraten. Tabu erfordert echte Tabuwörter; Pantomime-Freigaben stammen aus dem bestehenden Pantomime-Pool, Geräusch-Freigaben ausschließlich aus dem kuratierten Geräuschpool. Konkrete Geräuschbegriffe sind auch mimisch darstellbar. Abstrakte gewöhnliche Wörter wie Wahrheit erhalten keine Geräusch-Freigabe aus Schwierigkeit oder Alter. Ist ein Teilpool ausgespielt, bleiben die anderen Darstellungsarten nutzbar; keine Historie wird gelöscht oder aufgefüllt.

Identische normalisierte Wörter aus verschiedenen Namensräumen werden im Mischpool zusammengefasst. Ein dort bereits in irgendeinem Pool exponierter Begriff wird nicht erneut gewählt. Nur die tatsächlich exponierte ID wird reserviert; existierende getrennte Historiensysteme der einzelnen Spielarten bleiben unverändert. Alle bisherigen IDs und veröffentlichten Metadaten bleiben erhalten. Neue Geräusch-IDs sind explizit `de:noises:<normalisiert>` und durch eine veröffentlichte ID-Fixture gegen spätere Entfernung geschützt.

Jede Karte zeigt Symbol, farbige Leiste, Namen und kurze Handlungsregel. Tabu violett/💬, Frei grün/🗣️, Pantomime gelb/🎭, Geräusche blau/🔊. Farbe ist nie die einzige Information. Geräusche erlaubt Stimme, Mund und Hände zum Klangerzeugen, verbietet Wörter, Gesten und Gegenstände. Geräusche und Gemischt geben einheitlich +1 pro Treffer; die bestehende reine Pantomime-Spielart behält ihre +1/+2/+3-Skala. Wertungen erfolgen ausschließlich manuell.

Karte und Modus werden in derselben Storage-Transaktion vor Anzeige gesichert. Ergebnislog, Undo, Pause, Neustart und nachträgliche Korrektur behalten den Modus. Auch eine beim Rundenende noch offene Karte erhält `openMode`. Die Zusammenfassung zeigt die gespeicherte Darstellung und die passende Beschriftung für Regelverstöße. Mikrofonverarbeitung bleibt optional; selbst ein zuvor aktiviertes Mikrofon bleibt auf Geräusch- und Pantomime-Karten aus. Für verbale Karten werden nur deren tatsächlich verbotene Wörter lokal geprüft, ohne automatische Punkte oder Sprecherzuordnung.

Im optionalen Themenformular sind die drei Pooltypen beschriftet. Alle-Auswahl, Abwahl und Suchfilter gelten für die gerade angebotenen Kategorien und bewahren verborgene andere Auswahlen. Der kompakte Smartphone-Start zeigt die fünf Spielarten in zwei Zeilen; weniger Überschriftabstand und kürzere Hinweise halten den direkten Start auf dem ersten Bildschirm. Kein Pflichtassistent. Die Spielhilfe und getrennten Poolanzahlen sind angepasst; Anbieter, Spendenkonto, Hosting und rechtliche Inhalte sind unverändert.

## Redaktionelle Beispiele und Erprobung

Die Begriffe wurden auf konkrete Klangerzeugung und nicht auf bloß visuelle Erkennbarkeit gewählt. Beispiele für einen Spieltest (keine Behauptung eines durchgeführten menschlichen Ratetests):

| Stufe | Beispiele | Nachspielbares Merkmal |
| --- | --- | --- |
| Leicht | Kuh, Hahn, Katze, Hund | vertrauter Tierlaut |
| Leicht | Regen, Donner, Wind | Tropfen, dumpfes Rollen, Rauschen |
| Leicht | Telefon, Tickende Uhr, Fahrradklingel | wiederholtes Klingeln, Ticken, kurzer heller Ton |
| Mittel | Specht, Taube, Grille | Klopfrhythmus, Gurren, Zirpen |
| Mittel | Waschmaschine, Schreibmaschine, Bratpfanne | Motor-/Taktfolge, Tastenanschläge, Brutzeln |
| Mittel | Knarrende Treppe, Flöte | Knarren, luftiger Ton |
| Schwer | Wal, Funkgerät, Quietschende Zugbremsen | Klangfolge, Rauschen mit Signal, langes Quietschen |
| Schwer | Knackendes Eis, Klappernder Heizkörper, Filmprojektor | kurze Bruchlaute, Metallklappern, mechanischer Rhythmus |

Menschliche Erprobung bleibt offen: zwei Gruppen spielen je 20 zufällig gezogene Begriffe jeder Stufe ohne Wörter/Gesten/Gegenstände und notieren Erkennbarkeit, benötigte Zeit und verwechselte Antworten. Besonders ähnliche Laute (z. B. Biene/Mücke und Gans/Ente) sowie komplexe Folgen (Wal/Funkgerät/Filmprojektor) benötigen Rückmeldung. Schwierigkeit darf anschließend angepasst werden, veröffentlichte IDs/Begriffe werden nicht umbenannt; untaugliche Karten werden begründet ausgemustert und behalten ihre ID. Reale Geräte und Bank-App-Spendenprüfung bleiben die bestehenden offenen Releasepunkte. Keine stabile Release-Markierung.

## Prüfungen und Integrationsbedarf

122 Unit-Tests, Kartenprüfung und Build grün. 54 relevante lokale Chrome-Browserfälle bestanden; anschließend zwei Geräuschformulierungen präzisiert und Regeln/ID-Fixture erneut geprüft. Der finale Build besteht erneut 37 einschlägige Fälle einschließlich der elf Bildschirmgrößen. Vollständige exakte Chromium-CI und Hosting-Prüfungen werden im PR dokumentiert. Neue Regressionen prüfen Poolformat/IDs/Schwierigkeit, keine abstrakten Geräuschkarten, Modusverteilung unabhängig von Poolgröße, identischen Hahn in vier Aufgaben, Namespace-Deduplizierung, dauerhafte Historie und alle vier farbigen Aufgabenanzeigen. Außerdem sind Scoring/Undo/Offline-Neustart/Amend sowie ausbleibende lokale Spracherkennung bei einer nonverbalen Karte geprüft.

Engine, Datenbindung, Kartenchecker und Planänderung gehören dem Integrator. Storage-Code, Schema 1, bestehende Sitzungen, gemeinsame generierte Karten, veröffentlichte IDs, Lockfiles, Spenden- und Hostingdateien werden nicht geändert. Der alte B5-Unterbau für explain/draw/oneword bleibt für Legacy-Sitzungen unterstützt; die neue Spielart Gemischt ist eine eigene, explizite Auswahl.
