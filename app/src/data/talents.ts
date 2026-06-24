import type { AttributeKey, TalentCategory } from '../types/character';

export interface TalentMeta {
  name: string;
  category: TalentCategory;
  attrs: [AttributeKey, AttributeKey, AttributeKey] | null;
  costMultiplier: 1 | 2;
}

export interface TalentCategoryMeta {
  key: TalentCategory;
  label: string;
  color: string;
  tailwindColor: string;
  icon: string;
  talents: TalentMeta[];
}

export const CAT_ICONS: Record<TalentCategory, string> = {
  koerperlich: '/icons/attr/kat_koerperlich.png',
  motorisch:   '/icons/attr/kat_motorisch.png',
  geistig:     '/icons/attr/kat_geistig.png',
  sozial:      '/icons/attr/kat_sozial.png',
  kampf:       '/icons/attr/kat_kampf.png',
};

function t(
  name: string,
  category: TalentCategory,
  attrStr: string,
  costMul?: 2,
): TalentMeta {
  const attrs = attrStr
    ? (attrStr.split('/') as [AttributeKey, AttributeKey, AttributeKey])
    : null;
  const costMultiplier: 1 | 2 = costMul ?? (category === 'kampf' || attrs === null ? 2 : 1);
  return { name, category, attrs, costMultiplier };
}

export const TALENT_CATEGORIES: TalentCategoryMeta[] = [
  {
    key: 'koerperlich',
    label: 'Körperliche Talente',
    color: '#C84820',
    tailwindColor: 'cat-physical',
    icon: '/icons/attr/kat_koerperlich.png',
    talents: [
      t('Ringen / Faustkampf',  'koerperlich', ''),
      t('Nahkampfwaffen stumpf', 'koerperlich', ''),
      t('Schleichen',            'koerperlich', 'KK/AU/GE'),
      t('Springen',              'koerperlich', 'KK/KK/AU'),
      t('Klettern',              'koerperlich', 'KK/KK/GE'),
      t('Zechen',                'koerperlich', 'KK/AU/AU'),
      t('Werfen',                'koerperlich', 'KK/GE/GE'),
      t('Schwimmen',             'koerperlich', 'KK/KK/AU'),
      t('Schmerz ertragen',      'koerperlich', 'AU/AU/MB'),
      t('Immunsystem',           'koerperlich', 'KK/AU/AU'),
    ],
  },
  {
    key: 'motorisch',
    label: 'Motorische Talente',
    color: '#C89010',
    tailwindColor: 'cat-motoric',
    icon: '/icons/attr/kat_motorisch.png',
    talents: [
      t('Mechanik / Basteln',  'motorisch', 'KK/GE/GE'),
      t('Feuer machen',        'motorisch', 'GE/GE/IN'),
      t('Kochen',              'motorisch', 'GE/GE/IN'),
      t('Nähen',               'motorisch', 'GE/GE/IN'),
      t('Fallenstellen',       'motorisch', 'KK/AU/GE'),
      t('Nahkampfwaffen spitz','motorisch', ''),
      t('Schlösser knacken',   'motorisch', 'GE/GE/IN'),
      t('Wunden versorgen',    'motorisch', 'GE/IN/IN'),
      t('Jagen',               'motorisch', 'KK/GE/IN'),
      t('Fischen',             'motorisch', 'GE/GE/MB'),
    ],
  },
  {
    key: 'geistig',
    label: 'Geistige Talente',
    color: '#2050B0',
    tailwindColor: 'cat-mental',
    icon: '/icons/attr/kat_geistig.png',
    talents: [
      t('Lesen / Schreiben',   'geistig', 'IN/IN/MB'),
      t('Mathematik',          'geistig', 'IN/IN/MB'),
      t('Technisches Wissen',  'geistig', 'GE/IN/IN'),
      t('Mechanisches Wissen', 'geistig', 'GE/IN/IN'),
      t('Überlebenstechniken', 'geistig', 'GE/IN/MB'),
      t('Spurenlesen',         'geistig', 'IN/IN/CH'),
      t('Botanik',             'geistig', 'IN/IN/MB'),
      t('Medizin',             'geistig', 'IN/IN/MB'),
      t('Chemie',              'geistig', 'IN/IN/MB'),
      t('Meteorologie',        'geistig', 'AU/IN/IN'),
    ],
  },
  {
    key: 'sozial',
    label: 'Soziale Talente',
    color: '#189898',
    tailwindColor: 'cat-social',
    icon: '/icons/attr/kat_sozial.png',
    talents: [
      t('Überreden',              'sozial', 'IN/CH/CH'),
      t('Menschenkenntnis',       'sozial', 'IN/CH/CH'),
      t('Lügen',                  'sozial', 'CH/CH/MB'),
      t('Beruhigen / Angst lindern', 'sozial', 'CH/CH/MB'),
      t('Betören',                'sozial', 'KK/CH/CH'),
      t('Begeistern / Führen',    'sozial', 'AU/CH/CH'),
      t('Feilschen',              'sozial', 'CH/MB/MB'),
      t('Manipulieren',           'sozial', 'AU/CH/IN'),
      t('Ländliches Wissen',      'sozial', 'IN/MB/MB'),
      t('Urbanes Wissen',         'sozial', 'CH/MB/MB'),
    ],
  },
  {
    key: 'kampf',
    label: 'Kampf & Waffen',
    color: '#B81818',
    tailwindColor: 'cat-combat',
    icon: '/icons/attr/kat_kampf.png',
    talents: [
      t('Wurfwaffen',              'kampf', ''),
      t('Klingenwaffen',           'kampf', ''),
      t('Schusswaffen Pistolen',   'kampf', ''),
      t('Schusswaffen Gewehre',    'kampf', ''),
      t('Bögen',                   'kampf', ''),
      t('Bogenbau / Pfeilmacherei','kampf', 'AU/GE/GE'),
      t('Waffen reparieren',       'kampf', 'GE/GE/AU'),
      t('Schusswaffenbau',         'kampf', 'GE/GE/AU'),
      t('Kampfsport',              'kampf', ''),
      t('Bombenbau',               'kampf', 'GE/GE/MB'),
    ],
  },
];

export const TALENT_CAT_MAP = Object.fromEntries(
  TALENT_CATEGORIES.map(c => [c.key, c])
) as Record<TalentCategory, TalentCategoryMeta>;

export const TALENT_CATEGORY_OF: Record<string, TalentCategory> = {};
for (const cat of TALENT_CATEGORIES) {
  for (const talent of cat.talents) {
    TALENT_CATEGORY_OF[talent.name] = cat.key;
  }
}

export const TALENT_MAP: Record<string, TalentMeta> = {};
for (const cat of TALENT_CATEGORIES) {
  for (const talent of cat.talents) {
    TALENT_MAP[talent.name] = talent;
  }
}

export function talentLevel(value: number): { label: string; cls: string } {
  if (value === 0) return { label: 'Ungelernt',               cls: 'text-faint' };
  if (value <= 4)  return { label: 'Mehr schlecht als recht', cls: 'text-warn' };
  if (value <= 9)  return { label: 'Solide Kenntnisse',       cls: 'text-muted' };
  return             { label: 'Profi',                     cls: 'text-success' };
}
