import { useState, useRef, useLayoutEffect } from 'react';
import { useStore } from '../store/useStore';
import { ATTR_MAP } from '../data/attributes';
import { PROFESSION_MAP } from '../data/professions';
import { TALENT_CATEGORIES } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';
import { calcDerived, calcATN, calcPA, calcATD, calcINI, calcLE, calcGG } from '../rules/derivedValues';
import { calcSuccessProb } from '../rules/checks';
import { talentFixedBonus } from '../rules/talentBudget';
import { SpiderChart } from '../components/ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../components/ui/SpiderChart';
import { CatIcon } from '../components/ui/CatIcon';
import type { AttributeKey } from '../types/character';

const C = {
  KK:  '#D1453B', GE:  '#3E7FCE', AU:  '#4FA968',
  CH:  '#D45C95', IN:  '#8C5FC4', MB:  '#7030B0',
  ATN: '#C4881C', PA:  '#2DB38C', ATD: '#4CAED8', INI: '#88C040',
  LE:  '#208838', GG:  '#1898A0',
} as const;

const HEADER_H = 52;

const COMBINED_ENTRIES = [
  { key: 'KK',  color: C.KK,  icon: '/icons/attr/kk.png',  maxValue: 20 },
  { key: 'ATN', color: C.ATN, icon: '/icons/attr/atn.png', maxValue: 20 },
  { key: 'GE',  color: C.GE,  icon: '/icons/attr/ge.png',  maxValue: 20 },
  { key: 'PA',  color: C.PA,  icon: '/icons/attr/pa.png',  maxValue: 20 },
  { key: 'AU',  color: C.AU,  icon: '/icons/attr/au.png',  maxValue: 20 },
  { key: 'LE',  color: C.LE,  icon: '/icons/attr/le.png',  maxValue: 180 },
  { key: 'IN',  color: C.IN,  icon: '/icons/attr/in.png',  maxValue: 20 },
  { key: 'GG',  color: C.GG,  icon: '/icons/attr/gg.png',  maxValue: 240 },
  { key: 'MB',  color: C.MB,  icon: '/icons/attr/mb.png',  maxValue: 20 },
  { key: 'ATD', color: C.ATD, icon: '/icons/attr/atd.png', maxValue: 20 },
  { key: 'CH',  color: C.CH,  icon: '/icons/attr/ch.png',  maxValue: 20 },
  { key: 'INI', color: C.INI, icon: '/icons/attr/ini.png', maxValue: 20 },
] as const;

const SHEET_COLOR_ZONES: ColorZone[] = [
  { from: 0,  to: 5,  color: '#5878A0', opacity: 0.07 },
  { from: 5,  to: 14, color: '#8898A8', opacity: 0.05 },
  { from: 14, to: 18, color: '#C89020', opacity: 0.10 },
  { from: 18, to: 20, color: '#C83020', opacity: 0.13 },
];

type TipDir = 'up' | 'down' | 'left' | 'right';

function tipDir(leftPct: number, topPct: number): TipDir {
  const dx = leftPct - 50, dy = topPct - 50;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'left' : 'right';
  return dy > 0 ? 'up' : 'down';
}

const TIP_POS: Record<TipDir, string> = {
  up:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  down:  'top-full left-1/2 -translate-x-1/2 mt-2',
  left:  'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

function AttrIcon({
  attrKey, name, color, icon, leftPct, topPct, size, collapsed,
}: {
  attrKey: string; name: string; color: string; icon: string;
  leftPct: number; topPct: number; size: number; collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tip = tipDir(leftPct, topPct);

  return (
    <div
      className="absolute overflow-visible"
      style={{ left: `${leftPct.toFixed(1)}%`, top: `${topPct.toFixed(1)}%`, transform: 'translate(-50%,-50%)' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="rounded-full overflow-hidden"
        style={{
          width: size, height: size,
          boxShadow: collapsed ? 'none' : `0 0 0 2px ${color}, 0 0 6px 1px ${color}aa, 0 0 14px 4px ${color}44`,
          transition: 'box-shadow 0.7s ease',
        }}
      >
        <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
      </div>
      {open && !collapsed && (
        <span className={`absolute z-30 ${TIP_POS[tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
          <span style={{ color }}>{attrKey}</span>
          {name !== attrKey && <span className="text-muted"> — {name}</span>}
        </span>
      )}
    </div>
  );
}

function ResourceBar({ label, icon, color, current, max }: {
  label: string; icon: string; color: string; current: number; max: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 rounded-full overflow-hidden"
        style={{ width: 32, height: 32, boxShadow: `0 0 0 2px ${color}88, 0 0 8px 2px ${color}33` }}>
        <img src={icon} alt={label} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
          <span className="text-xs font-mono text-paper">{current}<span className="text-faint"> / {max}</span></span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden bg-raised border border-hairline">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
          />
        </div>
      </div>
    </div>
  );
}

function CombatStatChip({ label, icon, color, value }: {
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
      <div className="rounded-full overflow-hidden shrink-0" style={{ width: 20, height: 20, boxShadow: `0 0 0 1.5px ${color}66` }}>
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

  const containerRef    = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  const [chartExpanded, setChartExpanded]   = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setContainerWidth(initial);
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const radarAxes: SpiderAxis[] = COMBINED_ENTRIES.map(e => ({
    key: e.key,
    value: attrValues[e.key] ?? 0,
    maxValue: e.maxValue,
    color: e.color,
  }));

  const initials = char.info.name
    ? char.info.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const profColor = prof?.color ?? '#8C8F99';

  const infoPills = [
    char.info.age    ? `${char.info.age} J.`    : null,
    char.info.height ? `${char.info.height} cm` : null,
    char.info.weight ? `${char.info.weight} kg` : null,
    char.info.gender || null,
  ].filter((s): s is string => s !== null);

  const chartH = Math.max(containerWidth, HEADER_H);

  interface SpecSlot {
    spec: NonNullable<typeof char.specProfession>;
    slotLabel: string;
  }
  const allSpecs: SpecSlot[] = [
    char.specProfession   ? { spec: char.specProfession,   slotLabel: 'Berufs-Spez.' } : null,
    char.specHobby1       ? { spec: char.specHobby1,       slotLabel: 'Hobby-Spez.'  } : null,
    char.specFreePositive ? { spec: char.specFreePositive, slotLabel: 'Frei +'       } : null,
    char.specFreeNegative ? { spec: char.specFreeNegative, slotLabel: 'Frei −'       } : null,
  ].filter((s): s is SpecSlot => s !== null);

  const bonusSpecs = allSpecs.filter(s => s.spec.modifier < 0);
  const malusSpecs = allSpecs.filter(s => s.spec.modifier > 0);

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Sticky header ── */}
      <header className="shrink-0 sticky top-0 z-30 bg-surface border-b border-hairline px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreen('list')}
            className="text-sm text-muted hover:text-primary transition-colors shrink-0 px-2 py-1 rounded border border-hairline hover:border-muted"
          >
            ← Liste
          </button>
          <span className="flex-1 min-w-0 font-bold text-paper text-base text-center truncate">
            {char.info.name || 'Unbenannt'}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setScreen('creation')}
              className="px-2 py-1 text-[10px] border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors"
            >
              Bearbeiten
            </button>
            <button
              onClick={() => exportCharacter(char.id)}
              className="px-2 py-1 text-[10px] border border-hairline rounded text-muted hover:text-primary transition-colors"
            >
              ↓ Export
            </button>
            <button
              onClick={() => setScreen('play')}
              className="px-2 py-1 text-[10px] bg-paper text-bg font-bold rounded hover:opacity-90 transition-opacity"
            >
              ▶ Spielen
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto">

          {/* Wide layout: 2-col md+ */}
          <div className="md:grid md:grid-cols-2 md:gap-0">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-3 p-4 md:border-r md:border-hairline">

              {/* Identity block */}
              <div
                className="rounded-xl border p-4 flex items-start gap-4"
                style={{ borderColor: `${profColor}40`, backgroundColor: `${profColor}0D` }}
              >
                <div
                  className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-paper"
                  style={{ backgroundColor: profColor, boxShadow: `0 4px 16px ${profColor}66` }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-paper leading-tight truncate">
                    {char.info.name || 'Unbenannt'}
                  </h2>
                  <p className="text-sm font-medium mt-0.5" style={{ color: profColor }}>
                    {char.info.professionName || prof?.labelSingular || '—'}
                  </p>
                  {infoPills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {infoPills.map((pill, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono text-muted bg-raised border border-hairline px-2 py-0.5 rounded-full"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* LE / GG bars */}
              <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3">
                <ResourceBar label="LE" icon="/icons/attr/le.png" color={C.LE} current={curLE} max={maxLE} />
                <div className="h-px bg-hairline" />
                <ResourceBar label="GG" icon="/icons/attr/gg.png" color={C.GG} current={curGG} max={maxGG} />
              </div>

              {/* Morphing attribute section */}
              <div
                ref={containerRef}
                className="relative rounded-xl border"
                style={{
                  height: chartExpanded ? chartH : HEADER_H,
                  overflow: 'hidden',
                  transition: 'height 0.9s cubic-bezier(0.4,0,0.2,1)',
                  borderColor: chartExpanded ? '#FFFFFF08' : '#FFFFFF0C',
                  cursor: chartExpanded ? 'default' : 'pointer',
                }}
                onClick={!chartExpanded ? () => setChartExpanded(true) : undefined}
              >
                {/* Spider chart */}
                <div
                  className="absolute"
                  style={{
                    left: '15%', top: '15%', width: '70%', aspectRatio: '1',
                    opacity: chartExpanded ? 1 : 0,
                    transition: 'opacity 0.6s ease 0.3s',
                    pointerEvents: chartExpanded ? 'auto' : 'none',
                  }}
                >
                  <SpiderChart
                    axes={radarAxes}
                    size={140}
                    gridValues={[5, 10, 14, 18]}
                    showGridLabels
                    showValueLabels
                    chartId="sheet"
                    className="w-full h-full"
                    colorZones={SHEET_COLOR_ZONES}
                  />
                </div>

                {/* Expanded: icon halo around chart */}
                {chartExpanded && COMBINED_ENTRIES.map((entry, i) => {
                  const angle   = (i / 12) * 2 * Math.PI - Math.PI / 2;
                  const leftPct = 50 + Math.cos(angle) * 42;
                  const topPct  = 50 + Math.sin(angle) * 42;
                  const attrMeta = ATTR_MAP[entry.key as AttributeKey];
                  const name = attrMeta?.name ?? entry.key;
                  return (
                    <AttrIcon
                      key={entry.key}
                      attrKey={entry.key}
                      name={name}
                      color={entry.color}
                      icon={entry.icon}
                      leftPct={leftPct}
                      topPct={topPct}
                      size={32}
                      collapsed={false}
                    />
                  );
                })}

                {/* Collapsed: 12 chips in horizontal row */}
                {!chartExpanded && COMBINED_ENTRIES.map((entry, i) => {
                  const leftPct = ((i + 0.5) / 12) * 100;
                  return (
                    <div
                      key={entry.key}
                      className="absolute flex items-center"
                      style={{
                        left: `${leftPct.toFixed(1)}%`,
                        top: '50%',
                        transform: 'translate(-50%,-50%)',
                        gap: 3,
                      }}
                    >
                      <div
                        className="rounded-full overflow-hidden shrink-0"
                        style={{
                          width: 22, height: 22,
                          border: `1px solid ${entry.color}50`,
                          backgroundColor: `${entry.color}15`,
                        }}
                      >
                        <img src={entry.icon} alt={entry.key} className="w-full h-full object-cover" />
                      </div>
                      <span
                        className="font-mono font-bold leading-none"
                        style={{ fontSize: 9, color: entry.color, whiteSpace: 'nowrap' }}
                      >
                        {attrValues[entry.key] ?? 0}
                      </span>
                    </div>
                  );
                })}

                {/* Collapse button */}
                <button
                  onClick={e => { e.stopPropagation(); setChartExpanded(false); }}
                  style={{
                    position: 'absolute', top: 6, right: 6, zIndex: 20,
                    opacity: chartExpanded ? 1 : 0,
                    pointerEvents: chartExpanded ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease 0.1s',
                    padding: 4,
                    backgroundColor: '#1A1D2680',
                    border: '1px solid #FFFFFF10',
                    borderRadius: 6,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 3.5l3 3 3-3" stroke="#8C8F99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Combat stats row */}
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'ATN', label: 'Nahkampf',  icon: '/icons/attr/atn.png', color: C.ATN, value: calcATN(char) },
                  { key: 'PA',  label: 'Parade',     icon: '/icons/attr/pa.png',  color: C.PA,  value: calcPA(char)  },
                  { key: 'ATD', label: 'Distanz',    icon: '/icons/attr/atd.png', color: C.ATD, value: calcATD(char) },
                  { key: 'INI', label: 'Initiative', icon: '/icons/attr/ini.png', color: C.INI, value: calcINI(char) },
                ] as const).map(s => (
                  <CombatStatChip key={s.key} label={s.label} icon={s.icon} color={s.color} value={s.value} />
                ))}
              </div>

            </div>

            {/* ── Right column ── */}
            <div className="flex flex-col gap-3 p-4">

              {/* Talent section — alle Kategorien, alle Talente */}
              <div className="flex flex-col gap-3">
                {TALENT_CATEGORIES.map(cat => (
                  <div key={cat.key} className="rounded-xl border border-hairline bg-surface overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-hairline">
                      <CatIcon src={cat.icon} size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                    </div>
                    <div className="p-2 flex flex-col gap-1.5">
                      {cat.talents.map(t => {
                        const stored    = char.talents[t.name] ?? 0;
                        const bonus     = talentFixedBonus(char, t.name);
                        const effective = stored + bonus;
                        const isEmpty   = effective === 0;
                        const isCombat  = t.costMultiplier === 2;
                        const attrVals  = t.attrs
                          ? (t.attrs as readonly AttributeKey[]).map(a => char.attributes[a])
                          : null;
                        const prob = (!isCombat && attrVals && attrVals.length === 3)
                          ? calcSuccessProb(attrVals, effective)
                          : null;
                        const probPct   = prob !== null ? Math.round(prob * 100) : null;
                        const probColor = probPct === null ? '#888'
                          : probPct >= 80 ? '#4FA968'
                          : probPct >= 50 ? '#C89020'
                          : '#C84820';

                        return (
                          <div
                            key={t.name}
                            className="rounded-lg border overflow-hidden"
                            style={{
                              borderColor: isCombat ? `${cat.color}50` : `${cat.color}28`,
                              backgroundColor: isCombat ? `${cat.color}12` : `${cat.color}08`,
                              opacity: isEmpty ? 0.4 : 1,
                            }}
                          >
                            <div className="flex items-center gap-2 px-3 py-2">
                              <span className="flex-1 text-sm font-semibold truncate" style={{ color: cat.color }}>
                                {t.name}
                              </span>
                              {isCombat && (
                                <span className="text-[8px] font-bold uppercase tracking-wider text-faint border border-hairline rounded px-1 py-0.5">
                                  Kampf
                                </span>
                              )}
                              {!isCombat && t.attrs && (
                                <div className="flex items-center gap-0.5">
                                  {(t.attrs as readonly AttributeKey[]).map((a, ai) => {
                                    const meta = ATTR_MAP[a];
                                    return (
                                      <div
                                        key={ai}
                                        className="rounded-full overflow-hidden"
                                        style={{ width: 16, height: 16, border: `1px solid ${meta?.color ?? '#888'}55` }}
                                        title={meta?.name}
                                      >
                                        <img src={meta?.icon ?? ''} alt={a} className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <span className="font-mono font-bold text-sm text-paper">{effective}</span>
                            </div>
                            {prob !== null && !isEmpty && (
                              <div className="px-3 pb-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${(prob * 100).toFixed(1)}%`, backgroundColor: probColor }}
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] font-bold w-8 text-right" style={{ color: probColor }}>
                                    {probPct}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Specs section */}
              {(bonusSpecs.length > 0 || malusSpecs.length > 0) && (
                <div className="rounded-xl border border-hairline bg-surface overflow-hidden">
                  <div className="px-4 py-2 border-b border-hairline">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Spezifika</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#4FA968' }}>Vorteile</span>
                      {bonusSpecs.length === 0 ? (
                        <p className="text-faint text-[10px] italic">Keine</p>
                      ) : bonusSpecs.map(({ spec, slotLabel }) => (
                        <div
                          key={spec.name}
                          className="rounded-lg border px-2.5 py-2"
                          style={{ borderColor: '#4FA96840', backgroundColor: '#4FA96808' }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-semibold text-paper leading-tight">{spec.name}</span>
                            <span className="font-mono text-xs font-bold shrink-0" style={{ color: '#4FA968' }}>
                              {spec.modifier}
                            </span>
                          </div>
                          <span className="text-[9px] text-faint">{slotLabel}</span>
                          {spec.description && (
                            <p className="text-[9px] text-muted mt-0.5 leading-snug line-clamp-2">{spec.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#C83050' }}>Nachteile</span>
                      {malusSpecs.length === 0 ? (
                        <p className="text-faint text-[10px] italic">Keine</p>
                      ) : malusSpecs.map(({ spec, slotLabel }) => (
                        <div
                          key={spec.name}
                          className="rounded-lg border px-2.5 py-2"
                          style={{ borderColor: '#C8305040', backgroundColor: '#C8305008' }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-semibold text-paper leading-tight">{spec.name}</span>
                            <span className="font-mono text-xs font-bold shrink-0" style={{ color: '#C83050' }}>
                              +{spec.modifier}
                            </span>
                          </div>
                          <span className="text-[9px] text-faint">{slotLabel}</span>
                          {spec.description && (
                            <p className="text-[9px] text-muted mt-0.5 leading-snug line-clamp-2">{spec.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Special abilities */}
              {char.specialAbilities.length > 0 && (
                <div className="rounded-xl border border-hairline bg-surface overflow-hidden">
                  <div className="px-4 py-2 border-b border-hairline">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Besondere Fähigkeiten</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {char.specialAbilities.map(id => (
                      <span
                        key={id}
                        className="text-[10px] font-mono text-muted bg-raised border border-hairline px-2 py-1 rounded-lg"
                      >
                        {ABILITY_MAP[id]?.name ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
