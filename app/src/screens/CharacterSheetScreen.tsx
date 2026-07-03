import { useState } from 'react';
import { useStore } from '../store/useStore';
import { PROFESSION_MAP } from '../data/professions';
import { TALENT_CATEGORIES } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';
import { calcDerived, calcATN, calcPA, calcATD, calcINI, calcLE, calcGG } from '../rules/derivedValues';
import { calcSuccessProb } from '../rules/checks';
import { talentFixedBonus } from '../rules/talentBudget';
import { SpiderChart } from '../components/ui/SpiderChart';
import type { SpiderAxis } from '../components/ui/SpiderChart';
import { CatIcon } from '../components/ui/CatIcon';
import type { AttributeKey } from '../types/character';
import { RADAR_AXES, COLOR_ZONES, RADAR_COLORS as C, probColor } from '../data/radarConfig';

function ResourceBar({ label, icon, color, current, max }: {
  label: string; icon: string; color: string; current: number; max: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-full overflow-hidden"
        style={{ width: 28, height: 28, boxShadow: `0 0 0 1.5px ${color}88, 0 0 6px 2px ${color}33` }}>
        <img src={icon} alt={label} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
          <span className="text-xs font-mono text-paper">{current}<span className="text-faint"> / {max}</span></span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-raised border border-hairline">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 5px ${color}88` }} />
        </div>
      </div>
    </div>
  );
}

function CombatChip({ label, icon, color, value }: {
  label: string; icon: string; color: string; value: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}0D` }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="rounded-full overflow-hidden shrink-0"
        style={{ width: 18, height: 18, boxShadow: `0 0 0 1.5px ${color}66` }}>
        <img src={icon} alt={label} className="w-full h-full object-cover" />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl z-20 pointer-events-none"
          style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}

export function CharacterSheetScreen() {
  const activeId = useStore(s => s.activeId);
  const char     = useStore(s => s.characters.find(c => c.id === activeId));
  const { setScreen, exportCharacter } = useStore();

  if (!char || !activeId) return null;

  const prof    = char.profession ? PROFESSION_MAP[char.profession] : null;
  const derived = calcDerived(char);
  const maxLE   = calcLE(char);
  const maxGG   = calcGG(char);
  const curLE   = char.currentLE || maxLE;
  const curGG   = char.currentGG || maxGG;

  const attrValues: Record<string, number> = {
    KK: char.attributes.KK, GE: char.attributes.GE,
    AU: char.attributes.AU, CH: char.attributes.CH,
    IN: char.attributes.IN, MB: char.attributes.MB,
    ATN: calcATN(char), PA: calcPA(char),
    ATD: calcATD(char), INI: calcINI(char),
    LE: derived.LE, GG: derived.GG,
  };

  const radarAxes: SpiderAxis[] = RADAR_AXES.map(e => ({
    key: e.key,
    value: attrValues[e.key] ?? 0,
    maxValue: e.maxValue,
    color: e.color,
  }));

  const initials  = char.info.name
    ? char.info.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??';
  const profColor = prof?.color ?? '#8C8F99';

  const allSpecs = [
    char.specProfession, char.specHobby1,
    char.specFreePositive, char.specFreeNegative,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Sticky header ── */}
      <header className="shrink-0 sticky top-0 z-30 bg-surface border-b border-hairline px-3 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen('list')}
            className="text-sm text-muted hover:text-primary transition-colors shrink-0 px-2 py-1 rounded border border-hairline hover:border-muted">
            ← Liste
          </button>
          <span className="flex-1 min-w-0 font-bold text-paper text-base text-center truncate">
            {char.info.name || 'Unbenannt'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setScreen('creation')}
              className="px-2 py-1 text-[10px] border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors">
              Bearbeiten
            </button>
            <button onClick={() => exportCharacter(char.id)}
              className="px-2 py-1 text-[10px] border border-hairline rounded text-muted hover:text-primary transition-colors">
              ↓ Export
            </button>
            <button onClick={() => setScreen('play')}
              className="px-2 py-1 text-[10px] bg-paper text-bg font-bold rounded hover:opacity-90 transition-opacity">
              ▶ Spielen
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">

          {/* Identity */}
          <div className="flex items-center gap-3 rounded-xl border p-3"
            style={{ borderColor: `${profColor}40`, backgroundColor: `${profColor}0D` }}>
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-paper"
              style={{ backgroundColor: profColor, boxShadow: `0 3px 10px ${profColor}55` }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-paper text-sm truncate">{char.info.name || 'Unbenannt'}</div>
              <div className="text-xs mt-0.5" style={{ color: profColor }}>
                {char.info.professionName || prof?.labelSingular || '—'}
              </div>
            </div>
          </div>

          {/* LE / GG */}
          <div className="rounded-xl border border-hairline bg-surface p-3 space-y-3">
            <ResourceBar label="LE" icon="/icons/attr/le.png" color={C.LE} current={curLE} max={maxLE} />
            <div className="h-px bg-hairline" />
            <ResourceBar label="GG" icon="/icons/attr/gg.png" color={C.GG} current={curGG} max={maxGG} />
          </div>

          {/* Spider chart */}
          <div className="rounded-xl border border-hairline bg-surface p-4">
            <SpiderChart
              axes={radarAxes}
              size={140}
              gridValues={[5, 10, 14, 18]}
              showGridLabels
              showValueLabels
              chartId="sheet"
              className="w-full aspect-square"
              colorZones={COLOR_ZONES}
            />
          </div>

          {/* Combat stats */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'ATN', label: 'Nahkampf',  icon: '/icons/attr/atn.png', color: C.ATN, value: calcATN(char) },
              { key: 'PA',  label: 'Parade',     icon: '/icons/attr/pa.png',  color: C.PA,  value: calcPA(char)  },
              { key: 'ATD', label: 'Distanz',    icon: '/icons/attr/atd.png', color: C.ATD, value: calcATD(char) },
              { key: 'INI', label: 'Initiative', icon: '/icons/attr/ini.png', color: C.INI, value: calcINI(char) },
            ] as const).map(s => (
              <CombatChip key={s.key} label={s.label} icon={s.icon} color={s.color} value={s.value} />
            ))}
          </div>

          {/* Talent tiles */}
          {TALENT_CATEGORIES.map(cat => (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 mb-2">
                <CatIcon src={cat.icon} size={13} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>
                  {cat.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {cat.talents.map(t => {
                  const stored    = char.talents[t.name] ?? 0;
                  const bonus     = talentFixedBonus(char, t.name);
                  const effective = stored + bonus;
                  const isEmpty   = effective === 0;
                  const isCombat  = t.costMultiplier === 2;
                  const attrVals  = t.attrs
                    ? (t.attrs as readonly AttributeKey[]).map(a => char.attributes[a])
                    : null;
                  const prob    = (!isCombat && attrVals && attrVals.length === 3)
                    ? calcSuccessProb(attrVals, effective) : null;
                  const pct     = prob !== null ? Math.round(prob * 100) : null;
                  const valColor = isCombat ? cat.color : probColor(pct);

                  return (
                    <div
                      key={t.name}
                      className="rounded-lg border p-2 flex flex-col gap-0.5"
                      style={{
                        borderColor: `${cat.color}30`,
                        backgroundColor: `${cat.color}08`,
                        opacity: isEmpty ? 0.38 : 1,
                      }}
                    >
                      <span className="text-[10px] leading-tight line-clamp-2" style={{ color: cat.color }}>
                        {t.name}
                      </span>
                      <span className="font-mono font-bold text-base leading-none" style={{ color: valColor }}>
                        {pct !== null ? `${pct}%` : `TP ${effective}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Specs */}
          {allSpecs.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface p-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Spezifika</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allSpecs.map(spec => {
                  if (!spec) return null;
                  const isBonus = spec.modifier < 0;
                  return (
                    <span
                      key={spec.name}
                      className="text-[10px] font-mono px-2 py-1 rounded-lg border"
                      style={{
                        color: isBonus ? '#4FA968' : '#C83050',
                        borderColor: isBonus ? '#4FA96840' : '#C8305040',
                        backgroundColor: isBonus ? '#4FA96808' : '#C8305008',
                      }}
                    >
                      {spec.name} <span className="opacity-60">{spec.modifier > 0 ? '+' : ''}{spec.modifier}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special abilities */}
          {char.specialAbilities.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface p-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Besondere Fähigkeiten</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {char.specialAbilities.map(id => (
                  <span key={id}
                    className="text-[10px] font-mono text-muted bg-raised border border-hairline px-2 py-1 rounded-lg">
                    {ABILITY_MAP[id]?.name ?? id}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
