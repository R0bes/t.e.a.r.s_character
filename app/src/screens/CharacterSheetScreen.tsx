import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ATTRIBUTES, ATTR_MAP } from '../data/attributes';
import { PROFESSION_MAP } from '../data/professions';
import { TALENT_CATEGORIES } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';
import { calcDerived, calcATN, calcPA, calcATD, calcINI } from '../rules/derivedValues';
import { SpiderChart } from '../components/ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../components/ui/SpiderChart';
import { AttributeChip } from '../components/ui/AttributeChip';

const DERIVED_LABELS: Record<string, string> = {
  ATN: 'Nahkampf', PA: 'Parade', ATD: 'Distanz', INI: 'Initiative', LE: 'Lebensenergie', GG: 'Geist. Gesundheit',
};

const C = {
  KK: '#D1453B', GE: '#3E7FCE', AU: '#4FA968',
  CH: '#D45C95', IN: '#8C5FC4', MB: '#E08C3C',
  ATN: '#C4881C', PA: '#2DB38C', ATD: '#4CAED8', INI: '#88C040',
} as const;

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

// Icon-only medallion around the sheet radar — tooltip on hover, value shown in chart dot
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
      <div className="relative w-9 h-9 rounded-full overflow-hidden cursor-default"
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
        <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
      </div>
      {open && (
        <span className={`absolute z-30 ${SHEET_TIP_POS[tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
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

  const allSpecs = [
    char.specProfession && { ...char.specProfession, label: 'Beruf (Pflicht)' },
    char.specHobby1 && { ...char.specHobby1, label: 'Hobby 1' },
    char.specFreePositive && { ...char.specFreePositive, label: 'Positiv' },
    char.specFreeNegative && { ...char.specFreeNegative, label: 'Negativ' },
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <header className="shrink-0 bg-surface border-b border-hairline px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-raised border border-hairline flex items-center justify-center shrink-0">
            <span className="font-display text-xl text-paper">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl text-paper leading-tight truncate">{char.info.name || 'Unbenannt'}</h1>
            <p className="text-sm text-muted truncate">{char.info.professionName || prof?.label || '—'}</p>
            <div className="flex gap-2 text-xs text-faint mt-0.5">
              {char.info.age && <span>{char.info.age} J.</span>}
              {char.info.height && <span>{char.info.height} cm</span>}
              {char.info.gender && <span>{char.info.gender}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setScreen('creation')}
            className="flex-1 py-1.5 text-xs border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => exportCharacter(char.id)}
            className="py-1.5 px-3 text-xs border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => setScreen('play')}
            className="flex-1 py-1.5 text-xs bg-paper text-bg font-medium rounded hover:opacity-90 transition-opacity"
          >
            Los geht's →
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">

        {/* 10-axis radar: 6 primary + 4 combat */}
        <div className="bg-surface border border-hairline rounded-lg p-4">
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
              const angle = ((i / 10) * 360 - 90) * (Math.PI / 180);
              const leftPct = 50 + Math.cos(angle) * 42;
              const topPct  = 50 + Math.sin(angle) * 42;
              return (
                <SheetLabel
                  key={attr.key}
                  attrKey={attr.key}
                  name={attr.name}
                  color={attr.color}
                  icon={attr.icon}
                  leftPct={leftPct}
                  topPct={topPct}
                />
              );
            })}
          </div>
        </div>

        {/* Attributes */}
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Attribute</p>
          <div className="space-y-2">
            {ATTRIBUTES.map(attr => {
              const val = char.attributes[attr.key];
              const pct = (val / 19) * 100;
              return (
                <div key={attr.key} className="flex items-center gap-3">
                  <span className="font-mono text-xs w-6" style={{ color: attr.color }}>{attr.key}</span>
                  <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: attr.color }}
                    />
                  </div>
                  <span className="font-mono text-sm text-primary w-5 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Derived values */}
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Abgeleitete Werte</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(derived).map(([key, val]) => (
              <div key={key} className="bg-raised border border-hairline rounded p-2 text-center">
                <div className="font-mono text-xs text-muted">{key}</div>
                <div className="font-mono text-xl text-primary font-medium">{val}</div>
                <div className="text-[10px] text-faint">{DERIVED_LABELS[key]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Talents */}
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Talente</p>
          {TALENT_CATEGORIES.map(cat => {
            const learned = cat.talents.filter(t => (char.talents[t.name] ?? 0) > 0);
            if (learned.length === 0) return null;
            return (
              <div key={cat.key} className="mb-3 last:mb-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium" style={{ color: cat.color }}>{cat.label}</span>
                </div>
                <div className="space-y-1 ml-3">
                  {learned.map(t => {
                    const val = char.talents[t.name] ?? 0;
                    return (
                      <div key={t.name} className="flex items-center gap-2">
                        <span className="text-sm text-primary flex-1">{t.name}</span>
                        {t.attrs && (
                          <div className="flex gap-0.5">
                            {t.attrs.map((a, i) => <AttributeChip key={i} attr={a} size="xs" />)}
                          </div>
                        )}
                        <span className="font-mono text-sm text-paper w-4 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Specifications */}
        {allSpecs.length > 0 && (
          <div className="bg-surface border border-hairline rounded-lg p-3">
            <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Spezifika</p>
            <div className="space-y-2">
              {allSpecs.map((s, i) => s && (
                <div key={i} className={`flex items-start gap-2 p-2 rounded border ${s.modifier > 0 ? 'border-danger/30 bg-danger/5' : 'border-success/30 bg-success/5'}`}>
                  <span className={`font-mono text-xs mt-0.5 shrink-0 ${s.modifier > 0 ? 'text-danger' : 'text-success'}`}>
                    {s.modifier > 0 ? `+${s.modifier}` : s.modifier}
                  </span>
                  <div>
                    <span className="text-sm text-primary">{s.name}</span>
                    <span className="text-xs text-faint ml-2">({s.label})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special abilities */}
        {char.specialAbilities.length > 0 && (
          <div className="bg-surface border border-hairline rounded-lg p-3">
            <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Besondere Fähigkeiten</p>
            <div className="flex flex-wrap gap-2">
              {char.specialAbilities.map(id => (
                <span key={id} className="text-sm text-primary bg-raised px-2 py-1 rounded border border-hairline">
                  {ABILITY_MAP[id]?.name ?? id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
