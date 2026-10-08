# Kartenpakete (v2)

Jede Datei `<paket-id>.json` gehört genau einer A-Aufgabe aus `docs/plan-v2.md`.

```json
{
  "category": { "id": "gaming", "name": "Gaming", "emoji": "🎮", "color": "purple" },
  "cards": [
    { "word": "Minecraft", "taboo": ["Blöcke", "Bauen", "Creeper", "Pixel", "Videospiel"],
      "difficulty": "easy", "ageMin": 8, "emoji": "⛏️" }
  ]
}
```

- Erweiterung einer bestehenden Kategorie: `"category": { "id": "tv" }`.
- Pflicht je Karte: `word`, 5–6 `taboo`, `difficulty` (`easy` | `medium` | `hard`), `ageMin` (6 | 8 | 10 | 12 | 14 | 16).
- Optional: `emoji` (Lesehilfe für Kinder), `topical: true` (veraltet schnell), `retired: true` (ausgeblendet; niemals löschen).
- Farben: `mint`, `blue`, `yellow`, `purple`, `coral`, `pink`.
- Prüfen: `npm run cards:check -- <paket-id>`. Gesperrte Wörter stehen in `../blocklist.txt`.
- `src/data/cards.json` erzeugt nur der Integrator mit `npm run cards:import` neu.
