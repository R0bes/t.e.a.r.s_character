import type { Character, TalentCategory } from '../types/character';
import { PROFESSION_MAP, VARIABLE_PTS } from '../data/professions';
import { TALENT_CATEGORY_OF } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';

export const BASE_TALENT_PTS = 10;

function getCategoryOf(character: Character, name: string): TalentCategory | undefined {
  const builtin = TALENT_CATEGORY_OF[name];
  if (builtin) return builtin;
  return character.customTalents?.find(t => t.name === name)?.category;
}

function getCostMultiplierOf(character: Character, name: string): 1 | 2 {
  const cat = getCategoryOf(character, name);
  if (cat === 'kampf') return 2;
  const custom = character.customTalents?.find(t => t.name === name);
  return custom?.costMultiplier ?? 1;
}

export function talentJobPts(character: Character, cat: TalentCategory): number {
  if (!character.profession) return 0;
  const prof = PROFESSION_MAP[character.profession];
  return prof?.talentPts[cat] ?? 0;
}

export function talentSpecBonus(character: Character, cat: TalentCategory): number {
  let bonus = 0;
  // specHobby1 is excluded — its modifier doesn't affect talent points
  const specs = [character.specProfession, character.specFreePositive, character.specFreeNegative];
  for (const spec of specs) {
    if (spec && spec.category === cat) {
      bonus -= spec.modifier; // modifier>0 = malus → reduce pts; modifier<0 = bonus → add pts
    }
  }
  return bonus;
}

export function talentAvailable(character: Character, cat: TalentCategory): number {
  return BASE_TALENT_PTS + talentJobPts(character, cat) + talentSpecBonus(character, cat);
}

/** Fixed bonus points that go directly to a specific talent (not to the category budget) */
export function talentFixedBonus(character: Character, talentName: string): number {
  let bonus = 0;
  if (character.professionTalent === talentName) bonus += 5;
  if (character.hobby1Talent === talentName) bonus += 5;
  if (character.hobby2Talent === talentName) bonus += 3;
  return bonus;
}

export function talentSpent(character: Character, cat: TalentCategory): number {
  let total = 0;
  for (const [name, value] of Object.entries(character.talents)) {
    if (getCategoryOf(character, name) === cat && value) {
      total += value * getCostMultiplierOf(character, name);
    }
  }
  return total;
}

export function talentLeft(character: Character, cat: TalentCategory): number {
  return talentAvailable(character, cat) - talentSpent(character, cat);
}

export function varPtsSpent(character: Character): number {
  return character.specialAbilities.reduce((sum, id) => {
    return sum + (ABILITY_MAP[id]?.cost ?? 0);
  }, 0);
}

export function varPtsLeft(character: Character): number {
  return VARIABLE_PTS - varPtsSpent(character);
}

export function talentCanIncrease(character: Character, talentName: string): boolean {
  const cat = getCategoryOf(character, talentName);
  if (!cat) return false;
  const left = talentLeft(character, cat);
  const mul = getCostMultiplierOf(character, talentName);
  return left >= mul;
}

export function talentCanDecrease(character: Character, talentName: string): boolean {
  return (character.talents[talentName] ?? 0) > 0;
}

// Re-export for components that need it
export { getCategoryOf };
