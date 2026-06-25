import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ATTR_MAP } from '../data/attributes';
import { PROFESSION_MAP } from '../data/professions';
import { TALENT_CATEGORIES } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';
import { calcDerived, calcATN, calcPA, calcATD, calcINI } from '../rules/derivedValues';
import { SpiderChart } from '../components/ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../components/ui/SpiderChart';
import { AttributeChip } from '../components/ui/AttributeChip';

const C = {
  KK: '#D1453B', GE: '#3E7FCE', AU: '#4FA968',
  CH: '#D45C95', IN: '#8C5FC4', MB: '#E08C3C',
  ATN: '#C4881C', PA: '#2DB38C', ATD: '#4CAED8', INI: '#88C040',
  LE: '#208838',  GG: '#1898A0',
} as const;

function SheetResourceBar({ shortKey, value, maxValue, color, icon }: {
  shortKey: string; value: number; maxValue: number; color: string; icon: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / maxValue) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden"
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
        <img src={icon} alt={shortKey} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>{shortKey}</span>
          <span className="text-[9px] font-mono text-muted">{value}<span className="text-faint"> / {maxValue}</span></span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-raised">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

type TipDir = 'up' | 'down' | 'left' | 'right';

const SHEET_TIP_POS: Record<TipDir, string> = {
  down:  'bottom-full left-1/2 -translate-x-1/2 mb-2',
  up:    'top-full left-1/2 -translate-x-1/2 mt-2',
  left:  'left-full top-1/2 -translate-y-1/2 ml-2',
  right: 'right-full top-1/2 -translate-y-1/2 mr-2',
};

function sheetTip(leftPct: number, topPct: number): TipDir {
  const dx = leftPct - 50;
  const dy = topPct - 50;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'left' : 'right';
  return dy > 0 ? 'up' : 'down';
}

function SheetLabel({ attrKey, name, color, icon, leftPct, topPct }: {
  attrKey: string; name: string; color: string; icon: string;
  leftPct: number; topPct: number;
}) {
  const [open, setOpen] = useState(false);
  const tip = sheetTip(leftPct, topPct);

  return (
    <div
      className="absolute"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative w-8 h-8 rounded-full overflow-hidden cursor-default"
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
        <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
      </div>
      {open && (
        <span className={`absolute z-30 ${SHEET_TIP_POS[tip]} px-2 py-1 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
          <span style={{ color }}>{attrKey}</span>
          {' — '}
          <span className="text-muted">{name}</span>
        </span>
      )}
    </div>
  );
}

export function CharacterSheetScreen() {
  const activeId = useStore(s => s.activeId);
  const char = useStore(s => s.characters.find(c => c.id === activeId));
  const { setScreen, exportCharacter } = useStore();

  if (!char) return null;

  const prof = char.profession ? PROFESSION_MAP[char.profession] : null;
  const derived = calcDerived(char);

  const CHART_MAX = 20;
  const sheetAttrs = [
    { key: 'KK',  name: ATTR_MAP.KK.name, color: C.KK,  icon: ATTR_MAP.KK.icon, value: char.attributes.KK  },
    { key: 'GE',  name: ATTR_MAP.GE.name, color: C.GE,  icon: ATTR_MAP.GE.icon, value: char.attributes.GE  },
    { key: 'AU',  name: ATTR_MAP.AU.name, color: C.AU,  icon: ATTR_MAP.AU.icon, value: char.attributes.AU  },
    { key: 'CH',  name: ATTR_MAP.CH.name, color: C.CH,  icon: ATTR_MAP.CH.icon, value: char.attributes.CH  },
    { key: 'IN',  name: ATTR_MAP.IN.name, color: C.IN,  icon: ATTR_MAP.IN.icon, value: char.attributes.IN  },
    { key: 'MB',  name: ATTR_MAP.MB.name, color: C.MB,  icon: ATTR_MAP.MB.icon, value: char.attributes.MB  },
    { key: 'ATN', name: 'Nahkampf',       color: C.ATN, icon: '/icons/attr/atn.png', value: calcATN(char) },
    { key: 'PA',  name: 'Parade',         color: C.PA,  icon: '/icons/attr/pa.png',  value: calcPA(char)  },
    { key: 'ATD', name: 'Distanz',        color: C.ATD, icon: '/icons/attr/atd.png', value: calcATD(char) },
    { key: 'INI', name: 'Initiative',     color: C.INI, icon: '/icons/attr/ini.png', value: calcINI(char) },
  ];

  const radarAxes: SpiderAxis[] = sheetAttrs.map(a => ({
    key: a.key, value: a.value, maxValue: CHART_MAX, color: a.color,
  }));

  const initials = char.info.name
    ? char.info.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const metaParts = [
    char.info.professionName || prof?.label,
    char.info.age   && `${char.info.age} J.`,
    char.info.height && `${char.info.height} cm`,
    char.info.gender,
  ].filter(Boolean);

  const allSpecs = [
    char.specProfession  && { ...char.specProfession,  label: 'Pflicht' },
    char.specHobby1      && { ...char.specHobby1,      label: 'Hobby'   },
    char.specFreePositive && { ...char.specFreePositive, label: 'Frei'  },
    char.specFreeNegative && { ...char.specFreeNegative, label: 'Frei'  },
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Compact identity header ── */}
      <header className="shrink-0 bg-surface border-b border-hairline px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-raised border border-hairline flex items-center justify-center shrink-0">
            <span className="font-display text-xs text-paper">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-paper leading-tight truncate">{char.info.name || 'Unbenannt'}</p>
            {metaParts.length > 0 && (
              <p className="text-[10px] text-faint leading-tight truncate">{metaParts.join(' · ')}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setScreen('creation')}
              className="px-2 py-1 text-[10px] border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors">
              Bearb.
            </button>
            <button onClick={() => exportCharacter(char.id)}
              className="px-2 py-1 text-[10px] border border-hairline rounded text-muted hover:text-primary transition-colors">
              ↓
            </button>
            <button onClick={() => setScreen('play')}
              className="px-2 py-1 text-[10px] bg-paper text-bg font-bold rounded hover:opacity-90 transition-opacity">
              ▶
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* LE + GG — compact row */}
        <div className="flex gap-3 px-3 pt-3 pb-2">
          <div className="flex-1">
            <SheetResourceBar shortKey="LE" value={char.currentLE || derived.LE}
              maxValue={derived.LE} color={C.LE} icon="/icons/attr/le.png" />
          </div>
          <div className="flex-1">
            <SheetResourceBar shortKey="GG" value={char.currentGG || derived.GG}
              maxValue={derived.GG} color={C.GG} icon="/icons/attr/gg.png" />
          </div>
        </div>

        {/* Radar — full width, minimal padding */}
        <div className="px-1">
          <div className="relative w-full overflow-visible" style={{ aspectRatio: '1/1' }}>
            <div className="absolute" style={{ left: '12.5%', top: '12.5%', width: '75%', aspectRatio: '1' }}>
              <SpiderChart
                axes={radarAxes}
                size={280}
                gridValues={[5, 10, 15, 20]}
                showGridLabels
                showValueLabels
                chartId="sheet"
                className="w-full h-full"
                fillBlur={6}
                colorZones={[
                  { from:  0, to:  8, color: '#5878A0', opacity: 0.07 },
                  { from:  8, to: 14, color: '#8898A8', opacity: 0.05 },
                  { from: 14, to: 17, color: '#C89020', opacity: 0.10 },
                  { from: 17, to: 20, color: '#C83020', opacity: 0.13 },
                ] as ColorZone[]}
              />
            </div>
            {sheetAttrs.map((attr, i) => {
              const angle   = ((i / 10) * 360 - 90) * (Math.PI / 180);
              const leftPct = 50 + Math.cos(angle) * 42;
              const topPct  = 50 + Math.sin(angle) * 42;
              return (
                <SheetLabel key={attr.key} attrKey={attr.key} name={attr.name}
                  color={attr.color} icon={attr.icon} leftPct={leftPct} topPct={topPct} />
              );
            })}
          </div>
        </div>

        {/* ── Talente — compact one-line-per-category ── */}
        {TALENT_CATEGORIES.some(cat => cat.talents.some(t => (char.talents[t.name] ?? 0) > 0)) && (
          <div className="px-3 pt-1 pb-2 space-y-1 border-t border-hairline mt-1">
            {TALENT_CATEGORIES.map(cat => {
              const learned = cat.talents.filter(t => (char.talents[t.name] ?? 0) > 0);
              if (!learned.length) return null;
              return (
                <div key={cat.key} className="flex items-baseline gap-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider shrink-0 w-14 leading-tight" style={{ color: cat.color }}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-primary leading-snug">
                    {learned.map((t, i) => (
                      <span key={t.name}>
                        {t.name}
                        {t.attrs && (
                          <span className="inline-flex gap-0.5 mx-0.5 align-middle">
                            {t.attrs.map((a, ai) => <AttributeChip key={ai} attr={a} size="xs" />)}
                          </span>
                        )}
                        <span className="font-mono text-faint text-[9px]"> {char.talents[t.name]}</span>
                        {i < learned.length - 1 && <span className="text-hairline mx-1">·</span>}
                      </span>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Spezifika + Fähigkeiten — tag cloud ── */}
        {(allSpecs.length > 0 || char.specialAbilities.length > 0) && (
          <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-hairline">
            {allSpecs.map((s, i) => s && (
              <span key={i}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border leading-tight ${s.modifier > 0 ? 'border-danger/40 text-danger bg-danger/5' : 'border-success/40 text-success bg-success/5'}`}>
                {s.modifier > 0 ? `+${s.modifier}` : s.modifier} {s.name}
              </span>
            ))}
            {char.specialAbilities.map(id => (
              <span key={id}
                className="text-[9px] text-muted bg-raised px-1.5 py-0.5 rounded border border-hairline leading-tight">
                {ABILITY_MAP[id]?.name ?? id}
              </span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
