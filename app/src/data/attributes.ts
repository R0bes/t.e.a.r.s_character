import type { AttributeKey } from '../types/character';

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
  { key: 'KK', name: 'Körperkraft',          shortName: 'KK', color: '#CC2828', tailwindColor: 'kk', icon: '/icons/attr/kk.png' },
  { key: 'GE', name: 'Geschicklichkeit',      shortName: 'GE', color: '#C89A10', tailwindColor: 'ge', icon: '/icons/attr/ge.png' },
  { key: 'AU', name: 'Ausdauer',              shortName: 'AU', color: '#D05020', tailwindColor: 'au', icon: '/icons/attr/au.png' },
  { key: 'CH', name: 'Charme',                shortName: 'CH', color: '#CC2888', tailwindColor: 'ch', icon: '/icons/attr/ch.png' },
  { key: 'IN', name: 'Intelligenz',           shortName: 'IN', color: '#1E58C8', tailwindColor: 'in', icon: '/icons/attr/in.png' },
  { key: 'MB', name: 'Ment. Belastbarkeit',   shortName: 'MB', color: '#7030B0', tailwindColor: 'mb', icon: '/icons/attr/mb.png' },
];

export const ATTR_MAP = Object.fromEntries(
  ATTRIBUTES.map(a => [a.key, a])
) as Record<AttributeKey, AttributeMeta>;

export function freshAttributes(): Record<AttributeKey, number> {
  return { KK: ATTR_BASE, GE: ATTR_BASE, AU: ATTR_BASE, CH: ATTR_BASE, IN: ATTR_BASE, MB: ATTR_BASE };
}
