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
}

export const ATTRIBUTES: AttributeMeta[] = [
  { key: 'KK', name: 'Körperkraft',          shortName: 'KK', color: '#D1453B', tailwindColor: 'kk' },
  { key: 'GE', name: 'Geschicklichkeit',      shortName: 'GE', color: '#3E7FCE', tailwindColor: 'ge' },
  { key: 'AU', name: 'Ausdauer',              shortName: 'AU', color: '#4FA968', tailwindColor: 'au' },
  { key: 'CH', name: 'Charme',                shortName: 'CH', color: '#D45C95', tailwindColor: 'ch' },
  { key: 'IN', name: 'Intelligenz',           shortName: 'IN', color: '#8C5FC4', tailwindColor: 'in' },
  { key: 'MB', name: 'Ment. Belastbarkeit',   shortName: 'MB', color: '#E08C3C', tailwindColor: 'mb' },
];

export const ATTR_MAP = Object.fromEntries(
  ATTRIBUTES.map(a => [a.key, a])
) as Record<AttributeKey, AttributeMeta>;

export function freshAttributes(): Record<AttributeKey, number> {
  return { KK: ATTR_BASE, GE: ATTR_BASE, AU: ATTR_BASE, CH: ATTR_BASE, IN: ATTR_BASE, MB: ATTR_BASE };
}
