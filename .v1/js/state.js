'use strict';

function freshState() {
  const talente = {};
  for (const [cat, d] of Object.entries(TALENT_CATS)) {
    talente[cat] = {};
    for (const t of d.talents) talente[cat][t.n] = 0;
  }
  return {
    g: {
      name: '', geschlecht: 'männlich', beruf: '', alter: '', groesse: '',
      berufskategorie: '',
      hobby1: '', hobby2: '',
      hobby1Talent: '', hobby2Talent: '',
      spezPos: '', spezNegBeruf: '', spezNegHobby1: '', spezNegFrei: '',
    },
    attr:          { KK: 8, AU: 8, GE: 8, IN: 8, CH: 8, MB: 8 },
    talente,
    fuehrerscheine: [],
    waffen:         [],
    notizen:        '',
  };
}

let S = freshState();

let activeTab = 'charakter';

function mergeState(base, src) {
  const out = { ...base };
  for (const k of Object.keys(src)) {
    if (src[k] !== null && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      out[k] = mergeState(base[k] || {}, src[k]);
    } else {
      out[k] = src[k];
    }
  }
  return out;
}

// When berufskategorie changes, reset attributes to job minimums
function applyBerufskategorieAttrMin() {
  const kat = BERUFSKAT[S.g.berufskategorie];
  // Reset all to base
  for (const k of ATTR_KEYS) S.attr[k] = ATTR_BASE;
  if (!kat) return;
  // Apply job minimums
  for (const [k, v] of Object.entries(kat.attrMin)) {
    S.attr[k] = v;
  }
}
