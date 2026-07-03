import type { Character, Specification, TalentCategory } from '../types/character';
import { PROFESSION_MAP, VARIABLE_PTS } from '../data/professions';
import { TALENT_CATEGORY_OF } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';

export const BASE_TALENT_PTS = 10;

export function getCategoryOf(character: Character, name: string): TalentCategory | undefined {
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
      bonus += spec.modifier; // modifier>0 = neg. spec (malus) → +TP compensation; modifier<0 = pos. spec → costs TP
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

export function talentSpecBonusBreakdown(character: Character, cat: TalentCategory): {
  job: number; spec: number; total: number;
} {
  const job  = talentJobPts(character, cat);
  const spec = talentSpecBonus(character, cat);
  return { job, spec, total: BASE_TALENT_PTS + job + spec };
}

const ALL_CATS: TalentCategory[] = ['koerperlich', 'motorisch', 'geistig', 'sozial', 'kampf'];

/**
 * Reduce distributed talent points in a category until spent <= available.
 * Subtracts 1 point at a time from each talent in the category (round-robin).
 */
function clampCategory(character: Character, cat: TalentCategory): void {
  let overflow = talentSpent(character, cat) - talentAvailable(character, cat);
  if (overflow <= 0) return;
  while (overflow > 0) {
    let anyReduced = false;
    for (const [name, val] of Object.entries(character.talents)) {
      if (overflow <= 0) break;
      if ((val ?? 0) > 0 && getCategoryOf(character, name) === cat) {
        character.talents[name] = (val ?? 0) - 1;
        overflow -= getCostMultiplierOf(character, name);
        anyReduced = true;
      }
    }
    if (!anyReduced) break;
  }
}

/** Call after any budget-affecting change (profession, spec) to keep distribution valid. */
export function clampAllCategories(character: Character): void {
  for (const cat of ALL_CATS) clampCategory(character, cat);
}

/**
 * Returns false if adding `spec` (optionally replacing `replacing`) would make
 * talentAvailable < 0 for the spec's category. Specs with modifier >= 0 are always fine.
 */
export function canAddSpec(
  character: Character,
  spec: Specification,
  replacing: Specification | null = null,
): boolean {
  if (spec.modifier >= 0) return true;
  // talentAvailable already includes replacing.modifier (it's in the character state).
  // New available = current + (spec.modifier - replacing.modifier)
  const delta = spec.modifier - (replacing?.modifier ?? 0);
  return talentAvailable(character, spec.category) + delta >= 0;
}
