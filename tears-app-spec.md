# T.E.A.R.S. Charakter-Ersteller & Begleiter — Spezifikation

Mobile-first PWA, offline-fähig, kein Backend, lokale Speicherung (Zustand + LocalStorage/IndexedDB).
Stack: React + TypeScript + Vite + TailwindCSS + Zustand.

---

## 1. Navigation

Drei persistente Hauptbereiche über eine Bottom-Nav, jederzeit untereinander wechselbar:

- **Charaktere** — Liste aller Akten
- **Charakterbogen** — Lesemodus der aktuell gewählten Akte
- **Spielmodus** — Probe / Inventar / Notizen (eigene Tab-Leiste innerhalb des Screens)

Eigener, von der Bottom-Nav getrennter Workflow:

- **Charaktererstellung** — Tab-basiert, 9 Bereiche, kein erzwungener linearer Ablauf

Übergänge:

| Von | Nach | Auslöser |
|---|---|---|
| Charaktere | Charaktererstellung | „Neue Akte“ |
| Charaktere | Charakterbogen | Akte antippen |
| Charakterbogen | Charaktererstellung | „Bearbeiten“ |
| Charaktererstellung | Charakterbogen | „Abschließen“ |
| Charakterbogen | Spielmodus | „Los geht's“ |

---

## 2. Design-System

**Optik:** dunkles Dossier/Akten-Thema, kein Light-Mode in v1.

**Farben**
```
--bg-deep:        #121317
--surface:         #1B1D23
--surface-raised:  #22252C
--paper:           #E8E1CF   (Akzent: Titel, primäre Buttons)
--hairline:        #2D303A
--text-primary:    #ECE8DE
--text-muted:      #8C8F99
--text-faint:      #5A5D66
```

**Attribut-Farben (fix, überall konsistent verwenden)**
```
KK Rot     #D1453B
GE Blau    #3E7FCE
AU Grün    #4FA968
CH Pink    #D45C95
IN Lila    #8C5FC4
MB Orange  #E08C3C
```

**Talentkategorie-Farben**
```
Körperlich  #D1453B (= KK-Rot)
Motorisch   #3E7FCE (= GE-Blau)
Geistig     #8C5FC4 (= IN-Lila)
Sozial      #D6B23E (Gelb)
Kampf       #7A2420 (Dunkelrot)
```

**Typografie**
- Display/Titel: Oswald, 500/600
- Fließtext/UI: Inter, 400/500
- Zahlen, Codes, IDs: IBM Plex Mono, 400/500

**Komponenten-Pattern**
- Punktevergabe: `[-] Wert [+]` Stepper, nie freie Zahleneingabe
- Restpunkte immer als Segmentleiste/Balken sichtbar, nie nur als Zahl
- Kostensteigerung automatisch anzeigen (z. B. „nächster Punkt: 2“), nie vom User berechnen lassen
- Karten: 1px Hairline-Border, 6–8px Radius, `--surface`-Hintergrund
- Talentkategorien als Akkordeon, eine Kategorie gleichzeitig geöffnet
- Kampftalente: sichtbares „x2“-Badge (Kostenmultiplikator)

**Layout-Regel:** jeder Screen soll ohne Scrollen auf eine Bildschirmhöhe passen — **außer** bei echten Listen (Talente, Inventar, Notizen), die bewusst scrollen dürfen.

---

## 3. Screens

### 3.1 Charaktere (Liste)
- Suchleiste (visuell, Funktion später)
- Je Akte eine Karte: Akten-Nr. (mono), Name, Beruf, kategorie-farbiger Tab-Strich links, 6 farbige Punkte (Attribut-Vorschau)
- FAB unten rechts → Charaktererstellung

### 3.2 Charakterbogen
- Kopf: Avatar-Initialen, Name, Beruf
- Hexagon-Radar der 6 Attribute (Farben wie oben)
- Attributliste mit Balken + Wert
- Abgeleitete Werte als 3×2-Grid (ATN, PA, ATD, INI, LE, GG)
- Talentkategorien als Übersichtszeilen (Anzahl Talente je Kategorie)
- Aktionen: „Bearbeiten“, „Los geht's“, Export

### 3.3 Charaktererstellung
**Tab-Leiste statt linearer Wizard.** Tabs frei wählbar, aber inhaltlich abhängig gesperrt (Lock-Icon + Kurzgrund, z. B. „Attribute abschließen“). Jeder Tab zeigt Status: erledigt (✓, grün) / aktiv (paper-Border) / gesperrt (gedimmt + Schloss) / optional.

Tabs in Abhängigkeitsreihenfolge:
1. Charakterinformationen — Name, Geschlecht, Alter, Größe, Berufsname
2. Berufskategorie — eine der 8 Kategorien wählen, setzt Start-Attribute + Talentbudget
3. Attribute — *(benötigt Tab 2)*
4. Talente — *(benötigt Tab 3)*
5. Pflicht-Spezifikation — *(benötigt Tab 4)*, eine negative Spezifikation, passend zum Beruf, keine automatische Prüfung
6. Hobbys — *(optional, nach Tab 4)*, max. 2
7. Freie Spezifikationen — *(optional)*, je eine positive + negative
8. Besondere Fähigkeiten — *(optional)*, Kauf mit freien Talentpunkten
9. Übersicht/Fertig — Zusammenfassung, Export (JSON, PDF später), Abschluss-Button

**Tab Attribute — UI:**
- Restpunkte-Segmentleiste (14 Segmente, gefüllt = verbraucht)
- Je Attribut: Farb-Swatch, Name, „nächster Punkt: N“, Stepper
- Live-Vorschau-Strip der abgeleiteten Werte am unteren Rand

**Tab Talente — UI:**
- Akkordeon je Kategorie, Kopfzeile zeigt Restbudget der Kategorie
- Talentzeile: Name, Attribut-Chips (farbig), Mini-Stepper
- Kampfkategorie zeigt „x2“-Badge

**Tab Fertig — UI:**
- Kopf (Avatar, Name, Beruf), Mini-Attributreihe, Derived-Grid, Kurzliste Spezifikation/Hobbys/Fähigkeiten, Abschluss-Button

### 3.4 Spielmodus
**Persistenter Kopfbereich** (unabhängig vom aktiven Tab, immer sichtbar): Lebensenergie-Balken, Mentale-Verfassung-Balken.
Darunter Segment-Tabs: **Probe** / **Inventar** / **Notizen**

**Tab Probe:**
- Talentname, Attribut-Chips (GE/GE/IN-Muster)
- 3 Wurf-Slots (Eingabe oder „Automatisch würfeln“)
- Ergebnis als Stempel-Optik („ERFOLG“/„FEHLSCHLAG“), Hinweistext zu verbrauchten Talentpunkten
- Mini-Anzeige Talentpool-Rest

**Tab Inventar:**
- Liste Gegenstand (Icon, Name, Kategorie, Menge), „Gegenstand hinzufügen“

**Tab Notizen:**
- Freitext-Notizen mit Zeitstempel/Sitzungsbezug, „Notiz hinzufügen“

---

## 4. Regeldaten (für Berechnung/Validierung)

**Attribute** (KK, GE, AU, CH, IN, MB) — Basis 8, Max 19.
Kosten: 9–14 = 1P, 15–17 = 2P, 18–19 = 3P. 14 Punkte zu verteilen nach Berufsmodifikator.

**Berufskategorien (Start-Boni)**
```
Körperlich:      KK +5, AU +3
Handwerk:        GE +5, KK +3
Kundenkontakt:   CH +5, GE +3
Kreativ:         MB +5, IN +3
Denken:          IN +5, MB +3
Militär:         AU +4, GE +4
Medizin:         GE +5, IN +3
Schüler/Arbeitslos: AU +3, CH +3, IN +1, GE +1
```
(Werte = absolute Zielwerte aus Originaldokument, Basis 8 vorausgesetzt)

**Talentkategorien:** Körperlich, Motorisch, Geistig, Sozial, Kampf (Kampf: Kostenmultiplikator ×2, keine Attributbindung).

**Abgeleitete Werte**
```
ATN = (KK + KK + GE) / 3
PA  = (KK + AU + GE) / 3
ATD = (GE + GE + AU) / 3
INI = (KK + 5) - (GE / 2)
LE  = (KK + KK + AU) * 3
GG  = (AU + IN + MB + MB) * 3
```

**Hobbys:** Hobby 1 = +5 auf passendes Talent + eine negative Spezifikation derselben Kategorie (Modifikator ignoriert). Hobby 2 = +3 auf passendes Talent.

**Freie Spezifikationen:** je eine positive + negative, Modifikatorwert = Gegenwert der jeweils anderen.

**Besondere Fähigkeiten (Kosten in freien Talentpunkten)**
```
Pkw-Führerschein           3
Pkw + Motorrad              5
Segelschein                12
Kleinflugzeug               12
Sonderlizenz                25
```

---

## 5. Bewusst offen / spätere Iteration

- Kampf-Workflow, Initiative-Tracker, Waffendatenbank
- Gruppenverwaltung, Session-Modus
- PDF-Export, Charakter-Sharing, Cloud-Sync
- Validierung der Pflicht-Spezifikation gegen Beruf (laut Vorgabe: keine automatische Prüfung, liegt bei Spieler/Spielleitung)
