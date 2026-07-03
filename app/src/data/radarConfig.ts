import type { ColorZone } from '../components/ui/SpiderChart';

export const RADAR_COLORS = {
  KK:  '#D1453B', GE:  '#3E7FCE', AU:  '#4FA968',
  CH:  '#D45C95', IN:  '#8C5FC4', MB:  '#7030B0',
  ATN: '#C4881C', PA:  '#2DB38C', ATD: '#4CAED8', INI: '#88C040',
  LE:  '#208838', GG:  '#1898A0',
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
