import type { TalentCategory } from '../types/character';

export interface SpecificationMeta {
  name: string;
  modifier: number;      // positive = negativ für Charakter; negativ = positiv
  description: string;
  category: TalentCategory;
}

export const SPECIFICATIONS: SpecificationMeta[] = [
  // Körperliche Spezifika
  { name: 'Hautrauf',                  modifier: +5,  category: 'koerperlich', description: 'Stumpfe Waffen richten hin und wieder mehr Schaden an als gedacht.' },
  { name: 'Wurstfinger',               modifier: +3,  category: 'koerperlich', description: 'Feinere Gerätschaften wollen einfach manchmal nicht so wie du.' },
  { name: 'Mehr Bums',                 modifier: -5,  category: 'koerperlich', description: 'Wenn man schon nicht gut trifft, dann wenigstens mit BUMS. Gute Treffer haben dadurch positive Nebeneffekte.' },
  { name: 'Mit einem Bein auf der Hölle', modifier: -10, category: 'koerperlich', description: 'Liegenden Zombies kannst du ganz einfach per Stiefeltritt das Licht ausblasen.' },

  // Kampf-/Waffen-Spezifika
  { name: 'Shake-a-lot',               modifier: +5,  category: 'kampf', description: 'Zittrige Finger und Schusswaffen … Probleme vorprogrammiert.' },
  { name: 'Verdammte Sicherung',        modifier: +3,  category: 'kampf', description: 'Entsichern vergessen … kommt bei dir schon mal vor.' },
  { name: 'Durchatmen',                 modifier: -5,  category: 'kampf', description: 'In schwierigen Situationen wächst du als Schütze hin und wieder über dich hinaus.' },
  { name: 'Querschläger Deluxe',        modifier: -10, category: 'kampf', description: 'Abprallende Kugeln treffen ab und zu überraschend ins Schwarze.' },

  // Motorische Spezifika
  { name: 'Grobmotoriker',              modifier: +5,  category: 'motorisch', description: '„Ich wollte das nicht kaputt machen! Echt nicht!"' },
  { name: 'Schmutzige Finger',          modifier: +3,  category: 'motorisch', description: 'Du bist einfach ein Ferkel. Was du anfasst, sollte man danach desinfizieren!' },
  { name: 'Improvisationstalent',       modifier: -10, category: 'motorisch', description: 'Manchmal kann ein Gerät einfach ganz logisch erscheinen, auch wenn du es nicht kennst.' },
  { name: 'Noch mal auf Anfang',        modifier: -5,  category: 'motorisch', description: '„Falsch gemacht" heißt bei dir nicht auch immer gleich „kaputt gemacht". Schraubereien kannst du so hin und wieder nochmal versuchen.' },

  // Geistige Spezifika
  { name: 'Schussel',                   modifier: +5,  category: 'geistig', description: 'Ich kann mich einfach nicht erinnern.' },
  { name: 'WirrWarr',                   modifier: +3,  category: 'geistig', description: 'Manchmal bringst du etwas durcheinander – auch wenn man es besser nicht durcheinander bringen sollte.' },
  { name: 'Harte Nuss',                 modifier: -10, category: 'geistig', description: 'Der erste Anlauf war nichts. Aber ein großer Geist versucht Denkaufgaben einfach nochmal.' },
  { name: 'Querdenker',                 modifier: -5,  category: 'geistig', description: '„Ich habe da mal was gehört, das hat zumindest grundlegend hiermit was zu tun" – so kannst du manchmal Unwissen durch anderes Wissen wettmachen.' },

  // Soziale Spezifika
  { name: 'Sturkopf',                   modifier: +5,  category: 'sozial', description: '„Es ist mir ganz egal, was du sagst! ICH HABE RECHT!"' },
  { name: 'Lustmolch',                  modifier: +3,  category: 'sozial', description: 'Du bist, was du bist …' },
  { name: 'Gier',                       modifier: +3,  category: 'sozial', description: '„Du kannst damit spielen, wenn ich fertig bin!"' },
  { name: 'Promibonus',                 modifier: -10, category: 'sozial', description: 'Du siehst jemandem verdammt ähnlich. Das hilft gerade im Umgang mit simplen Geistern.' },
  { name: 'Respektsperson',             modifier: -5,  category: 'sozial', description: 'Was du tust und getan hast, verleiht dir enormes Ansehen. Du kannst auch mal das Falsche sagen und es dennoch ins Gute verkehren. Soziale Prüfungen können auch im zweiten Anlauf gelingen.' },
];

export const CAT_LABEL: Record<TalentCategory, string> = {
  koerperlich: 'Körperlich',
  motorisch:   'Motorisch',
  geistig:     'Geistig',
  sozial:      'Sozial',
  kampf:       'Kampf/Waffen',
};

export function getSpecsByCategory(cat: TalentCategory): SpecificationMeta[] {
  return SPECIFICATIONS.filter(s => s.category === cat);
}

export function isNegativeSpec(s: { modifier: number }): boolean {
  return s.modifier > 0;
}

export function isPositiveSpec(s: { modifier: number }): boolean {
  return s.modifier < 0;
}
