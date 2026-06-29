#!/usr/bin/env bash
# cut_icons.sh — Schneidet Icons präzise aus einem Sprite-Sheet aus.
#
# Erkennt Icons automatisch durch Connected-Component-Analyse —
# kein festes Grid nötig. Funktioniert für Sprites mit beliebiger
# Anzahl, Größe und Anordnung der Icons.
#
# Usage:
#   ./cut_icons.sh <sprite.png> <output_dir> [output_size] [name1 name2 ...]
#
#   output_size   Ausgabegröße in Pixel, quadratisch (default: 512)
#   name1 name2   Dateinamen der Icons in der Reihenfolge ihrer Erkennung
#                 (links→rechts, oben→unten). Ohne Namen: icon_1, icon_2, ...
#
# Beispiele:
#   ./cut_icons.sh app/public/icons/attr/clean/info.png out/ 512 age height weight
#   ./cut_icons.sh app/public/icons/attr/clean/attribute.png out/ 512 kk ge au ch in mb atn pa atd ini le gg
#
# Abhängigkeiten: ImageMagick 7 (magick), bash

set -euo pipefail

SPRITE="${1:?Verwendung: cut_icons.sh <sprite.png> <output_dir> [output_size] [name1 ...]}"
OUT_DIR="${2:?Fehlender output_dir}"
OUT_SIZE="${3:-512}"
shift 3 2>/dev/null || { shift $# 2>/dev/null; true; }

# Fuzz-Schwelle für Hintergrunddetektion (% von 255)
# Höher = aggressiver; muss kleiner sein als der Abstand vom
# Hintergrundgrau (~245) zur dunkelsten Icon-Farbe (~160 bei beige Icons)
FUZZ=15
# Minimale Fläche (px²) damit eine Komponente als Icon gilt (filtert Artefakte)
MIN_AREA=5000
# Gleichmäßiger Rand um jeden erkannten Icon hinzufügen (px, vor Quadrierung)
PADDING=4

mkdir -p "$OUT_DIR"

read -r TOTAL_W TOTAL_H < <(magick identify -format "%w %h\n" "$SPRITE")
echo "Sprite: ${TOTAL_W}×${TOTAL_H} — ${SPRITE##*/}"
echo "Ausgabe: ${OUT_DIR}/ @ ${OUT_SIZE}×${OUT_SIZE}px, fuzz=${FUZZ}%"
echo ""

# ── Schritt 1: Hintergrund entfernen ──────────────────────────────────────────
# Flood-Fill von allen 4 Ecken + allen 4 Kantenmittelpunkten um sicherzustellen
# dass auch ein konkaver Hintergrund vollständig entfernt wird.
MASK_FILE="$(mktemp /tmp/mask_XXXXXX.png)"
trap 'rm -f "$MASK_FILE"' EXIT

magick "$SPRITE" \
  -alpha set \
  -fuzz "${FUZZ}%" \
  -draw "color 0,0 floodfill" \
  -draw "color $(( TOTAL_W-1 )),0 floodfill" \
  -draw "color 0,$(( TOTAL_H-1 )) floodfill" \
  -draw "color $(( TOTAL_W-1 )),$(( TOTAL_H-1 )) floodfill" \
  -draw "color $(( TOTAL_W/2 )),0 floodfill" \
  -draw "color $(( TOTAL_W/2 )),$(( TOTAL_H-1 )) floodfill" \
  -draw "color 0,$(( TOTAL_H/2 )) floodfill" \
  -draw "color $(( TOTAL_W-1 )),$(( TOTAL_H/2 )) floodfill" \
  "$MASK_FILE"

# ── Schritt 2: Connected Components finden ────────────────────────────────────
# -connected-components gibt mit verbose=true Bounding Boxes aus
CC_OUTPUT=$(magick "$MASK_FILE" \
  -channel alpha -separate +channel \
  -negate \
  -define connected-components:verbose=true \
  -define connected-components:area-threshold="${MIN_AREA}" \
  -connected-components 8 \
  -auto-level \
  /dev/null 2>&1 || true)

# Format der Ausgabe: "  ID: WxH+X+Y ..."
# Wir extrahieren nur Zeilen mit Bounding Boxes und sortieren nach Y, dann X (oben→unten, links→rechts)
BBOXES=$(echo "$CC_OUTPUT" \
  | grep -oP '\d+x\d+\+\d+\+\d+' \
  | sort -t'+' -k3 -n -k2 -n \
  | head -100)

if [[ -z "$BBOXES" ]]; then
  echo "FEHLER: Keine Icons gefunden. Probiere höheren fuzz-Wert (aktuell: ${FUZZ}%)."
  exit 1
fi

COUNT=$(echo "$BBOXES" | wc -l)
echo "Erkannte Komponenten: $COUNT"
echo ""

# ── Schritt 3: Jeden erkannten Icon präzise ausschneiden ──────────────────────
idx=0
while IFS= read -r bbox; do
  (( idx++ ))

  if [[ $# -gt 0 ]]; then
    NAME="$1"; shift
  else
    NAME="icon_${idx}"
  fi

  # bbox = WxH+X+Y
  W="${bbox%%x*}"
  rest="${bbox#*x}"
  H="${rest%%+*}"
  rest="${rest#*+}"
  X="${rest%%+*}"
  Y="${rest#*+}"

  AREA=$(( W * H ))
  echo "  [${idx}] ${NAME}: ${W}×${H}+${X}+${Y} (${AREA}px²)"

  # Padding hinzufügen, innerhalb der Sprite-Grenzen bleiben
  PX=$(( X > PADDING ? X - PADDING : 0 ))
  PY=$(( Y > PADDING ? Y - PADDING : 0 ))
  PW=$(( W + 2*PADDING ))
  PH=$(( H + 2*PADDING ))
  [[ $(( PX + PW )) -gt $TOTAL_W ]] && PW=$(( TOTAL_W - PX ))
  [[ $(( PY + PH )) -gt $TOTAL_H ]] && PH=$(( TOTAL_H - PY ))

  # Aus Original-Sprite schneiden (nicht aus der Maske!) →
  # Flood-Fill Hintergrund → trimmen → quadratisch → skalieren
  magick "$MASK_FILE" \
    -crop "${PW}x${PH}+${PX}+${PY}" +repage \
    -trim +repage \
    -gravity center \
    -background none \
    -extent "%[fx:max(w,h)]x%[fx:max(w,h)]" \
    -resize "${OUT_SIZE}x${OUT_SIZE}" \
    "${OUT_DIR}/${NAME}.png"

  echo "     → ${OUT_DIR}/${NAME}.png ✓"

done <<< "$BBOXES"

echo ""
echo "Fertig: ${idx} Icons in ${OUT_DIR}/"
