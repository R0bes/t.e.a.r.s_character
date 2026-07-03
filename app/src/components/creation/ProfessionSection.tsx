import type { ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { PROFESSIONS, PROFESSION_MAP } from '../../data/professions';
import { ATTRIBUTES } from '../../data/attributes';
import { TALENT_CATEGORIES } from '../../data/talents';
import type { AttributeKey } from '../../types/character';
import { CatIcon } from '../ui/CatIcon';

export function ProfessionSection({ charId, mode, children }: {
  charId: string;
  mode: 'edit' | 'fix';
  children?: ReactNode;
}) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  const activeProfMeta = PROFESSIONS.find(p => p.key === char.profession);

  return (
    <div className={mode === 'fix' ? 'flex-1 min-w-0 flex flex-col gap-2' : 'flex-1 min-w-0'}>

      {/* Edit mode: 4-column profession grid */}
      <div style={{ maxHeight: mode === 'edit' ? 600 : 0, opacity: mode === 'edit' ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
        <div className="grid grid-cols-4 gap-1">
          {PROFESSIONS.map(prof => {
            const isActive = char.profession === prof.key;
            const shortLabel = prof.labelSingular.replace(/ ?Beruf(e?)/, '').trim();
            return (
              <button
                key={prof.key}
                onClick={() => patchCharacter(charId, c => {
                  const oldProf = c.profession ? PROFESSION_MAP[c.profession] : null;
                  c.profession = prof.key;
                  for (const key of Object.keys(c.attributes) as AttributeKey[]) {
                    const oldMin    = (oldProf?.attrMin[key] ?? 8) as number;
                    const newMin    = (prof.attrMin[key]     ?? 8) as number;
                    const freeSpent = Math.max(0, (c.attributes[key] ?? 8) - oldMin);
                    c.attributes[key] = newMin + freeSpent;
                  }
                })}
                className="flex flex-col items-start gap-1.5 p-2 rounded-lg border transition-colors hover:opacity-90"
                style={{
                  borderColor:     isActive ? `${prof.color}90` : `${prof.color}28`,
                  backgroundColor: isActive ? `${prof.color}20` : `${prof.color}08`,
                  boxShadow:       isActive ? `inset 0 -2px 0 ${prof.color}` : 'none',
                }}
              >
                {/* Icon + title */}
                <div className="flex items-center gap-1.5 w-full min-w-0">
                  <CatIcon src={prof.icon} size={24} className="shrink-0" />
                  <span
                    className="text-[10px] font-semibold leading-tight min-w-0"
                    style={{ color: prof.color, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}
                  >{shortLabel}</span>
                </div>
                {/* Attribute minimums */}
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 w-full">
                  {Object.entries(prof.attrMin).map(([k, v]) => {
                    const attrMeta = ATTRIBUTES.find(a => a.key === k);
                    const color = attrMeta?.color ?? '#888';
                    return (
                      <div key={k} className="flex items-center gap-[3px]">
                        <img src={attrMeta?.icon ?? ''} alt={k} style={{ width: 11, height: 11, borderRadius: '50%', border: `1px solid ${color}55`, flexShrink: 0 }} />
                        <span className="text-[9px] font-mono leading-none" style={{ color }}>≥{v}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Talent point distribution */}
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 w-full">
                  {Object.entries(prof.talentPts).map(([cat, pts]) => {
                    const catMeta = TALENT_CATEGORIES.find(c => c.key === cat);
                    return (
                      <div key={cat} className="flex items-center gap-[3px]">
                        <CatIcon src={catMeta?.icon ?? ''} size={11} />
                        <span className="text-[9px] font-mono leading-none" style={{ color: catMeta?.color ?? '#888' }}>+{pts}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fix mode: selected profession display */}
      <div style={{ maxHeight: mode === 'fix' ? 80 : 0, opacity: mode === 'fix' ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
        {activeProfMeta ? (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ borderColor: `${activeProfMeta.color}60`, backgroundColor: `${activeProfMeta.color}12` }}
          >
            <CatIcon src={activeProfMeta.icon} size={22} />
            <span className="text-sm font-semibold" style={{ color: activeProfMeta.color }}>
              {activeProfMeta.labelSingular}
            </span>
          </div>
        ) : mode === 'fix' && (
          <div
            className="flex items-center justify-center px-3 py-2 rounded-lg border"
            style={{ borderColor: '#E8305060', backgroundColor: '#E8305010', boxShadow: '0 0 8px #E8305030' }}
          >
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#E8305080' }}>
              Keine Berufsklasse
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
