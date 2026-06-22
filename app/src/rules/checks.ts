export interface RollResult {
  roll: number;
  attribute: number;
  success: boolean;
  diff: number;
}

export interface CheckResult {
  rolls: RollResult[];
  totalDiff: number;
  talentValue: number;
  success: boolean;
  remaining: number;
}

export function resolveCheck(rolls: number[], attrValues: number[], talentValue: number): CheckResult {
  const results: RollResult[] = rolls.map((roll, i) => {
    const attr = attrValues[i] ?? 0;
    const success = roll <= attr;
    const diff = success ? 0 : roll - attr;
    return { roll, attribute: attr, success, diff };
  });

  const totalDiff = results.reduce((s, r) => s + r.diff, 0);
  const success = totalDiff <= talentValue;
  const remaining = talentValue - totalDiff;

  return { rolls: results, totalDiff, talentValue, success, remaining };
}

export function randomD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}
