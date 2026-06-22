'use strict';

const ATTR_KEYS = ['KK', 'AU', 'GE', 'IN', 'CH', 'MB'];
const ATTR_NAMES = {
  KK: 'Körperkraft',
  AU: 'Ausdauer',
  GE: 'Geschicklichkeit',
  IN: 'Intelligenz',
  CH: 'Charme',
  MB: 'Ment. Belastbarkeit',
};
const ATTR_BASE = 8;
const ATTR_MAX  = 19;
const ATTR_FREE = 14; // free points to distribute on top of job minimums

// ── BERUFSKATEGORIEN ──────────────────────────────────────────────────────────
// attrMin: minimum attribute values granted by this job category (rest start at 8)
// talentPts: talent points per category
const BERUFSKAT = {
  koerperlich: {
    label: 'Körperliche Berufe',
    attrMin: { KK: 13, AU: 11 },
    talentPts: { koerperlich: 30, motorisch: 10 },
  },
  handwerklich: {
    label: 'Handwerkliche Berufe',
    attrMin: { GE: 13, KK: 11 },
    talentPts: { motorisch: 30, koerperlich: 10 },
  },
  kundenkontakt: {
    label: 'Kundenkontaktberufe',
    attrMin: { CH: 13, GE: 11 },
    talentPts: { sozial: 30, motorisch: 10 },
  },
  kreativ: {
    label: 'Kreative Berufe',
    attrMin: { MB: 13, IN: 11 },
    talentPts: { geistig: 20, motorisch: 10, sozial: 10 },
  },
  denkend: {
    label: 'Denkende Berufe',
    attrMin: { IN: 13, MB: 11 },
    talentPts: { geistig: 30, sozial: 10 },
  },
  militaerisch: {
    label: 'Militärische Berufe',
    attrMin: { AU: 12, GE: 12 },
    talentPts: { kampf: 30, motorisch: 10 },
  },
  medizinisch: {
    label: 'Medizinische Berufe',
    attrMin: { GE: 13, IN: 11 },
    talentPts: { motorisch: 20, geistig: 10, sozial: 10 },
  },
  arbeitslos: {
    label: 'Arbeitslose / Schüler / Studenten',
    attrMin: { AU: 11, CH: 11, IN: 9, GE: 9 },
    talentPts: { sozial: 10, geistig: 10, motorisch: 10, koerperlich: 5, kampf: 5 },
  },
};
const BERUFSKAT_KEYS = Object.keys(BERUFSKAT);
const VARIABLE_PTS = 5; // every job gives 5 variable talent points (for Führerscheine etc.)

// ── TALENT CATEGORIES ─────────────────────────────────────────────────────────
const TALENT_CATS = {
  koerperlich: {
    label: 'Körperliche Talente',
    chipLabel: 'KÖRP',
    talents: [
      { n: 'Laufen',      a: 'AU/KK/AU' },
      { n: 'Klettern',    a: 'KK/AU/KK' },
      { n: 'Schwimmen',   a: 'KK/AU/AU' },
      { n: 'Springen',    a: 'KK/GE/AU' },
      { n: 'Werfen',      a: 'KK/KK/GE' },
      { n: 'Balancieren', a: 'GE/GE/AU' },
    ],
  },
  motorisch: {
    label: 'Motorische Talente',
    chipLabel: 'MOTO',
    talents: [
      { n: 'Erste Hilfe',       a: 'IN/GE/GE' },
      { n: 'Fahren',            a: 'GE/GE/MB' },
      { n: 'Reiten',            a: 'GE/GE/AU' },
      { n: 'Spurenlesen',       a: 'IN/MB/MB' },
      { n: 'Fliegen',           a: 'MB/GE/GE' },
      { n: 'Tiere Zähmen',      a: 'CH/IN/MB' },
      { n: 'Schlösser Knacken', a: 'GE/GE/IN' },
      { n: 'Schleichen',        a: 'GE/GE/AU' },
      { n: 'Bogenbau',          a: 'GE/GE/IN' },
      { n: 'Schmieden',         a: 'GE/KK/GE' },
      { n: 'Tischlern',         a: 'GE/GE/KK' },
      { n: 'Maurern',           a: 'KK/KK/GE' },
      { n: 'Zeichnen',          a: 'GE/GE/MB' },
      { n: 'Mechanik',          a: 'GE/IN/IN' },
      { n: 'Technik',           a: 'MB/IN/IN' },
    ],
  },
  geistig: {
    label: 'Geistige Talente',
    chipLabel: 'GEIS',
    talents: [
      { n: 'Chemie',              a: 'IN/IN/MB' },
      { n: 'Physik',              a: 'IN/IN/MB' },
      { n: 'Biologie',            a: 'IN/IN/MB' },
      { n: 'Medizin',             a: 'IN/IN/MB' },
      { n: 'Mathematik',          a: 'IN/IN/MB' },
      { n: 'Meteorologie',        a: 'IN/MB/IN' },
      { n: 'Botanik',             a: 'IN/IN/MB' },
      { n: 'Literatur',           a: 'IN/IN/IN' },
      { n: 'Überlebenstechniken', a: 'IN/MB/MB' },
      { n: 'Urbanes Wissen',      a: 'IN/MB/MB' },
      { n: 'Ländliches Wissen',   a: 'IN/MB/MB' },
    ],
  },
  sozial: {
    label: 'Soziale Talente',
    chipLabel: 'SOZI',
    talents: [
      { n: 'Beruhigen',           a: 'CH/CH/IN' },
      { n: 'Manipulieren',        a: 'CH/IN/IN' },
      { n: 'Bedrohen',            a: 'CH/MB/MB' },
      { n: 'Überreden',           a: 'IN/CH/CH' },
      { n: 'Betören',             a: 'GE/IN/MB' },
      { n: 'Feilschen',           a: 'CH/CH/CH' },
      { n: 'Lügen',               a: 'CH/IN/IN' },
      { n: 'Menschenkenntnis',    a: 'IN/IN/MB' },
      { n: 'Begeistern / Führen', a: 'CH/CH/MB' },
    ],
  },
  kampf: {
    label: 'Kampf & Waffen',
    chipLabel: 'KAMP',
    talents: [
      { n: 'Ringen / Faustkampf',  a: '' },
      { n: 'Nahkampfwaffen stumpf', a: '' },
      { n: 'Nahkampfwaffen spitz',  a: '' },
      { n: 'Klingenwaffen',         a: '' },
      { n: 'Wurfwaffen',            a: '' },
      { n: 'Pistolen',              a: '' },
      { n: 'Gewehre',               a: '' },
      { n: 'Bögen',                 a: '' },
      { n: 'Kampfsport',            a: '' },
    ],
  },
};

const TALENT_CAT_KEYS = Object.keys(TALENT_CATS);

// talent name → category key lookup
const TALENT_CAT_OF = {};
for (const [cat, data] of Object.entries(TALENT_CATS))
  for (const t of data.talents)
    TALENT_CAT_OF[t.n] = cat;

// ── TALENT LEVELS ─────────────────────────────────────────────────────────────
function talentLevel(v) {
  if (v === 0)   return { label: 'Ungelernt',            cls: '' };
  if (v <= 4)    return { label: 'Mehr schlecht als recht', cls: 'tlv-low' };
  if (v <= 9)    return { label: 'Solide Kenntnisse',    cls: 'tlv-mid' };
  return           { label: 'Profi',                  cls: 'tlv-pro' };
}

// ── FÜHRERSCHEINE ─────────────────────────────────────────────────────────────
const FUEHRERSCHEINE = [
  { n: 'PKW',                  cost: 3  },
  { n: 'PKW + Motorrad',       cost: 5  },
  { n: 'Segelschein',          cost: 12 },
  { n: 'Kleinflugzeug',        cost: 12 },
  { n: 'Spezialführerschein',  cost: 25 },
];
