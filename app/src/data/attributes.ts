import type { AttributeKey } from '../types/character';
import { RADAR_COLORS } from './radarConfig';

export const ATTR_BASE = 8;
export const ATTR_MAX = 19;
export const ATTR_FREE = 14;

export interface AttributeMeta {
  key: AttributeKey;
  name: string;
  shortName: string;
  color: string;
  tailwindColor: string;
  icon: string;
}

export const ATTRIBUTES: AttributeMeta[] = [
  { key: 'KK', name: 'Körperkraft',          shortName: 'KK', color: RADAR_COLORS.KK, tailwindColor: 'kk', icon: '/icons/attr/kk.svg' },
  { key: 'GE', name: 'Geschicklichkeit',      shortName: 'GE', color: RADAR_COLORS.GE, tailwindColor: 'ge', icon: '/icons/attr/ge.svg' },
  { key: 'AU', name: 'Ausdauer',              shortName: 'AU', color: RADAR_COLORS.AU, tailwindColor: 'au', icon: '/icons/attr/au.svg' },
  { key: 'CH', name: 'Charme',                shortName: 'CH', color: RADAR_COLORS.CH, tailwindColor: 'ch', icon: '/icons/attr/ch.svg' },
  { key: 'IN', name: 'Intelligenz',           shortName: 'IN', color: RADAR_COLORS.IN, tailwindColor: 'in', icon: '/icons/attr/in.svg' },
  { key: 'MB', name: 'Ment. Belastbarkeit',   shortName: 'MB', color: RADAR_COLORS.MB, tailwindColor: 'mb', icon: '/icons/attr/mb.svg' },
];

export const ATTR_MAP = Object.fromEntries(
  ATTRIBUTES.map(a => [a.key, a])
) as Record<AttributeKey, AttributeMeta>;

export function freshAttributes(): Record<AttributeKey, number> {
  return { KK: ATTR_BASE, GE: ATTR_BASE, AU: ATTR_BASE, CH: ATTR_BASE, IN: ATTR_BASE, MB: ATTR_BASE };
}
