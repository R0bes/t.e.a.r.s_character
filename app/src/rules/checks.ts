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

const _probCache = new Map<string, number>();

export function calcSuccessProb(attrValues: number[], talentValue: number): number {
  const key = `${attrValues.join(',')},${talentValue}`;
  const cached = _probCache.get(key);
  if (cached !== undefined) return cached;

  function dieDist(a: number): number[] {
    const cap = Math.min(Math.max(a, 0), 20);
    const dist = new Array(20 - cap + 1).fill(0);
    dist[0] = cap / 20;
    for (let d = 1; d < dist.length; d++) dist[d] = 1 / 20;
    return dist;
  }

  function convolve(a: number[], b: number[]): number[] {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++)
        out[i + j] += a[i] * b[j];
    return out;
  }

  let dist = dieDist(attrValues[0]);
  for (let i = 1; i < attrValues.length; i++)
    dist = convolve(dist, dieDist(attrValues[i]));

  let p = 0;
  for (let d = 0; d <= Math.min(talentValue, dist.length - 1); d++)
    p += dist[d];

  _probCache.set(key, p);
  return p;
}
