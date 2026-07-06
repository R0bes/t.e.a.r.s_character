import type { ColorZone } from '../components/ui/SpiderChart';

// 12 colors — rainbow spectrum, strict primary/combat alternation.
// Even positions (0,2,4,6,8,10) = primary; odd (1,3,5,7,9,11) = combat.
// Canonical palette for all 12 attribute/derived values — used app-wide.
export const RADAR_COLORS = {
  KK:  '#8B2E22',  // 0°   warm red    – Körperkraft (Stärke, Kraft)
  INI: '#97501F',  // 30°  orange      – Initiative (Reaktion, Schnelligkeit)
  GE:  '#8C6A1D',  // 60°  amber       – Geschicklichkeit (Präzision, Gold)
  PA:  '#6B7A22',  // 90°  chartreuse  – Parade (defensiv, Alert)
  AU:  '#3F6B3A',  // 120° green       – Ausdauer (Vitalität, Natur)
  LE:  '#2E6B54',  // 150° sea-green   – Lebensenergie (Heilung, Leben)
  IN:  '#29707A',  // 180° cyan        – Intelligenz (Verstand, Klarheit)
  GG:  '#2F4F6B',  // 210° blue        – Geist. Gesundheit (Psyche, Tiefe)
  MB:  '#3F3E7A',  // 240° indigo      – Ment. Belastbarkeit (Willenskraft)
  ATD: '#5B3E7A',  // 270° violet      – Attacke Distanz (Weite, Kraft)
  CH:  '#7A3560',  // 300° magenta     – Charme (sozial, Persönlichkeit)
  ATN: '#6B1F2C',  // 330° deep garnet – Attacke Nahkampf (dunkel, intensiv)
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
  { from: 0,  to: 5,  color: '#6B7F94', opacity: 0.10 },
  { from: 5,  to: 14, color: '#93887A', opacity: 0.07 },
  { from: 14, to: 18, color: '#8C6A1D', opacity: 0.13 },
  { from: 18, to: 20, color: '#8B2E22', opacity: 0.15 },
];

export function probColor(pct: number | null): string {
  if (pct === null) return '#9C8560';
  if (pct >= 80) return '#3F6B3A';
  if (pct >= 50) return '#A6742A';
  return '#8B2E22';
}
