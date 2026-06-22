export interface SpecialAbilityMeta {
  id: string;
  name: string;
  cost: number;
}

export const SPECIAL_ABILITIES: SpecialAbilityMeta[] = [
  { id: 'pkw',         name: 'Pkw-Führerschein',   cost: 3  },
  { id: 'pkw_moto',    name: 'Pkw + Motorrad',      cost: 5  },
  { id: 'segel',       name: 'Segelschein',          cost: 12 },
  { id: 'kleinflug',   name: 'Kleinflugzeug',        cost: 12 },
  { id: 'sonder',      name: 'Sonderlizenz',         cost: 25 },
];

export const ABILITY_MAP = Object.fromEntries(
  SPECIAL_ABILITIES.map(a => [a.id, a])
) as Record<string, SpecialAbilityMeta>;
