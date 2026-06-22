import type { AttributeKey, ProfessionKey, TalentCategory } from '../types/character';

export const VARIABLE_PTS = 5;

export interface ProfessionMeta {
  key: ProfessionKey;
  label: string;
  attrMin: Partial<Record<AttributeKey, number>>;
  talentPts: Partial<Record<TalentCategory, number>>;
}

export const PROFESSIONS: ProfessionMeta[] = [
  {
    key: 'koerperlich',
    label: 'Körperliche Berufe',
    attrMin: { KK: 13, AU: 11 },
    talentPts: { koerperlich: 30, motorisch: 10 },
  },
  {
    key: 'handwerklich',
    label: 'Handwerkliche Berufe',
    attrMin: { GE: 13, KK: 11 },
    talentPts: { motorisch: 30, koerperlich: 10 },
  },
  {
    key: 'kundenkontakt',
    label: 'Kundenkontaktberufe',
    attrMin: { CH: 13, GE: 11 },
    talentPts: { sozial: 30, motorisch: 10 },
  },
  {
    key: 'kreativ',
    label: 'Kreative Berufe',
    attrMin: { MB: 13, IN: 11 },
    talentPts: { geistig: 20, motorisch: 10, sozial: 10 },
  },
  {
    key: 'denkend',
    label: 'Denkende Berufe',
    attrMin: { IN: 13, MB: 11 },
    talentPts: { geistig: 30, sozial: 10 },
  },
  {
    key: 'militaerisch',
    label: 'Militärische Berufe',
    attrMin: { AU: 12, GE: 12 },
    talentPts: { kampf: 30, motorisch: 10 },
  },
  {
    key: 'medizinisch',
    label: 'Medizinische Berufe',
    attrMin: { GE: 13, IN: 11 },
    talentPts: { motorisch: 20, geistig: 10, sozial: 10 },
  },
  {
    key: 'arbeitslos',
    label: 'Arbeitslose / Schüler / Studenten',
    attrMin: { AU: 11, CH: 11, IN: 9, GE: 9 },
    talentPts: { sozial: 10, geistig: 10, motorisch: 10, koerperlich: 5, kampf: 5 },
  },
];

export const PROFESSION_MAP = Object.fromEntries(
  PROFESSIONS.map(p => [p.key, p])
) as Record<ProfessionKey, ProfessionMeta>;
