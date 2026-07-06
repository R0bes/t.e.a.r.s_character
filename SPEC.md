# T.E.A.R.S. Character Creator & Companion — Spezifikation

Mobile-first PWA für das T.E.A.R.S. Pen-&-Paper-Rollenspiel. Offline-fähig, kein Backend, lokale Datenhaltung.
Stack: React · TypeScript · Vite · TailwindCSS · Zustand.

---

## 1. Phasen

### Phase 1 — Charaktererstellung (implementiert)
Charaktere anlegen, bearbeiten, löschen, speichern, exportieren/importieren.
Alle Regeln automatisch berechnet, keine Tabellen/Taschenrechner für den Spieler.

### Phase 2 — Spielbegleitung (geplant)
Talentproben, Attributproben, Kampfwürfe, Initiative, Lebensenergie/GG-Verwaltung, optionales Würfeln in der App.

---

## 2. Navigation

Drei persistente Hauptbereiche über eine Bottom-Nav:

| Bereich | Inhalt |
|---|---|
| Charaktere | Liste aller Akten |
| Charakterbogen | Lesemodus der aktiven Akte |
| Spielmodus | Probe / Inventar / Notizen (eigene Tab-Leiste) |

Separater Workflow ohne Bottom-Nav:

| Bereich | Inhalt |
|---|---|
| Charaktererstellung | Eine durchgängig scrollbare Seite (Identität, Beruf, Attribute, Talente, Spezifika, Hobbys, Fähigkeiten), sticky Kopfleiste |

Übergänge:

| Von | Nach | Auslöser |
|---|---|---|
| Charaktere | Charaktererstellung | „Neue Akte" |
| Charaktere | Charakterbogen | Akte antippen |
| Charakterbogen | Charaktererstellung | „Bearbeiten" |
| Charaktererstellung | Charakterbogen | „Fertig →" (Kopfleiste) |
| Charaktererstellung | Charaktere | „← Liste" (Kopfleiste) |
| Charakterbogen | Spielmodus | „Los geht's" |

---

## 3. Design-System

**Thema:** dunkles Dossier/Akten-Motiv, kein Light-Mode in v1.

### Farb-Tokens
```
--bg-deep:        #121317
--surface:        #1B1D23
--surface-raised: #22252C
--paper:          #E8E1CF   (Primärfarbe: Titel, Hauptbuttons)
--hairline:       #2D303A
--text-primary:   #ECE8DE
--text-muted:     #8C8F99
--text-faint:     #5A5D66
```

### Attributfarben (konsistent in der gesamten App)
```
KK  Rot     #D1453B
GE  Blau    #3E7FCE
AU  Grün    #4FA968
CH  Pink    #D45C95
IN  Lila    #8C5FC4
MB  Orange  #E08C3C
```

### Talentkategorie-Farben
```
Körperlich  #E07040  (warmes Orange)
Motorisch   #28B4C0  (Teal)
Geistig     #7C56D0  (Lila)
Sozial      #3CB870  (Smaragd)
Kampf       #C83030  (Karmesin)
```

### Typografie
- Display/Titel: Oswald 500/600
- UI/Fließtext: Inter 400/500
- Zahlen, IDs, Codes: IBM Plex Mono 400/500

### Komponenten-Prinzipien
- Punktevergabe ausschließlich über `[−] Wert [+]` Stepper, kein freies Eingabefeld
- Restpunkte immer als Segmentleiste sichtbar, nie nur als Zahl
- Kostensteigerung automatisch anzeigen (z. B. „nächster Punkt: 2 Punkte")
- Karten: 1px Hairline-Border, 6–8px Radius, `--surface`-Hintergrund
- Talentkategorien als Akkordeon, eine Kategorie gleichzeitig geöffnet
- Kampftalente: sichtbares „×2"-Badge

---

## 4. Attributregeln

| Attribut | Name | Startbasis |
|---|---|---|
| KK | Körperkraft | 8 |
| GE | Geschicklichkeit | 8 |
| AU | Ausdauer | 8 |
| CH | Charme | 8 |
| IN | Intelligenz | 8 |
| MB | Mentale Belastbarkeit | 8 |

**Freie Attributpunkte:** 14  
**Maximum:** 19

**Kostenstaffelung:**
| Zielwert | Kosten |
|---|---|
| 9–14 | 1 Punkt |
| 15–17 | 2 Punkte |
| 18–19 | 3 Punkte |

---

## 5. Berufskategorien

Jede Kategorie setzt Mindestattribute (absolute Zielwerte, Basis 8 vorausgesetzt) und vergibt ein Talentbudget.

| Kategorie | Attributboni | Talentbudget (Kategorie → Punkte) |
|---|---|---|
| Körperliche Berufe | KK 13, AU 11 | Körperlich 30, Motorisch 10, frei 5 |
| Handwerkliche Berufe | GE 13, KK 11 | Motorisch 30, Körperlich 10, frei 5 |
| Kundenkontaktberufe | CH 13, GE 11 | Sozial 30, Motorisch 10, frei 5 |
| Kreative Berufe | MB 13, IN 11 | Geistig 20, Motorisch 10, Sozial 10, frei 5 |
| Denkende Berufe | IN 13, MB 11 | Geistig 30, Sozial 10, frei 5 |
| Militärische Berufe | AU 12, GE 12 | Kampf 30, Motorisch 10, frei 5 |
| Medizinische Berufe | GE 13, IN 11 | Motorisch 20, Geistig 10, Sozial 10, frei 5 |
| Arbeitslos/Schüler | AU 11, CH 11, IN 9, GE 9 | Sozial 10, Geistig 10, Motorisch 10, Körperlich 5, Kampf 5, frei 5 |

---

## 6. Talente

Fünf Talentkategorien: Körperlich · Motorisch · Geistig · Sozial · Kampf

Jedes Talent hat:
- Name
- Kategorie
- Drei Bezugsattribute (Kampftalente: keine Bezugsattribute → Kostenmultiplikator ×2)
- Aktuellen Talentwert

**Kampftalente kosten 2 Talentpunkte pro Stufe** (vs. 1 bei normalen Talenten). Dasselbe gilt für Talente ohne Attributangabe.

**Talentstufen (rein darstellerisch):**
| Wert | Label |
|---|---|
| 0 | Ungelernt |
| 1–4 | Mehr schlecht als recht |
| 5–9 | Solide Kenntnisse |
| ≥ 10 | Profi |

---

## 7. Abgeleitete Werte

```
ATN  Nahkampfattacke    = (KK + KK + GE) / 3
PA   Parade             = (KK + AU + GE) / 3
ATD  Distanzattacke     = (GE + GE + AU) / 3
INI  Initiative         = (KK + 5) − (GE / 2)
LE   Lebensenergie      = (KK + KK + AU) × 3
GG   Geistige Gesundheit = (AU + IN + MB + MB) × 3
```

Alle Werte werden in der App live berechnet.

---

## 8. Spezifika

Jedes Spezifikum hat: Name · Kategorie · Beschreibung · Talentmodifikator

Vorzeichenkonvention:
- Positiver Modifikator = **negatives** Spezifikum (Malus)
- Negativer Modifikator = **positives** Spezifikum (Bonus)

**Pflicht-Spezifikum des Berufs:** Ein negatives Spezifikum, das inhaltlich zum Beruf passt. Keine automatische Prüfung durch die App — liegt bei Spieler und Spielleitung.

---

## 9. Hobbys

Maximal zwei Hobbys pro Charakter.

| Hobby | Effekt |
|---|---|
| Hobby 1 | +5 Talentpunkte auf ein passendes Talent + ein negatives Spezifikum derselben Kategorie (Modifikator wird ignoriert) |
| Hobby 2 | +3 Talentpunkte auf ein passendes Talent |

---

## 10. Freie Spezifikationen

Jeder Charakter erhält:
- Ein negatives Spezifikum (positiver Modifikator)
- Ein positives Spezifikum (negativer Modifikator)

Die Modifikatoren werden normal angewendet.

---

## 11. Besondere Fähigkeiten & Führerscheine

Bezahlt mit freien Talentpunkten:

| Fähigkeit | Kosten |
|---|---|
| PKW-Führerschein | 3 |
| PKW + Motorrad | 5 |
| Segelschein | 12 |
| Kleinflugzeug | 12 |
| Sonderlizenz | 25 |

---

## 12. Screens & UI-Details

### Charakterliste
- Suchleiste (visuell, Funktion später)
- Aktenkarte: Nummer (mono), Name, Beruf, kategoriefarbiger Randstreifen, 6 Attributpunkte als farbige Dots
- FAB → Charaktererstellung

### Charakterbogen (Lesemodus)
- Kopf: Initialen-Avatar, Name, Beruf
- Hexagon-Radar der 6 Attribute (Attributfarben)
- Attributliste mit Balken und Wert
- Abgeleitete Werte als 3×2-Grid
- Kurzübersicht Spezifika, Hobbys, Fähigkeiten
- Aktionen: „Bearbeiten", „Los geht's", Export

### Charaktererstellung (eine Seite)

Sticky Kopfleiste („← Liste", Charaktername, „Fertig →") über einem durchgehend scrollbaren Formular. Kein Tab-Wizard, keine gesperrten Abschnitte — alles ist jederzeit sichtbar und editierbar:

- Identität (Name, Geschlecht, Alter/Größe/Gewicht, Charakterbild) + Berufskategorie nebeneinander
- Attribute: 14-Segment-Restpunktebalken, Attributstepper mit Farbcodierung der Kostenstufen, Spider-Chart mit Live-Vorschau der abgeleiteten Werte
- Talente: Akkordeon je Kategorie, Kopfzeile zeigt Restkategoriebudget, Kampfkategorie mit ×2-Badge
- Spezifika (Pflicht-Spezifikation, Hobbys, freie Spezifikationen) und besondere Fähigkeiten in derselben Ansicht

Ein „Edit/Fix"-Modus-Umschalter (schwebender Button) wechselt zwischen der Ansicht für die Ersterstellung und einer kompakteren Ansicht zum nachträglichen Korrigieren einzelner Werte.

### Spielmodus
- Persistenter Kopfbereich: LE-Balken, GG-Balken
- Tabs: Probe / Inventar / Notizen

**Tab Probe:**
- Talent wählen, Attribut-Chips anzeigen
- Drei Würfelslots (manuell oder automatisch)
- Ergebnis als Stempel-Optik: ERFOLG / FEHLSCHLAG, Resttaelentpool

---

## 13. Probenberechnung (Spielmodus)

Für jede der drei Attributrollen:
- Roll ≤ Attribut → Erfolg, kein Abzug
- Roll > Attribut → Differenz wird vom Talentpool abgezogen

Wenn Summe aller Differenzen ≤ Talentwert → **Erfolg**, Rest = Qualität  
Sonst → **Fehlschlag**

---

## 14. Zukünftige Erweiterungen

- Kampf-Workflow, Initiative-Tracker, Waffendatenbank
- Inventar, Ausrüstung
- Gruppenverwaltung, Session-Modus
- PDF-Export, JSON-Import/Export (JSON-Export implementiert)
- Cloud-Sync, Charakter-Sharing
- Automatische Prüfung Pflicht-Spezifikum vs. Beruf
