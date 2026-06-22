import type { AttributeKey, Character } from '../types/character';
import { ATTR_BASE, ATTR_FREE } from '../data/attributes';
import { PROFESSION_MAP } from '../data/professions';

export function stepCost(from: number): number {
  const to = from + 1;
  if (to <= 14) return 1;
  if (to <= 17) return 2;
  return 3;
}

export function attrJobMin(character: Character, key: AttributeKey): number {
  if (!character.profession) return ATTR_BASE;
  const prof = PROFESSION_MAP[character.profession];
  return prof?.attrMin[key] ?? ATTR_BASE;
}

export function attrFreeCost(character: Character, key: AttributeKey): number {
  const min = attrJobMin(character, key);
  const val = character.attributes[key];
  let cost = 0;
  for (let v = min; v < val; v++) cost += stepCost(v);
  return cost;
}

export function totalAttrSpent(character: Character): number {
  return (Object.keys(character.attributes) as AttributeKey[]).reduce(
    (sum, key) => sum + attrFreeCost(character, key),
    0
  );
}

export function attrPointsLeft(character: Character): number {
  return ATTR_FREE - totalAttrSpent(character);
}

export function nextStepCost(character: Character, key: AttributeKey): number {
  return stepCost(character.attributes[key]);
}
