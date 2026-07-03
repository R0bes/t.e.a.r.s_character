export type AttributeKey = 'KK' | 'GE' | 'AU' | 'CH' | 'IN' | 'MB';

export type TalentCategory = 'koerperlich' | 'motorisch' | 'geistig' | 'sozial' | 'kampf';

export type ProfessionKey =
  | 'koerperlich'
  | 'handwerklich'
  | 'kundenkontakt'
  | 'kreativ'
  | 'denkend'
  | 'militaerisch'
  | 'medizinisch'
  | 'arbeitslos';

export type Screen = 'list' | 'creation' | 'sheet' | 'play';

export interface Specification {
  name: string;
  modifier: number;      // positive value = bad for character; negative = good
  description: string;
  category: TalentCategory;
}

export interface CustomTalent {
  name: string;
  category: TalentCategory;
  attrs: [AttributeKey, AttributeKey, AttributeKey] | null;
  costMultiplier: 1 | 2;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
}

export interface Note {
  id: string;
  text: string;
  timestamp: number;
}

export interface ProbeEntry {
  id: string;
  timestamp: number;
  talentName: string;
  effective: number;
  attrValues: number[];
  rolls: number[];
  totalDiff: number;
  success: boolean;
  remaining: number;
}

export interface Character {
  id: string;
  createdAt: number;
  updatedAt: number;
  info: {
    name: string;
    gender: string;
    age: string;
    height: string;
    weight: string;
    professionName: string;
  };
  profession: ProfessionKey | null;
  attributes: Record<AttributeKey, number>;
  talents: Partial<Record<string, number>>;
  customTalents: CustomTalent[];
  hobby1Name: string;
  hobby2Name: string;
  hobby1Talent: string | null;
  hobby2Talent: string | null;
  professionTalent: string | null;
  specProfession: Specification | null;
  specHobby1: Specification | null;
  specFreePositive: Specification | null;
  specFreeNegative: Specification | null;
  customSpecifications: Specification[];
  specialAbilities: string[];
  // Play mode
  currentLE: number;
  currentGG: number;
  inventory: InventoryItem[];
  notes: Note[];
  probeHistory: ProbeEntry[];
}
