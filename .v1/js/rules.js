'use strict';

// ── ATTRIBUTE RULES ───────────────────────────────────────────────────────────

function attrJobMin(attrKey) {
  const kat = BERUFSKAT[S.g.berufskategorie];
  if (!kat) return ATTR_BASE;
  return kat.attrMin[attrKey] ?? ATTR_BASE;
}

function stepCost(from) {
  const to = from + 1;
  if (to <= 14) return 1;
  if (to <= 17) return 2;
  return 3;
}

function attrFreeCost(attrKey, val) {
  const min = attrJobMin(attrKey);
  let c = 0;
  for (let v = min; v < val; v++) c += stepCost(v);
  return c;
}

function poolSpent() {
  return ATTR_KEYS.reduce((sum, k) => sum + attrFreeCost(k, S.attr[k]), 0);
}

function poolLeft() {
  return ATTR_FREE - poolSpent();
}

// ── DERIVED STATS (all auto-calculated) ───────────────────────────────────────

function calcATN() { return Math.floor((S.attr.KK * 2 + S.attr.GE) / 3); }
function calcPA()  { return Math.floor((S.attr.KK + S.attr.AU + S.attr.GE) / 3); }
function calcATD() { return Math.floor((S.attr.GE * 2 + S.attr.AU) / 3); }
function calcINI() { return Math.floor((S.attr.KK + 5) - (S.attr.GE / 2)); }
function calcLE()  { return (S.attr.KK * 2 + S.attr.AU) * 3; }
function calcGG()  { return (S.attr.AU + S.attr.IN + S.attr.MB * 2) * 3; }

// ── TALENT RULES ──────────────────────────────────────────────────────────────

function talentJobPts(cat) {
  const kat = BERUFSKAT[S.g.berufskategorie];
  if (!kat) return 0;
  return kat.talentPts[cat] ?? 0;
}

function talentAvail(cat) {
  let p = talentJobPts(cat);
  const g = S.g;
  if (g.hobby1Talent && TALENT_CAT_OF[g.hobby1Talent] === cat) p += 5;
  if (g.hobby2Talent && TALENT_CAT_OF[g.hobby2Talent] === cat) p += 3;
  return p;
}

function talentSpent(cat) {
  const mul = cat === 'kampf' ? 2 : 1;
  return Object.values(S.talente[cat]).reduce((s, v) => s + v * mul, 0);
}

function talentLeft(cat) {
  return talentAvail(cat) - talentSpent(cat);
}

function talentBadgeState(cat) {
  const left  = talentLeft(cat);
  const spent = talentSpent(cat);
  if (spent === 0) return '';
  if (left < 0)    return 'over';
  if (left === 0)  return 'ok';
  return 'partial';
}

// ── VARIABLE POINTS ───────────────────────────────────────────────────────────

function varPtsSpent() {
  return S.fuehrerscheine.reduce((s, n) => {
    const f = FUEHRERSCHEINE.find(x => x.n === n);
    return s + (f ? f.cost : 0);
  }, 0);
}

function varPtsLeft() {
  return VARIABLE_PTS - varPtsSpent();
}
