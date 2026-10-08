# Später: zuschaltbare Cloud-Spracherkennung

Dieser Entwurf dokumentiert eine spätere Erweiterung. Er ist kein betriebsbereiter Worker und aktiviert keine kostenpflichtigen Dienste.

## Bedienung

Die manuelle Spielwertung bleibt immer verfügbar. Das Mikrofon ist standardmäßig aus. Die Gruppe wählt ausdrücklich zwischen „Aus“, verfügbarer lokaler Erkennung und einer künftig konfigurierten Cloud-Verbindung. Offline wird Cloud-Erkennung beendet; es gibt keinen automatischen Wechsel zu einem anderen Anbieter. Cloud-Erkennung zeigt Kostenhinweis und aktiven Mikrofonstatus.

## Grenze zwischen PWA und Worker

Der Worker nimmt kurze Audioblöcke nur nach serverseitiger Passwortprüfung entgegen. Ein Passwort im Frontend-Code schützt keinen Dienst. Passworthash, Anbieter-Zugangsdaten und Kostenlimits gehören in Worker-Secrets beziehungsweise serverseitige Konfiguration, niemals ins öffentliche GitHub-Repository.

Eine Anmeldung am Worker gibt eine kurzlebige Sitzung aus. Sie wird nur im Arbeitsspeicher gehalten und bei Ablauf oder „Mikrofon aus“ verworfen. HTTPS und eine eng begrenzte Origin-Freigabe sind notwendig; CORS allein ersetzt keine Authentifizierung. Passwortversuche werden begrenzt und dürfen keine Kosten beim Transkriptionsanbieter verursachen.

## Kostenbegrenzung

- Anmeldung und Berechtigung prüfen, bevor eine Anfrage an den Anbieter geht.
- Limits für Audio-Länge, Dateigröße, parallele Anfragen und Anfragen pro Minute.
- Ein festes Tagesbudget und optional ein Gruppenbudget serverseitig erzwingen.
- Einen globalen Abschalter vorsehen; bei Erreichen eines Limits bleibt die manuelle Wertung nutzbar.
- Aufnahmen nach Verarbeitung verwerfen und Transkripte nicht protokollieren.

Der Anbieter und das konkrete Budget werden vor dieser Erweiterung mit dem Betreiber festgelegt. Sprechertrennung ist ein eigenes Problem: ein erkanntes Tabuwort kann von einem ratenden Spieler stammen. Ohne belastbare Sprechertrennung darf die App keine automatischen Strafen vergeben.

## Lokale Erkennung in der aktuellen Version

`frontend/src/speech.js` prüft die experimentelle Web-Speech-Funktion mit `processLocally: true`. Fehlen die Schnittstelle oder das deutsche Sprachpaket, bleibt manuelle Bedienung verfügbar. Nur durch eine ausdrückliche Aktion kann ein Sprachpaket geladen oder das Mikrofon aktiviert werden. Ein Cloud-Fallback ist ausgeschlossen.

Referenz: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally
