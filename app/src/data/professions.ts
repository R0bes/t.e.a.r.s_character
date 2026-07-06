import type { AttributeKey, ProfessionKey, TalentCategory } from '../types/character';

export const VARIABLE_PTS = 5;

export interface ProfessionMeta {
  key: ProfessionKey;
  label: string;
  labelSingular: string;
  icon: string;
  color: string;
  attrMin: Partial<Record<AttributeKey, number>>;
  talentPts: Partial<Record<TalentCategory, number>>;
}

export const PROFESSIONS: ProfessionMeta[] = [
  {
    key: 'koerperlich',
    label: 'Körperliche Berufe',
    labelSingular: 'Körperlicher Beruf',
    icon: '/icons/attr/prof_koerperlich.svg',
    color: '#8B4123',
    attrMin: { KK: 13, AU: 11 },
    talentPts: { koerperlich: 30, motorisch: 10 },
  },
  {
    key: 'handwerklich',
    label: 'Handwerkliche Berufe',
    labelSingular: 'Handwerklicher Beruf',
    icon: '/icons/attr/prof_handwerklich.svg',
    color: '#8C6A1D',
    attrMin: { GE: 13, KK: 11 },
    talentPts: { motorisch: 30, koerperlich: 10 },
  },
  {
    key: 'kundenkontakt',
    label: 'Kundenkontaktberufe',
    labelSingular: 'Kundenkontaktberuf',
    icon: '/icons/attr/prof_kundenkontakt.svg',
    color: '#29707A',
    attrMin: { CH: 13, GE: 11 },
    talentPts: { sozial: 30, motorisch: 10 },
  },
  {
    key: 'kreativ',
    label: 'Kreative Berufe',
    labelSingular: 'Kreativer Beruf',
    icon: '/icons/attr/prof_kreativ.svg',
    color: '#7A3560',
    attrMin: { MB: 13, IN: 11 },
    talentPts: { geistig: 20, motorisch: 10, sozial: 10 },
  },
  {
    key: 'denkend',
    label: 'Denkende Berufe',
    labelSingular: 'Denkender Beruf',
    icon: '/icons/attr/prof_denkend.svg',
    color: '#2F4F6B',
    attrMin: { IN: 13, MB: 11 },
    talentPts: { geistig: 30, sozial: 10 },
  },
  {
    key: 'militaerisch',
    label: 'Militärische Berufe',
    labelSingular: 'Militärischer Beruf',
    icon: '/icons/attr/prof_militaerisch.svg',
    color: '#5C6B22',
    attrMin: { AU: 12, GE: 12 },
    talentPts: { kampf: 30, motorisch: 10 },
  },
  {
    key: 'medizinisch',
    label: 'Medizinische Berufe',
    labelSingular: 'Medizinischer Beruf',
    icon: '/icons/attr/prof_medizinisch.svg',
    color: '#2E6B54',
    attrMin: { GE: 13, IN: 11 },
    talentPts: { motorisch: 20, geistig: 10, sozial: 10 },
  },
  {
    key: 'arbeitslos',
    label: 'Arbeitslose / Schüler / Studenten',
    labelSingular: 'Schüler / Student / Arbeitslos',
    icon: '/icons/attr/prof_arbeitslos.svg',
    color: '#5B3E7A',
    attrMin: { AU: 11, CH: 11, IN: 9, GE: 9 },
    talentPts: { sozial: 10, geistig: 10, motorisch: 10, koerperlich: 5, kampf: 5 },
  },
];

export const PROFESSION_MAP = Object.fromEntries(
  PROFESSIONS.map(p => [p.key, p])
) as Record<ProfessionKey, ProfessionMeta>;
