import type { Character } from '../types/character';

function a(character: Character, key: 'KK' | 'GE' | 'AU' | 'CH' | 'IN' | 'MB'): number {
  return character.attributes[key];
}

export function calcATN(character: Character): number {
  return Math.floor((a(character, 'KK') * 2 + a(character, 'GE')) / 3);
}

export function calcPA(character: Character): number {
  return Math.floor((a(character, 'KK') + a(character, 'AU') + a(character, 'GE')) / 3);
}

export function calcATD(character: Character): number {
  return Math.floor((a(character, 'GE') * 2 + a(character, 'AU')) / 3);
}

export function calcINI(character: Character): number {
  return Math.floor((a(character, 'KK') + 5) - a(character, 'GE') / 2);
}

export function calcLE(character: Character): number {
  return (a(character, 'KK') * 2 + a(character, 'AU')) * 3;
}

export function calcGG(character: Character): number {
  return (a(character, 'AU') + a(character, 'IN') + a(character, 'MB') * 2) * 3;
}

export interface DerivedValues {
  ATN: number;
  PA:  number;
  ATD: number;
  INI: number;
  LE:  number;
  GG:  number;
}

export function calcDerived(character: Character): DerivedValues {
  return {
    ATN: calcATN(character),
    PA:  calcPA(character),
    ATD: calcATD(character),
    INI: calcINI(character),
    LE:  calcLE(character),
    GG:  calcGG(character),
  };
}
