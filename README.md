# T.E.A.R.S. Character Creator

Mobile-first PWA für die Charaktererstellung und Spielbegleitung im T.E.A.R.S. Pen-&-Paper-Rollenspiel.

## Features

- Charaktere anlegen, bearbeiten, löschen
- Vollständige Regelimplementierung: Attributkosten, Talentbudgets, Berufsboni
- Alle abgeleiteten Werte (ATN, PA, ATD, INI, LE, GG) live berechnet
- Spezifika, Hobbys, Sonderfähigkeiten
- JSON-Export/Import
- Offline-fähig (PWA, kein Backend)

## Entwicklung

```bash
cd app
npm install
npm run dev       # Vite Dev-Server auf http://localhost:5173
npm run build     # Produktionsbuild nach app/dist/
```

## GitHub Codespaces

Das Repository enthält eine Codespaces-Konfiguration (`.devcontainer/devcontainer.json`).  
Einfach „Code → Codespaces → New codespace" wählen — `npm install` läuft automatisch, Port 5173 wird weitergeleitet.

## Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| PWA | vite-plugin-pwa |

## Projektstruktur

```
app/
  src/
    components/
      creation/   # Charaktererstellungs-Tabs (Tab1–Tab9)
      sheet/      # Charakterbogen (Lesemodus)
      ui/         # Wiederverwendbare Komponenten (SpiderChart, PointsBar, …)
    data/         # Statische Regeldaten (Attribute, Talente, Spezifika, …)
    rules/        # Berechnungslogik (Attributkosten, Talentkosten, abgeleitete Werte)
    store/        # Zustand-Store (Charakterdaten, Persistenz)
    types/        # TypeScript-Typen
```

## Spezifikation

Vollständige Regeln, UX-Prinzipien und Screen-Beschreibungen: [SPEC.md](SPEC.md)
