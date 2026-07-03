import type { ColorZone } from '../components/ui/SpiderChart';

// 12 colors — rainbow spectrum, strict primary/combat alternation.
// Even positions (0,2,4,6,8,10) = primary; odd (1,3,5,7,9,11) = combat.
// Canonical palette for all 12 attribute/derived values — used app-wide.
export const RADAR_COLORS = {
  KK:  '#E03838',  // 0°   warm red    – Körperkraft (Stärke, Kraft)
  INI: '#E06828',  // 30°  orange      – Initiative (Reaktion, Schnelligkeit)
  GE:  '#D4A820',  // 60°  amber       – Geschicklichkeit (Präzision, Gold)
  PA:  '#98C818',  // 90°  chartreuse  – Parade (defensiv, Alert)
  AU:  '#28B040',  // 120° green       – Ausdauer (Vitalität, Natur)
  LE:  '#18A868',  // 150° sea-green   – Lebensenergie (Heilung, Leben)
  IN:  '#10A8D0',  // 180° cyan        – Intelligenz (Verstand, Klarheit)
  GG:  '#2870D8',  // 210° blue        – Geist. Gesundheit (Psyche, Tiefe)
  MB:  '#5040C8',  // 240° indigo      – Ment. Belastbarkeit (Willenskraft)
  ATD: '#8828C0',  // 270° violet      – Attacke Distanz (Weite, Kraft)
  CH:  '#C82888',  // 300° magenta     – Charme (sozial, Persönlichkeit)
  ATN: '#B82030',  // 330° deep garnet – Attacke Nahkampf (dunkel, intensiv)
} as const;

export const RADAR_AXES = [
  { key: 'KK',  color: RADAR_COLORS.KK,  maxValue: 20  },
  { key: 'ATN', color: RADAR_COLORS.ATN, maxValue: 20  },
  { key: 'GE',  color: RADAR_COLORS.GE,  maxValue: 20  },
  { key: 'PA',  color: RADAR_COLORS.PA,  maxValue: 20  },
  { key: 'AU',  color: RADAR_COLORS.AU,  maxValue: 20  },
  { key: 'LE',  color: RADAR_COLORS.LE,  maxValue: 180 },
  { key: 'IN',  color: RADAR_COLORS.IN,  maxValue: 20  },
  { key: 'GG',  color: RADAR_COLORS.GG,  maxValue: 240 },
  { key: 'MB',  color: RADAR_COLORS.MB,  maxValue: 20  },
  { key: 'ATD', color: RADAR_COLORS.ATD, maxValue: 20  },
  { key: 'CH',  color: RADAR_COLORS.CH,  maxValue: 20  },
  { key: 'INI', color: RADAR_COLORS.INI, maxValue: 20  },
] as const;

export const COLOR_ZONES: ColorZone[] = [
  { from: 0,  to: 5,  color: '#5878A0', opacity: 0.07 },
  { from: 5,  to: 14, color: '#8898A8', opacity: 0.05 },
  { from: 14, to: 18, color: '#C89020', opacity: 0.10 },
  { from: 18, to: 20, color: '#C83020', opacity: 0.13 },
];

export function probColor(pct: number | null): string {
  if (pct === null) return '#888';
  if (pct >= 80) return '#4FA968';
  if (pct >= 50) return '#C89020';
  return '#C84820';
}
