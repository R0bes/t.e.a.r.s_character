import { useState } from 'react';
import { TALENT_CATEGORIES } from '../../data/talents';
import { calcSuccessProb } from '../../rules/checks';
import { talentFixedBonus } from '../../rules/talentBudget';
import { probColor } from '../../data/radarConfig';
import { CatIcon } from './CatIcon';
import type { Character, AttributeKey } from '../../types/character';

type SortMode = 'kategorie' | 'chance' | 'az';

const SORT_LABELS: Record<SortMode, string> = {
  kategorie: 'Kategorie',
  chance: 'Erfolgschance',
  az: 'A–Z',
};

interface TalentEntry {
  name: string;
  catColor: string;
  catIcon: string;
  effective: number;
  pct: number | null;
  isCombat: boolean;
}

function buildEntries(char: Character): TalentEntry[] {
  const entries: TalentEntry[] = [];
  for (const cat of TALENT_CATEGORIES) {
    for (const t of cat.talents) {
      const stored    = char.talents[t.name] ?? 0;
      const bonus     = talentFixedBonus(char, t.name);
      const effective = stored + bonus;
      const isCombat  = t.costMultiplier === 2;
      const attrVals  = t.attrs ? (t.attrs as readonly AttributeKey[]).map(a => char.attributes[a]) : null;
      const prob      = (!isCombat && attrVals && attrVals.length === 3) ? calcSuccessProb(attrVals, effective) : null;
      const pct       = prob !== null ? Math.round(prob * 100) : null;
      entries.push({ name: t.name, catColor: cat.color, catIcon: cat.icon, effective, pct, isCombat });
    }
  }
  return entries;
}

function sortEntries(entries: TalentEntry[], mode: SortMode): TalentEntry[] {
  if (mode === 'kategorie') return entries;
  const arr = [...entries];
  if (mode === 'az') {
    arr.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  } else {
    arr.sort((a, b) => {
      const aHasPct = a.pct !== null;
      const bHasPct = b.pct !== null;
      if (aHasPct && bHasPct) return b.pct! - a.pct!;
      if (aHasPct !== bHasPct) return aHasPct ? -1 : 1;
      return b.effective - a.effective;
    });
  }
  return arr;
}

export function TalentGrid({ char, onSelect, defaultSort = 'chance' }: {
  char: Character;
  onSelect?: (name: string) => void;
  defaultSort?: SortMode;
}) {
  const [sort, setSort] = useState<SortMode>(defaultSort);
  const entries = sortEntries(buildEntries(char), sort);
  const clickable = !!onSelect;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {(Object.keys(SORT_LABELS) as SortMode[]).map(m => {
          const active = sort === m;
          return (
            <button
              key={m}
              onClick={() => setSort(m)}
              className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border transition-colors"
              style={active
                ? { backgroundColor: '#6B523320', borderColor: '#6B523390', color: '#6B5233' }
                : { backgroundColor: 'transparent', borderColor: '#2D303A', color: '#8C8F99' }}
            >
              {SORT_LABELS[m]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 lg:grid-cols-7 gap-1">
        {entries.map(e => {
          const valColor = e.isCombat ? e.catColor : probColor(e.pct);
          return (
            <div
              key={e.name}
              onClick={clickable ? () => onSelect!(e.name) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              className={`rounded-md border p-1.5 flex flex-col gap-0.5 text-left ${
                clickable ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''
              }`}
              style={{ borderColor: `${e.catColor}30`, backgroundColor: `${e.catColor}08` }}
            >
              <div className="flex items-center gap-0.5">
                <CatIcon src={e.catIcon} size={8} className="shrink-0 opacity-60" />
                <span className="text-[8px] leading-tight line-clamp-2 flex-1" style={{ color: e.catColor }}>
                  {e.name}
                </span>
              </div>
              <span className="font-mono font-bold text-sm leading-none" style={{ color: valColor }}>
                {e.pct !== null ? `${e.pct}%` : `TP ${e.effective}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
