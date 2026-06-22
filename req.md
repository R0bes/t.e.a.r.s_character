# T.E.A.R.S. Character Creator & Companion

## 1. Zielsetzung

Es soll eine Webanwendung entwickelt werden, die die Erstellung und Verwaltung von Charakteren für das Pen-and-Paper-Rollenspiel T.E.A.R.S. unterstützt.

Die Anwendung soll Spielern ermöglichen, ihren Charakter über eine geführte Oberfläche auf Smartphone, Tablet oder Desktop zu erstellen und anschließend eine übersichtliche Charakteransicht zu erhalten.

Zusätzlich soll die Anwendung später um einen einfachen Spielmodus erweitert werden, der Würfelproben und Berechnungen während des Spiels unterstützt.

---

# 2. Funktionsumfang

## Phase 1: Charaktererstellung

Die Anwendung soll:

* Charaktere erstellen
* Charaktere bearbeiten
* Charaktere speichern
* Charaktere löschen
* Charakterbögen anzeigen
* Regelverletzungen automatisch erkennen
* Punkteverteilungen automatisch berechnen

---

## Phase 2: Spielbegleitung

Die Anwendung soll zusätzlich:

* Talentproben berechnen
* Attributproben berechnen
* Kampfwürfe berechnen
* Initiative berechnen
* Lebensenergie verwalten
* Geistige Gesundheit verwalten
* Würfelergebnisse erfassen
* Optional selbst würfeln können

---

# 3. Charaktermodell

Jeder Charakter besitzt folgende Stammdaten:

* Name
* Geschlecht
* Alter
* Größe
* Beruf
* Berufskategorie

Diese Informationen dienen hauptsächlich der Darstellung und dem Rollenspiel.

---

# 4. Attribute

Folgende Basisattribute existieren:

| Kürzel | Name                  |
| ------ | --------------------- |
| KK     | Körperkraft           |
| GE     | Geschicklichkeit      |
| AU     | Ausdauer              |
| CH     | Charme                |
| IN     | Intelligenz           |
| MB     | Mentale Belastbarkeit |

Alle Attribute starten mit dem Wert:

8

---

# 5. Berufskategorien

Folgende Berufskategorien existieren:

## Körperliche Berufe

* KK = 13
* AU = 11

## Handwerkliche Berufe

* GE = 13
* KK = 11

## Kundenkontaktberufe

* CH = 13
* GE = 11

## Kreative Berufe

* MB = 13
* IN = 11

## Denkende Berufe

* IN = 13
* MB = 11

## Militärische Berufe

* AU = 12
* GE = 12

## Medizinische Berufe

* GE = 13
* IN = 11

## Arbeitslose / Schüler / Studenten

* AU = 11
* CH = 11
* IN = 9
* GE = 9

---

# 6. Freie Attributpunkte

Jeder Charakter erhält zusätzlich:

14 freie Attributpunkte

Maximalwert eines Attributes:

19

Kostenstruktur:

| Zielwert | Kosten   |
| -------- | -------- |
| 9-14     | 1 Punkt  |
| 15-17    | 2 Punkte |
| 18-19    | 3 Punkte |

Die Anwendung muss die Kosten automatisch berechnen.

---

# 7. Talentkategorien

Es existieren fünf Talentkategorien:

* Körperliche Talente
* Motorische Talente
* Geistige Talente
* Soziale/Gesellschaftliche Talente
* Kampf/Waffen Talente

---

# 8. Talente

Jedes Talent besitzt:

* Name
* Kategorie
* Drei Bezugsattribute
* Aktuellen Talentwert

Beispiel:

Klettern

* KK
* KK
* GE

Kampftalente besitzen keine Bezugsattribute.

---

# 9. Talentpunkte aus Berufen

Jede Berufskategorie vergibt Talentpunkte auf bestimmte Talentgruppen.

## Körperliche Berufe

* 30 Körperliche Talente
* 10 Motorische Talente
* 5 variable Punkte

## Handwerkliche Berufe

* 30 Motorische Talente
* 10 Körperliche Talente
* 5 variable Punkte

## Kundenkontaktberufe

* 30 Soziale Talente
* 10 Motorische Talente
* 5 variable Punkte

## Kreative Berufe

* 20 Geistige Talente
* 10 Motorische Talente
* 10 Soziale Talente
* 5 variable Punkte

## Denkende Berufe

* 30 Geistige Talente
* 10 Soziale Talente
* 5 variable Punkte

## Militärische Berufe

* 30 Kampf/Waffen Talente
* 10 Motorische Talente
* 5 variable Punkte

## Medizinische Berufe

* 20 Motorische Talente
* 10 Geistige Talente
* 10 Soziale Talente
* 5 variable Punkte

## Arbeitslose / Schüler / Studenten

* 10 Soziale Talente
* 10 Geistige Talente
* 10 Motorische Talente
* 5 Körperliche Talente
* 5 Kampf/Waffen Talente
* 5 variable Punkte

---

# 10. Talentstufen

Zur besseren Darstellung sollen Talentwerte eingeordnet werden:

| Wert | Bedeutung               |
| ---- | ----------------------- |
| 0    | Ungelernt               |
| 1-4  | Mehr schlecht als recht |
| 5-9  | Solide Kenntnisse       |
| >=10 | Profi                   |

Diese Einteilung dient ausschließlich der Darstellung.

---

# 11. Kampftalente

Kampftalente kosten doppelt so viele Talentpunkte wie normale Talente.

Beispiele:

* Ringen/Faustkampf
* Nahkampfwaffen stumpf
* Nahkampfwaffen spitz
* Wurfwaffen
* Klingenwaffen
* Pistolen
* Gewehre
* Bögen
* Kampfsport

Die Anwendung muss die doppelten Kosten automatisch berücksichtigen.

---

# 12. Spezifika

Jedes Spezifikum besitzt:

* Name
* Kategorie
* Beschreibung
* Talentmodifikator

Beispiele:

Wirrwarr (+3)

Härte Nuss (-10)

Regel:

Positive Werte bedeuten negatives Spezifikum.

Negative Werte bedeuten positives Spezifikum.

---

# 13. Pflicht-Spezifikum des Berufs

Jeder Charakter muss ein negatives Spezifikum wählen.

Dieses muss inhaltlich zum Beruf passen.

Die Anwendung kann dies nicht automatisch prüfen.

Eine manuelle Auswahl genügt.

---

# 14. Hobbys

Ein Charakter kann maximal zwei Hobbys besitzen.

## Hobby 1

* +5 Talentpunkte auf ein passendes Talent
* Ein negatives Spezifikum derselben Kategorie

Der Talentbonus des Spezifikums wird hierbei ignoriert.

## Hobby 2

* +3 Talentpunkte auf ein passendes Talent

---

# 15. Freie Spezifika

Zusätzlich erhält jeder Charakter:

* Ein negatives Spezifikum
* Ein positives Spezifikum

Die jeweiligen Modifikatoren werden normal angewendet.

---

# 16. Führerscheine und Sonderfähigkeiten

Diese werden mit allgemeinen Talentpunkten bezahlt.

Bekannte Fähigkeiten:

| Fähigkeit           | Kosten |
| ------------------- | ------ |
| PKW                 | 3      |
| PKW + Motorrad      | 5      |
| Segelschein         | 12     |
| Kleinflugzeug       | 12     |
| Spezialführerschein | 25     |

---

# 17. Abgeleitete Werte

## Nahkampfattacke

ATN = (KK + KK + GE) / 3

## Parade

PA = (KK + AU + GE) / 3

## Distanzattacke

ATD = (GE + GE + AU) / 3

## Initiative

INI = (KK + 5) - (GE / 2)

## Lebensenergie

LE = (KK + KK + AU) × 3

## Geistige Gesundheit

GG = (AU + IN + MB + MB) × 3

Alle Werte werden automatisch berechnet.

---

# 18. Charakterbogen

Der finale Charakterbogen soll enthalten:

* Stammdaten
* Beruf
* Attribute
* Talente
* Spezifika
* Hobbys
* Sonderfähigkeiten
* Abgeleitete Werte

Die Darstellung soll mobilfreundlich sein.

---

# 19. Zukünftige Erweiterungen

* Würfelsystem
* Talentproben
* Kampfverwaltung
* Inventar
* Ausrüstung
* Waffen
* Gruppenverwaltung
* PDF-Export
* Charakterimport/-export
* Online-Synchronisierung
