import { useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { ATTRIBUTES, ATTR_MAX } from '../../data/attributes';
import { PROFESSIONS } from '../../data/professions';
import { TALENT_CATEGORIES, TALENT_CAT_MAP } from '../../data/talents';
import { attrPointsLeft, attrJobMin, stepCost } from '../../rules/attributeCost';
import { getCategoryOf, canAddSpec, talentFixedBonus } from '../../rules/talentBudget';
import { calcSuccessProb } from '../../rules/checks';
import { calcDerived } from '../../rules/derivedValues';
import type { AttributeKey, TalentCategory, Specification } from '../../types/character';
import { SpiderChart } from '../ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../ui/SpiderChart';
import { TalentTile, CatSummaryTile, AbilityTab, SpecialAbilitiesSection, CustomTalentForm, type TabKey } from './Tab4Talents';
import { SpecTile, CustomSpecForm } from './Tab7FreeSpecs';
import { SPECIFICATIONS } from '../../data/specifications';
import { CharacterInfoSection } from './CharacterInfoSection';
import { ProfessionSection } from './ProfessionSection';
import { RADAR_COLORS as C } from '../../data/radarConfig';


// ── Primary attr layout ───────────────────────────────────────────────────────
const ATTR_POSITIONS: Record<AttributeKey, {
  left: string; top: string;
  align: 'center' | 'left' | 'right';
  tip: 'up' | 'down' | 'left' | 'right';
}> = {
  KK: { left: '50%',   top: '8%',  align: 'center', tip: 'down'  },
  GE: { left: '86.4%', top: '29%', align: 'left',   tip: 'left'  },
  AU: { left: '86.4%', top: '71%', align: 'left',   tip: 'left'  },
  IN: { left: '50%',   top: '92%', align: 'center', tip: 'up'    },
  CH: { left: '13.6%', top: '71%', align: 'right',  tip: 'right' },
  MB: { left: '13.6%', top: '29%', align: 'right',  tip: 'right' },
};

// ── Combat attr layout ────────────────────────────────────────────────────────
type TipDir = 'up' | 'down' | 'left' | 'right';



// ── Colored tooltip helpers ───────────────────────────────────────────────────
// Short inline span with attribute color
function A({ k }: { k: keyof typeof C }) {
  return <span style={{ color: C[k] }}>{k}</span>;
}

function combatTooltip(key: string, color: string): ReactNode {
  switch (key) {
    case 'ATN': return <><span style={{color}}>Attacke Nahkampf</span>: (<A k="KK"/>+<A k="KK"/>+<A k="GE"/>) ÷ 3</>;
    case 'PA':  return <><span style={{color}}>Parade</span>: (<A k="KK"/>+<A k="AU"/>+<A k="GE"/>) ÷ 3</>;
    case 'ATD': return <><span style={{color}}>Attacke Distanz</span>: (<A k="GE"/>+<A k="GE"/>+<A k="AU"/>) ÷ 3</>;
    case 'INI': return <><span style={{color}}>Initiative</span>: (<A k="KK"/>+5) − <A k="GE"/>÷2</>;
    case 'LE':  return <><span style={{color}}>Lebensenergie</span>: (<A k="KK"/>×2 + <A k="AU"/>) × 3</>;
    case 'GG':  return <><span style={{color}}>Geist. Gesundheit</span>: (<A k="AU"/>+<A k="IN"/>+<A k="MB"/>×2) × 3</>;
    default:    return null;
  }
}


// ── Arrow layout — each axis's orthogonal direction ──────────────────────────
// rotate: CSS rotation for the + arrow image so it points outward along the
//         spider axis (0° = up). The − arrow uses the same rotation because
//         arrow_down is already the 180° counterpart of arrow_up.
// perpX/Y: unit vector perpendicular to the axis; + button is placed there,
//          − button on the opposite side.
const ARROW_META: Record<AttributeKey, { rotate: number; perpX: number; perpY: number }> = {
  KK: { rotate: 90,  perpX:  1,     perpY:  0     }, // axis up    → buttons left/right
  GE: { rotate: 150, perpX:  0.5,   perpY:  0.866 }, // axis NE   → buttons SE/NW
  AU: { rotate: 210, perpX: -0.5,   perpY:  0.866 }, // axis SE   → buttons SW/NE
  IN: { rotate: 270, perpX: -1,     perpY:  0     }, // axis down → buttons left/right
  CH: { rotate: 330, perpX: -0.5,   perpY: -0.866 }, // axis SW   → buttons NW/SE
  MB: { rotate: 30,  perpX:  0.5,   perpY: -0.866 }, // axis NW   → buttons NE/SW
};

const BTN_OFFSET = 36; // px: icon-center to button-center distance
const HEADER_H   = 44; // px: height of the collapsed attribute header row

// ── Combined (10-gon) chart data ──────────────────────────────────────────────
type CombatKey = 'ATN' | 'PA' | 'ATD' | 'INI' | 'LE' | 'GG';
type CombinedEntry =
  | { type: 'primary'; key: AttributeKey; color: string; icon: string; maxValue?: number }
  | { type: 'combat';  key: CombatKey;   color: string; icon: string; maxValue?: number };

const COMBINED_ENTRIES: CombinedEntry[] = [
  { type: 'primary', key: 'KK',  color: C.KK,  icon: '/icons/attr/kk.svg'  },  // 0°   primär  – oben
  { type: 'combat',  key: 'INI', color: C.INI, icon: '/icons/attr/ini.svg' },  // 30°  kampf   – KK+5−GE/2 (zwischen KK & GE)
  { type: 'primary', key: 'GE',  color: C.GE,  icon: '/icons/attr/ge.svg'  },  // 60°  primär
  { type: 'combat',  key: 'PA',  color: C.PA,  icon: '/icons/attr/pa.svg'  },  // 90°  kampf   – (KK+GE+AU)/3
  { type: 'primary', key: 'AU',  color: C.AU,  icon: '/icons/attr/au.svg'  },  // 120° primär
  { type: 'combat',  key: 'LE',  color: C.LE,  icon: '/icons/attr/le.svg',  maxValue: 180 }, // 150° kampf   – (KK×2+AU)×3
  { type: 'primary', key: 'IN',  color: C.IN,  icon: '/icons/attr/in.svg'  },  // 180° primär  – unten
  { type: 'combat',  key: 'GG',  color: C.GG,  icon: '/icons/attr/gg.svg',  maxValue: 240 }, // 210° kampf   – (AU+IN+MB×2)×3 (zwischen IN & MB)
  { type: 'primary', key: 'MB',  color: C.MB,  icon: '/icons/attr/mb.svg'  },  // 240° primär
  { type: 'combat',  key: 'ATD', color: C.ATD, icon: '/icons/attr/atd.svg' },  // 270° kampf   – (GE×2+AU)/3
  { type: 'primary', key: 'CH',  color: C.CH,  icon: '/icons/attr/ch.svg'  },  // 300° primär
  { type: 'combat',  key: 'ATN', color: C.ATN, icon: '/icons/attr/atn.svg' },  // 330° kampf   – (KK×2+GE)/3 (neben KK)
];

// Header display order: [6 primary] [4 combat] [LE, GG]
// Indices refer to positions in COMBINED_ENTRIES
// Groups are separated by an extra half-slot of space (TOTAL = 13 units)
const HEADER_ORDER = [
  0, 2, 4, 6, 8, 10,   // KK, GE, AU, IN, MB, CH  (primary)
  11, 3, 9, 1,          // ATN, PA, ATD, INI        (combat)
  5, 7,                 // LE, GG                   (derived)
];
function headerLeftPct(slot: number): string {
  const TOTAL = 13; // 12 items + 2 half-slot gaps
  const unit = slot < 6 ? slot + 0.5
             : slot < 10 ? slot + 1.0    // +0.5 gap after group 1
             :              slot + 1.5;  // +0.5 gap after group 2
  return `${(unit / TOTAL * 100).toFixed(1)}%`;
}
// Divider positions: midpoint between groups in the same unit scale
const HEADER_DIVIDER_PCTS = [
  ((5.5 + 1.0) / 2 / 13 * 100).toFixed(1),   // between primary and combat  ≈ 48%
  ((10.5 + 11.5) / 2 / 13 * 100).toFixed(1),  // between combat and derived  ≈ 84%
];

// Normalize an axis angle (degrees, clockwise from top) to [-90°, 90°] for readable text
function normRot(deg: number): number {
  let a = ((deg % 180) + 180) % 180; // into [0, 180)
  if (a > 90) a -= 180;               // into (-90, 90]
  return a;
}

function combinedGeom(i: number, n: number) {
  const θ = (i / n * 360 - 90) * (Math.PI / 180);
  const leftPct = 50 + Math.cos(θ) * 43;
  const topPct  = 50 + Math.sin(θ) * 43;
  // Radial direction: + arrow points away from center, − arrow toward center
  const perpX   = Math.cos(θ);
  const perpY   = Math.sin(θ);
  const rotate  = Math.round(i / n * 360);
  const dx = leftPct - 50, dy = topPct - 50;
  const tip: TipDir = Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? 'left' : 'right')
    : (dy > 0 ? 'up'   : 'down');
  return { leftPct, topPct, perpX, perpY, rotate, tip };
}

// ── Primary attribute control ─────────────────────────────────────────────────
function AttrControl({
  attrKey, value, minValue, pointsLeft, onDecrease, onIncrease, color, name, icon,
  overridePos, overrideArrow, textRotation = 0, mode = 'edit',
  collapsed = false, displayValue,
}: {
  attrKey: AttributeKey; value: number; minValue: number; pointsLeft: number;
  onDecrease: () => void; onIncrease: () => void; color: string; name: string; icon: string;
  overridePos?:   { left: string; top: string; align: 'center'|'left'|'right'; tip: TipDir };
  overrideArrow?: { rotate: number; perpX: number; perpY: number };
  textRotation?: number;
  mode?: 'edit' | 'fix';
  collapsed?: boolean;
  displayValue?: number;
}) {
  const [open, setOpen] = useState(false);
  const pos      = overridePos   ?? ATTR_POSITIONS[attrKey];
  const arrow    = overrideArrow ?? ARROW_META[attrKey];
  const cost     = stepCost(value);
  const prevCost = value > minValue ? stepCost(value - 1) : 0;
  const canInc   = value < ATTR_MAX && pointsLeft >= cost;
  const canDec   = value > minValue;

  const plusLabel  = cost >= 3     ? '+++' : cost === 2     ? '++' : '+';
  const minusLabel = prevCost >= 3 ? '−−−' : prevCost === 2 ? '−−' : '−';
  const plusSize   = cost >= 3     ? 'text-xs' : cost === 2     ? 'text-sm' : 'text-xl';
  const minusSize  = prevCost >= 3 ? 'text-xs' : prevCost === 2 ? 'text-sm' : 'text-xl';

  const px = Math.round(arrow.perpX * BTN_OFFSET);
  const py = Math.round(arrow.perpY * BTN_OFFSET);

  const tipPos: Record<TipDir, string> = {
    down:  'bottom-full left-1/2 -translate-x-1/2 mb-2',
    up:    'top-full left-1/2 -translate-x-1/2 mt-2',
    left:  'left-full top-1/2 -translate-y-1/2 ml-2',
    right: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  const sz   = collapsed ? 22 : 44;
  const half = sz / 2;
  const btnHidden = mode === 'fix' || collapsed;

  return (
    <div className="absolute overflow-visible" style={{
      left: pos.left,
      top:  pos.top,
      transition: 'left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* Chip-Rahmen — nur collapsed sichtbar */}
      <div style={{
        position: 'absolute',
        left: -(half + 3), top: -(half + 3),
        width: sz + 28, height: sz + 6,
        borderRadius: 7,
        border: (mode === 'fix' && canInc) ? '1px solid #8B2E2260' : `1px solid ${color}30`,
        backgroundColor: (mode === 'fix' && canInc) ? '#8B2E2208' : `${color}08`,
        boxShadow: (mode === 'fix' && canInc) ? '0 0 8px #8B2E2230' : 'none',
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 0.6s ease',
        pointerEvents: 'none',
      }} />

      {/* Icon medallion */}
      <div
        className="absolute"
        style={{
          width: sz, height: sz, left: -half, top: -half,
          transition: 'width 0.7s ease, height 0.7s ease, left 0.7s ease, top 0.7s ease',
        }}
        onMouseEnter={() => { if (!collapsed) setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="w-full h-full rounded-full overflow-hidden" style={{
          boxShadow: collapsed
            ? 'none'
            : `0 0 0 2px ${color}, 0 0 6px 1px ${color}aa, 0 0 14px 4px ${color}44`,
          transition: 'box-shadow 0.7s ease',
        }}>
          <img src={icon} alt={name} className="w-full h-full object-cover" />
        </div>
        {open && !collapsed && (
          <span className={`absolute z-30 ${tipPos[pos.tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
            <span style={{ color }}>{name}</span>
          </span>
        )}
      </div>

      {/* Value — rechts vom Icon, nur im collapsed Zustand */}
      <div style={{
        position: 'absolute',
        left: half + 3,
        top: -half,
        height: sz,
        display: 'flex',
        alignItems: 'center',
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color, lineHeight: 1 }}>
          {displayValue}
        </span>
      </div>

      {/* + button — green */}
      <button
        onClick={onIncrease}
        disabled={!canInc || btnHidden}
        className="absolute p-0 bg-transparent border-0 outline-none cursor-pointer"
        style={{ left: px - 14, top: py - 12, width: 28, height: 24, opacity: btnHidden ? 0 : 1, transition: 'opacity 0.25s ease', pointerEvents: btnHidden ? 'none' : 'auto' }}
      >
        <span
          className={`flex items-center justify-center w-full h-full font-bold ${plusSize} leading-none select-none`}
          style={{ color: '#3F6B3A', opacity: canInc ? 1 : 0.2, transform: `rotate(${textRotation}deg)` }}
        >
          {plusLabel}
        </span>
      </button>

      {/* − button — red */}
      <button
        onClick={onDecrease}
        disabled={!canDec || btnHidden}
        className="absolute p-0 bg-transparent border-0 outline-none cursor-pointer"
        style={{ left: -px - 14, top: -py - 12, width: 28, height: 24, opacity: btnHidden ? 0 : 1, transition: 'opacity 0.25s ease', pointerEvents: btnHidden ? 'none' : 'auto' }}
      >
        <span
          className={`flex items-center justify-center w-full h-full font-bold ${minusSize} leading-none select-none`}
          style={{ color: '#8B2E22', opacity: canDec ? 0.9 : 0.15, transform: `rotate(${textRotation}deg)` }}
        >
          {minusLabel}
        </span>
      </button>

    </div>
  );
}

// ── Combat attribute label ────────────────────────────────────────────────────
function CombatLabel({
  attrKey, color, icon, left, top, tip,
  collapsed = false, displayValue,
}: {
  attrKey: string; color: string; icon: string;
  left: string; top: string; tip: TipDir;
  collapsed?: boolean;
  displayValue?: number;
}) {
  const [open, setOpen] = useState(false);

  const tipPos: Record<TipDir, string> = {
    up:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    down:  'top-full left-1/2 -translate-x-1/2 mt-2',
    left:  'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const sz   = collapsed ? 22 : 44;
  const half = sz / 2;

  return (
    <div className="absolute overflow-visible" style={{
      left, top,
      transition: 'left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Chip-Rahmen — nur collapsed sichtbar */}
      <div style={{
        position: 'absolute',
        left: -(half + 3), top: -(half + 3),
        width: sz + 28, height: sz + 6,
        borderRadius: 7,
        border: `1px solid ${color}30`,
        backgroundColor: `${color}08`,
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 0.6s ease',
        pointerEvents: 'none',
      }} />
      {/* Icon */}
      <div
        className="absolute"
        style={{
          width: sz, height: sz, left: -half, top: -half,
          transition: 'width 0.7s ease, height 0.7s ease, left 0.7s ease, top 0.7s ease',
        }}
        onMouseEnter={() => { if (!collapsed) setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="w-full h-full rounded-full overflow-hidden" style={{
          boxShadow: collapsed
            ? 'none'
            : `0 0 0 2px ${color}, 0 0 6px 1px ${color}aa, 0 0 14px 4px ${color}44`,
          transition: 'box-shadow 0.7s ease',
        }}>
          <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
        </div>
        {open && !collapsed && (
          <span className={`absolute z-30 ${tipPos[tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
            {combatTooltip(attrKey, color)}
          </span>
        )}
      </div>
      {/* Value — rechts vom Icon, nur im collapsed Zustand */}
      <div style={{
        position: 'absolute',
        left: half + 3,
        top: -half,
        height: sz,
        display: 'flex',
        alignItems: 'center',
        opacity: collapsed ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color, lineHeight: 1 }}>
          {displayValue}
        </span>
      </div>
    </div>
  );
}


// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab3Attributes({ charId, mode = 'edit' }: { charId: string; mode?: 'edit' | 'fix' }) {
  const char           = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  const containerRef  = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure immediately — synchronous before paint
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setContainerWidth(initial);
    // Keep tracking for browser resize
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  const [talentDragOver,  setTalentDragOver]  = useState(false);
  const [specDragOver,    setSpecDragOver]    = useState(false);
  const [specPosDragOver, setSpecPosDragOver] = useState(false);
  const [specNegDragOver, setSpecNegDragOver] = useState(false);
  const [hobbyTalentDragOver,  setHobbyTalentDragOver]  = useState(false);
  const [hobbySpecDragOver,    setHobbySpecDragOver]    = useState(false);
  const [hobby2DragOver,       setHobby2DragOver]       = useState(false);
  const [expanded,        setExpanded]        = useState<'slots' | 'chart'>('chart');
  const [selectedTab,     setSelectedTab]     = useState<TabKey>(TALENT_CATEGORIES[0].key);
  const [showCustomForm,  setShowCustomForm]  = useState(false);
  const [showSpecForm,    setShowSpecForm]    = useState(false);

  if (!char) return null;

  const pointsLeft = attrPointsLeft(char);
  const derived    = calcDerived(char);

  function setAttr(key: AttributeKey, val: number) {
    patchCharacter(charId, c => { c.attributes[key] = val; });
  }

  const activeProfMeta  = PROFESSIONS.find(p => p.key === char.profession);
  const profColor       = activeProfMeta?.color ?? '#6B5233';

  const isAbilities = selectedTab === 'abilities';
  const activeCat   = isAbilities ? null : TALENT_CATEGORIES.find(c => c.key === selectedTab)!;

  const assignedTalentNames = new Set(
    [char.professionTalent, char.hobby1Talent, char.hobby2Talent].filter(Boolean) as string[]
  );
  const assignedSpecNames = new Set(
    [char.specProfession?.name, char.specFreePositive?.name, char.specFreeNegative?.name, char.specHobby1?.name].filter(Boolean) as string[]
  );

  const customInCat = activeCat
    ? char.customTalents.filter(t => t.category === selectedTab && !assignedTalentNames.has(t.name))
    : [];
  const visibleSpecs: Specification[] = isAbilities ? [] : [
    ...SPECIFICATIONS.filter(s => s.category === (selectedTab as TalentCategory) && !assignedSpecNames.has(s.name)),
    ...char.customSpecifications.filter(s => s.category === (selectedTab as TalentCategory) && !assignedSpecNames.has(s.name)),
  ];

  function selectedAsSpec(name: string): 'frei +' | 'frei −' | null {
    if (char!.specFreePositive?.name === name) return 'frei +';
    if (char!.specFreeNegative?.name === name) return 'frei −';
    return null;
  }
  function reservedAsSpec(name: string): 'beruf' | 'hobby' | null {
    if (char!.specProfession?.name === name) return 'beruf';
    if (char!.specHobby1?.name === name)     return 'hobby';
    return null;
  }
  function toggleSpec(spec: Specification) {
    const isMalus = spec.modifier < 0;
    const already = !!selectedAsSpec(spec.name);
    patchCharacter(charId, c => {
      if (isMalus) c.specFreeNegative = already ? null : spec;
      else         c.specFreePositive = already ? null : spec;
    });
  }

  function findTalentMeta(name: string) {
    for (const cat of TALENT_CATEGORIES) {
      const t = cat.talents.find(t => t.name === name);
      if (t) return { attrs: t.attrs, costMul: t.costMultiplier as 1 | 2, catColor: cat.color };
    }
    const ct = char!.customTalents.find(t => t.name === name);
    if (ct) {
      const cat = TALENT_CATEGORIES.find(c => c.key === ct.category);
      return { attrs: ct.attrs, costMul: ct.costMultiplier as 1 | 2, catColor: cat?.color ?? '#9C8560' };
    }
    return null;
  }

  function RemoveBtn({ onRemove, corner = 'top-right' }: {
    onRemove: () => void;
    corner?: 'top-right' | 'bottom-right' | 'bottom-left';
  }) {
    const pos = corner === 'bottom-right' ? 'bottom-1 right-1'
              : corner === 'bottom-left'  ? 'bottom-1 left-1'
              :                             'top-1 right-1';
    return (
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className={`absolute ${pos} z-20 w-5 h-5 rounded-full flex items-center justify-center`}
        style={{ backgroundColor: '#2B1D10CC', border: '1px solid #F2E7C630' }}
      >
        <span style={{ fontSize: 12, color: '#E7D8B2', lineHeight: 1 }}>×</span>
      </button>
    );
  }

  const combinedAxes: SpiderAxis[] = COMBINED_ENTRIES.map(entry => ({
    key: entry.key,
    value: entry.type === 'primary'
      ? char.attributes[entry.key as AttributeKey]
      : derived[entry.key as keyof typeof derived] as number,
    maxValue: entry.maxValue ?? 20,
    color: entry.color,
  }));

  // chevron SVG — points down when open, right when closed
  function Chevron({ open }: { open: boolean }) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: 'transform 0.25s ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
        <path d="M2 3.5l3 3 3-3" stroke="#E7D8B2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  const attrSectionJSX = (
    <div
      ref={containerRef}
      className="relative rounded-lg"
      style={{
        height: expanded === 'chart' ? Math.max(containerWidth, HEADER_H) : HEADER_H,
        overflow: 'hidden',
        transition: 'height 0.9s cubic-bezier(0.4,0,0.2,1), border-color 0.6s ease, box-shadow 0.3s ease',
        border: expanded === 'chart' ? '1px solid #2B1D1008' : '1px solid #2B1D100C',
        cursor: expanded !== 'chart' ? 'pointer' : 'default',
      }}
      onClick={expanded !== 'chart' ? () => setExpanded('chart') : undefined}
    >
      <div className="absolute" style={{ left: '17%', top: '17%', width: '66%', aspectRatio: '1', opacity: expanded === 'chart' ? 1 : 0, transition: 'opacity 0.6s ease 0.3s', pointerEvents: expanded === 'chart' ? 'auto' : 'none' }}>
        <SpiderChart axes={combinedAxes} size={140} gridValues={[5, 10, 14, 18]} showGridLabels showValueLabels chartId="combined" className="w-full h-full"
          colorZones={[{ from: 0, to: 5, color: '#6B7F94', opacity: 0.07 }, { from: 5, to: 14, color: '#93887A', opacity: 0.05 }, { from: 14, to: 18, color: '#8C6A1D', opacity: 0.10 }, { from: 18, to: 20, color: '#8B2E22', opacity: 0.13 }] as ColorZone[]} />
      </div>
      <div className="absolute pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: expanded === 'chart' && mode === 'edit' ? 1 : 0, transition: 'opacity 0.25s ease' }}>
        <div className="flex flex-col items-center leading-none">
          <span className="font-mono font-bold" style={{ fontSize: 22, color: pointsLeft > 0 ? '#6B5233' : '#8B2E22' }}>{pointsLeft}</span>
          <span className="text-[9px] tracking-widest uppercase" style={{ color: '#6B523380' }}>AP</span>
        </div>
      </div>
      {pointsLeft > 0 && (
        <div className="absolute pointer-events-none flex items-baseline gap-1 leading-none" style={{ right: 8, top: '50%', transform: 'translateY(-50%)', opacity: expanded !== 'chart' ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <span className="font-mono font-bold" style={{ fontSize: mode === 'fix' ? 15 : 11, color: mode === 'fix' ? '#8B2E22' : '#6B5233' }}>{pointsLeft}</span>
          <span style={{ fontSize: mode === 'fix' ? 8 : 7, color: mode === 'fix' ? '#8B2E2280' : '#6B523360', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AP</span>
        </div>
      )}
      {HEADER_DIVIDER_PCTS.map(pct => (
        <div key={pct} style={{ position: 'absolute', left: `${pct}%`, top: '15%', bottom: '15%', width: 1, background: 'linear-gradient(to bottom, transparent, #2B1D1018 30%, #2B1D1018 70%, transparent)', opacity: expanded !== 'chart' ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }} />
      ))}
      {HEADER_ORDER.map((entryIdx, headerSlot) => {
        const entry = COMBINED_ENTRIES[entryIdx];
        const { leftPct, topPct, perpX, perpY, rotate, tip } = combinedGeom(entryIdx, COMBINED_ENTRIES.length);
        const collapsed = expanded !== 'chart';
        const left = collapsed ? headerLeftPct(headerSlot) : `${leftPct.toFixed(1)}%`;
        const top  = collapsed ? '50%' : `${topPct.toFixed(1)}%`;
        if (entry.type === 'primary') {
          const meta = ATTRIBUTES.find(a => a.key === entry.key)!;
          const val  = char.attributes[entry.key];
          const minVal = attrJobMin(char, entry.key);
          return (
            <AttrControl key={entry.key} attrKey={entry.key} value={val} minValue={minVal} pointsLeft={pointsLeft}
              onDecrease={() => setAttr(entry.key, Math.max(minVal, val - 1))}
              onIncrease={() => setAttr(entry.key, Math.min(ATTR_MAX, val + 1))}
              color={entry.color} name={meta.name} icon={entry.icon}
              overridePos={{ left, top, align: 'center', tip }}
              overrideArrow={{ rotate, perpX, perpY }}
              textRotation={normRot(rotate)} mode={mode} collapsed={collapsed}
              displayValue={combinedAxes[entryIdx].value} />
          );
        }
        return (
          <CombatLabel key={entry.key} attrKey={entry.key} color={entry.color} icon={entry.icon}
            left={left} top={top} tip={tip} collapsed={collapsed} displayValue={combinedAxes[entryIdx].value} />
        );
      })}
      <button onClick={e => { e.stopPropagation(); setExpanded('slots'); }}
        style={{ position: 'absolute', top: 6, right: 6, zIndex: 20, opacity: expanded === 'chart' ? 1 : 0, pointerEvents: expanded === 'chart' ? 'auto' : 'none', transition: 'opacity 0.2s ease 0.1s', padding: 4, backgroundColor: '#2B1D1080', border: '1px solid #F2E7C630', borderRadius: 6 }}>
        <Chevron open={true} />
      </button>
    </div>
  );

  const catTabsJSX = (
    <div className="flex gap-1">
      {TALENT_CATEGORIES.map((cat, i) => (
        <CatSummaryTile key={cat.key} charId={charId} cat={cat} index={i} total={TALENT_CATEGORIES.length + 1}
          isActive={selectedTab === cat.key}
          onClick={() => { setSelectedTab(cat.key); setShowCustomForm(false); setExpanded('slots'); }}
          mode={mode} />
      ))}
      <AbilityTab charId={charId} isActive={selectedTab === 'abilities'}
        onClick={() => { setSelectedTab('abilities'); setShowCustomForm(false); setExpanded('slots'); }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-2 p-4">

      {/* ── Identity + Berufsklassen — nebeneinander ── */}
      <div className={mode === 'fix' ? 'flex gap-2 items-start' : 'flex gap-2 items-stretch'}>
        <CharacterInfoSection charId={charId} mode={mode} />
        <ProfessionSection charId={charId} mode={mode}>
          {mode === 'fix' && attrSectionJSX}
          {mode === 'fix' && catTabsJSX}
        </ProfessionSection>
      </div>

      {/* ── Attribute section: morphing header ↔ chart (edit mode only — fix mode renders inside profession column) ── */}
      {mode !== 'fix' && <div
        ref={containerRef}
        className="relative rounded-lg"
        style={{
          height: expanded === 'chart' ? Math.max(containerWidth, HEADER_H) : HEADER_H,
          overflow: 'hidden',
          transition: 'height 0.9s cubic-bezier(0.4,0,0.2,1), border-color 0.6s ease, box-shadow 0.3s ease',
          border: expanded === 'chart' ? '1px solid #2B1D1008' : '1px solid #2B1D100C',
          cursor: expanded !== 'chart' ? 'pointer' : 'default',
        }}
        onClick={expanded !== 'chart' ? () => setExpanded('chart') : undefined}
      >
        {/* Spider chart — fades in as container expands */}
        <div className="absolute" style={{
          left: '17%', top: '17%', width: '66%', aspectRatio: '1',
          opacity: expanded === 'chart' ? 1 : 0,
          transition: 'opacity 0.6s ease 0.3s',
          pointerEvents: expanded === 'chart' ? 'auto' : 'none',
        }}>
          <SpiderChart
            axes={combinedAxes}
            size={140}
            gridValues={[5, 10, 14, 18]}
            showGridLabels
            showValueLabels
            chartId="combined"
            className="w-full h-full"
            colorZones={[
              { from:  0, to:  5, color: '#6B7F94', opacity: 0.07 },
              { from:  5, to: 14, color: '#93887A', opacity: 0.05 },
              { from: 14, to: 18, color: '#8C6A1D', opacity: 0.10 },
              { from: 18, to: 20, color: '#8B2E22', opacity: 0.13 },
            ] as ColorZone[]}
          />
        </div>

        {/* Remaining AP — center overlay, edit + expanded only */}
        <div className="absolute pointer-events-none" style={{
          left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          opacity: expanded === 'chart' && mode === 'edit' ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}>
          <div className="flex flex-col items-center leading-none">
            <span className="font-mono font-bold" style={{ fontSize: 22, color: pointsLeft > 0 ? '#6B5233' : '#8B2E22' }}>
              {pointsLeft}
            </span>
            <span className="text-[9px] tracking-widest uppercase" style={{ color: '#6B523380' }}>AP</span>
          </div>
        </div>

        {/* Remaining AP — collapsed header, left edge, only when > 0 */}
        {pointsLeft > 0 && (
          <div className="absolute pointer-events-none flex flex-col items-center leading-none" style={{
            left: 6, top: '50%', transform: 'translateY(-50%)',
            opacity: expanded !== 'chart' ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            <span className="font-mono font-bold" style={{ fontSize: 11, color: '#6B5233' }}>{pointsLeft}</span>
            <span style={{ fontSize: 7, color: '#6B523360', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AP</span>
          </div>
        )}

        {/* Group dividers — visible only in collapsed header */}
        {HEADER_DIVIDER_PCTS.map(pct => (
          <div key={pct} style={{
            position: 'absolute', left: `${pct}%`, top: '15%', bottom: '15%', width: 1,
            background: 'linear-gradient(to bottom, transparent, #2B1D1018 30%, #2B1D1018 70%, transparent)',
            opacity: expanded !== 'chart' ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }} />
        ))}

        {/* 12 icons — header order: [primary] [combat] [LE, GG]; chart order: COMBINED_ENTRIES index */}
        {HEADER_ORDER.map((entryIdx, headerSlot) => {
          const entry = COMBINED_ENTRIES[entryIdx];
          const { leftPct, topPct, perpX, perpY, rotate, tip } = combinedGeom(entryIdx, COMBINED_ENTRIES.length);
          const collapsed = expanded !== 'chart';
          const left = collapsed ? headerLeftPct(headerSlot) : `${leftPct.toFixed(1)}%`;
          const top  = collapsed ? '50%'                     : `${topPct.toFixed(1)}%`;

          if (entry.type === 'primary') {
            const meta   = ATTRIBUTES.find(a => a.key === entry.key)!;
            const val    = char.attributes[entry.key];
            const minVal = attrJobMin(char, entry.key);
            return (
              <AttrControl
                key={entry.key}
                attrKey={entry.key}
                value={val}
                minValue={minVal}
                pointsLeft={pointsLeft}
                onDecrease={() => setAttr(entry.key, Math.max(minVal, val - 1))}
                onIncrease={() => setAttr(entry.key, Math.min(ATTR_MAX, val + 1))}
                color={entry.color}
                name={meta.name}
                icon={entry.icon}
                overridePos={{ left, top, align: 'center', tip }}
                overrideArrow={{ rotate, perpX, perpY }}
                textRotation={normRot(rotate)}
                mode={mode}
                collapsed={collapsed}
                displayValue={combinedAxes[entryIdx].value}
              />
            );
          }

          return (
            <CombatLabel
              key={entry.key}
              attrKey={entry.key}
              color={entry.color}
              icon={entry.icon}
              left={left}
              top={top}
              tip={tip}
              collapsed={collapsed}
              displayValue={combinedAxes[entryIdx].value}
            />
          );
        })}

        {/* Collapse button — top-right corner, visible when expanded */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded('slots'); }}
          style={{
            position: 'absolute', top: 6, right: 6, zIndex: 20,
            opacity: expanded === 'chart' ? 1 : 0,
            pointerEvents: expanded === 'chart' ? 'auto' : 'none',
            transition: 'opacity 0.2s ease 0.1s',
            padding: 4,
            backgroundColor: '#2B1D1080',
            border: '1px solid #F2E7C630',
            borderRadius: 6,
          }}
        >
          <Chevron open={true} />
        </button>
      </div>}

      {/* ── Section header: Kategorie-Tabs (edit mode only) ── */}
      {mode !== 'fix' && catTabsJSX}

      {/* ── Slots content ── */}
      <div style={{ maxHeight: expanded === 'slots' ? 4000 : 0, overflow: 'hidden', opacity: expanded === 'slots' ? 1 : 0, transition: 'max-height 0.5s ease, opacity 0.3s ease' }}>
        <div className="flex flex-col gap-3 pb-1">

          {/* ── Talent & Spec browser — fixer Slot-Kopf + Kategorie-Tiles ── */}
          {isAbilities ? (
            <div className="flex flex-col gap-1.5">
              <SpecialAbilitiesSection charId={charId} />
            </div>
          ) : (() => {
            if (!activeCat) return null;
            const hasTalent  = !!char.hobby1Talent;
            const hasSpec    = !!char.specHobby1;
            const hasAnything = hasTalent || hasSpec;
            const hasHobby2  = !!char.hobby2Talent;
            const talentMeta = hasTalent ? findTalentMeta(char.hobby1Talent!) : null;
            const specCat    = hasSpec ? TALENT_CATEGORIES.find(c => c.key === char.specHobby1!.category) : null;
            const hobbyColor = hasAnything
              ? (hasTalent ? (talentMeta?.catColor ?? '#6B5233') : (specCat?.color ?? '#6B5233'))
              : '#6B5233';
            const hobby2Meta = hasHobby2 ? findTalentMeta(char.hobby2Talent!) : null;

            return (
              <>
<div className={mode === 'fix' ? 'grid grid-cols-4 gap-2 items-start' : 'flex gap-2 items-start'}>

                {/* ── Links: Talente ── */}
                <div className={mode === 'fix' ? 'col-span-4 min-w-0' : 'flex-1 flex flex-col gap-1.5 min-w-0'}>

                  {/* Beruf Talent — nur im edit mode als eigene Slot-Card */}
                  {mode !== 'fix' && (
                  <div className="relative rounded-lg border transition-colors overflow-hidden"
                    style={{
                      borderColor:     talentDragOver ? `${profColor}90` : char.professionTalent ? 'transparent' : '#9C856030',
                      backgroundColor: char.professionTalent ? 'transparent' : '#9C856006',
                      outline:         talentDragOver ? `1.5px dashed ${profColor}` : 'none',
                      minHeight:       char.professionTalent ? 0 : 40,
                    }}
                    onDragOver={e => { if (mode !== 'edit') return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setTalentDragOver(true); }}
                    onDragLeave={() => setTalentDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setTalentDragOver(false);
                      const name = e.dataTransfer.getData('application/x-tears-talent');
                      if (name) patchCharacter(charId, c => { c.professionTalent = name; });
                    }}
                  >
                    {char.professionTalent ? (() => {
                      const meta = findTalentMeta(char.professionTalent);
                      if (!meta) return null;
                      return <>
                        <TalentTile charId={charId} talentName={char.professionTalent}
                          attrs={meta.attrs} costMul={meta.costMul} isCustom={false}
                          catColor={meta.catColor} mode={mode} />
                        <RemoveBtn corner="bottom-left" onRemove={() => patchCharacter(charId, c => { c.professionTalent = null; })} />
                      </>;
                    })() : (
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: `${profColor}50` }}>Beruf · Talent</span>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Hobby1 Talent — nur im edit mode als eigene Slot-Card */}
                  {mode !== 'fix' && (hasTalent && talentMeta ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <TalentTile charId={charId} talentName={char.hobby1Talent!}
                        attrs={talentMeta.attrs} costMul={talentMeta.costMul} isCustom={false}
                        catColor={talentMeta.catColor} mode={mode} />
                      <RemoveBtn corner="bottom-left" onRemove={() => patchCharacter(charId, c => { c.hobby1Talent = null; })} />
                    </div>
                  ) : (
                    <div className="relative rounded-lg border transition-colors overflow-hidden"
                      style={{
                        borderColor:     hobbyTalentDragOver ? `${hobbyColor}90` : `${hobbyColor}35`,
                        backgroundColor: hobbyTalentDragOver ? `${hobbyColor}18` : `${hobbyColor}08`,
                        outline:         hobbyTalentDragOver ? `1.5px dashed ${hobbyColor}` : 'none',
                        minHeight: 40,
                      }}
                      onDragOver={e => {
                        if (mode !== 'edit' || !e.dataTransfer.types.includes('application/x-tears-talent')) return;
                        e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setHobbyTalentDragOver(true);
                      }}
                      onDragLeave={() => setHobbyTalentDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setHobbyTalentDragOver(false);
                        const name = e.dataTransfer.getData('application/x-tears-talent');
                        if (!name) return;
                        patchCharacter(charId, c => {
                          c.hobby1Talent = name;
                          if (c.specHobby1 && getCategoryOf(c, name) !== c.specHobby1.category) c.specHobby1 = null;
                        });
                      }}
                    >
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: `${hobbyColor}60` }}>Hobby +5TP</span>
                      </div>
                    </div>
                  ))}

                  {/* Hobby2 Talent — nur im edit mode als eigene Slot-Card */}
                  {mode !== 'fix' && hasAnything && (hasHobby2 && hobby2Meta ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <TalentTile charId={charId} talentName={char.hobby2Talent!}
                        attrs={hobby2Meta.attrs} costMul={hobby2Meta.costMul} isCustom={false}
                        catColor={hobby2Meta.catColor} mode={mode} />
                      <RemoveBtn corner="bottom-left" onRemove={() => patchCharacter(charId, c => { c.hobby2Talent = null; })} />
                    </div>
                  ) : (
                    <div className="relative rounded-lg border transition-colors overflow-hidden"
                      style={{
                        borderColor:     hobby2DragOver ? '#6B523390' : '#9C856030',
                        backgroundColor: '#9C856006',
                        outline:         hobby2DragOver ? '1.5px dashed #6B5233' : 'none',
                        minHeight: 40,
                      }}
                      onDragOver={e => {
                        if (mode !== 'edit' || !e.dataTransfer.types.includes('application/x-tears-talent')) return;
                        e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setHobby2DragOver(true);
                      }}
                      onDragLeave={() => setHobby2DragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setHobby2DragOver(false);
                        const name = e.dataTransfer.getData('application/x-tears-talent');
                        if (name) patchCharacter(charId, c => { c.hobby2Talent = name; });
                      }}
                    >
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#6B523350' }}>2. Hobby +3TP</span>
                      </div>
                    </div>
                  ))}

                  {/* Separator */}
                  {mode === 'edit' && <div style={{ height: 1, background: 'linear-gradient(to right, #2B1D1022, #2B1D1010)', borderRadius: 1, margin: '2px 0' }} />}

                  {/* Kategorie-Talente */}
                  {(() => {
                    const all = mode === 'fix'
                      ? [
                          ...TALENT_CATEGORIES.flatMap(cat =>
                            cat.talents.filter(t => !assignedTalentNames.has(t.name))
                              .map(t => ({ name: t.name, attrs: t.attrs, costMul: t.costMultiplier, isCustom: false, catColor: cat.color }))
                          ),
                          ...char.customTalents.filter(ct => !assignedTalentNames.has(ct.name))
                            .map(ct => ({ name: ct.name, attrs: ct.attrs, costMul: ct.costMultiplier, isCustom: true, catColor: (TALENT_CAT_MAP as Record<string, { color: string }>)[ct.category]?.color ?? '#6B5233' })),
                        ]
                      : [
                          ...activeCat.talents.filter(t => !assignedTalentNames.has(t.name))
                            .map(t => ({ name: t.name, attrs: t.attrs, costMul: t.costMultiplier, isCustom: false, catColor: activeCat.color })),
                          ...customInCat.map(ct => ({ name: ct.name, attrs: ct.attrs, costMul: ct.costMultiplier, isCustom: true, catColor: activeCat.color })),
                        ];
                    const sorted = mode === 'fix'
                      ? [...all].sort((a, b) => {
                          const combatA = a.costMul === 2 ? 1 : 0;
                          const combatB = b.costMul === 2 ? 1 : 0;
                          if (combatA !== combatB) return combatA - combatB;
                          const effA = (char.talents[a.name] ?? 0) + talentFixedBonus(char, a.name);
                          const effB = (char.talents[b.name] ?? 0) + talentFixedBonus(char, b.name);
                          const valsA = a.attrs ? (a.attrs as string[]).map(k => char.attributes[k as AttributeKey]) : null;
                          const valsB = b.attrs ? (b.attrs as string[]).map(k => char.attributes[k as AttributeKey]) : null;
                          const pA = (valsA && valsA.length === 3) ? calcSuccessProb(valsA, effA) : effA;
                          const pB = (valsB && valsB.length === 3) ? calcSuccessProb(valsB, effB) : effB;
                          return pB - pA;
                        })
                      : all;
                    if (mode !== 'fix') return sorted.map(t => (
                      <TalentTile key={t.name} charId={charId} talentName={t.name}
                        attrs={t.attrs} costMul={t.costMul} isCustom={t.isCustom}
                        catColor={t.catColor} mode={mode} />
                    ));

                    const profMeta = char.professionTalent ? findTalentMeta(char.professionTalent) : null;
                    const emptySlot = (label: string, color: string) => (
                      <div className="relative rounded-lg border flex items-center justify-center"
                        style={{ borderColor: '#8B2E2260', boxShadow: '0 0 8px #8B2E2230', backgroundColor: `${color}08`, minHeight: 40 }}>
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: `${color}60` }}>{label}</span>
                      </div>
                    );
                    const makeTile = (t: typeof sorted[0]) => (
                      <TalentTile key={t.name} charId={charId} talentName={t.name}
                        attrs={t.attrs} costMul={t.costMul} isCustom={t.isCustom}
                        catColor={t.catColor} mode={mode} />
                    );
                    const nonCombatTiles = sorted.filter(t => t.costMul !== 2).map(makeTile);
                    const combatTiles    = sorted.filter(t => t.costMul === 2).map(makeTile);
                    return (
                      <div className="grid grid-cols-4 gap-1">
                        {/* Spezifika-Slots — Zeile 1, alle 4 Spalten */}
                        {char.specProfession
                          ? <SpecTile key="slot-spec-beruf" spec={char.specProfession} selectedAs={null} reservedAs={null} onToggle={() => {}} showIcon={false} mode={mode} />
                          : emptySlot('Beruf · Spezifikum', profColor)}
                        {hasSpec
                          ? <SpecTile key="slot-spec-hobby1" spec={char.specHobby1!} selectedAs={null} reservedAs={null} onToggle={() => {}} showIcon={false} mode={mode} />
                          : emptySlot('Hobby Spezifikum', hobbyColor)}
                        {char.specFreePositive
                          ? <SpecTile key="slot-spec-pos" spec={char.specFreePositive} selectedAs={null} reservedAs={null} onToggle={() => {}} showIcon={false} mode={mode} />
                          : emptySlot('frei +', '#3F6B3A')}
                        {char.specFreeNegative
                          ? <SpecTile key="slot-spec-neg" spec={char.specFreeNegative} selectedAs={null} reservedAs={null} onToggle={() => {}} showIcon={false} mode={mode} />
                          : emptySlot('frei −', '#8B2E22')}
                        {/* Linke 3 Spalten: Talent-Slots + normale Talente */}
                        <div className="col-span-3 grid grid-cols-3 gap-1 content-start">
                          {profMeta
                            ? <TalentTile key="slot-beruf" charId={charId} talentName={char.professionTalent!} attrs={profMeta.attrs} costMul={profMeta.costMul} isCustom={false} catColor={profMeta.catColor} mode={mode} />
                            : emptySlot('Beruf · Talent', profColor)}
                          {hasTalent && talentMeta
                            ? <TalentTile key="slot-hobby1" charId={charId} talentName={char.hobby1Talent!} attrs={talentMeta.attrs} costMul={talentMeta.costMul} isCustom={false} catColor={talentMeta.catColor} mode={mode} />
                            : emptySlot('Hobby +5TP', hobbyColor)}
                          {hasAnything && (hasHobby2 && hobby2Meta
                            ? <TalentTile key="slot-hobby2" charId={charId} talentName={char.hobby2Talent!} attrs={hobby2Meta.attrs} costMul={hobby2Meta.costMul} isCustom={false} catColor={hobby2Meta.catColor} mode={mode} />
                            : emptySlot('2. Hobby +3TP', '#6B5233'))}
                          {nonCombatTiles}
                        </div>
                        {/* 4. Spalte: Kampftalente */}
                        <div className="flex flex-col gap-1">
                          {combatTiles}
                        </div>
                      </div>
                    );
                  })()}
                  {mode === 'edit' && (showCustomForm ? (
                    <CustomTalentForm catKey={selectedTab as TalentCategory} charId={charId} onClose={() => setShowCustomForm(false)} />
                  ) : (
                    <button
                      onClick={() => setShowCustomForm(true)}
                      className="flex items-center justify-center rounded-lg border border-dashed transition-colors hover:opacity-80"
                      style={{ borderColor: `${activeCat.color}40`, backgroundColor: `${activeCat.color}06`, minHeight: 40 }}
                    >
                      <span className="text-xl leading-none" style={{ color: `${activeCat.color}60` }}>+</span>
                    </button>
                  ))}
                </div>

                {/* ── Rechts: Spezifika (nur edit mode) ── */}
                {mode === 'edit' && (
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">

                  {/* Beruf Spezifikum */}
                  <div className="relative rounded-lg border transition-colors overflow-hidden"
                    style={{
                      borderColor:     specDragOver ? `${profColor}90` : char.specProfession ? 'transparent' : '#9C856030',
                      backgroundColor: char.specProfession ? 'transparent' : '#9C856006',
                      outline:         specDragOver ? `1.5px dashed ${profColor}` : 'none',
                      minHeight:       char.specProfession ? 0 : 40,
                    }}
                    onDragOver={e => { if (mode !== 'edit') return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setSpecDragOver(true); }}
                    onDragLeave={() => setSpecDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setSpecDragOver(false);
                      const json = e.dataTransfer.getData('application/x-tears-spec');
                      if (json) {
                        const spec = JSON.parse(json) as Specification;
                        if (!canAddSpec(char, spec, char.specProfession)) return;
                        patchCharacter(charId, c => { c.specProfession = spec; });
                      }
                    }}
                  >
                    {char.specProfession ? (
                      <>
                        <SpecTile spec={char.specProfession} selectedAs={null} reservedAs={null}
                          onToggle={() => patchCharacter(charId, c => { c.specProfession = null; })}
                          showIcon={false} mode={mode} />
                        <RemoveBtn corner="bottom-right" onRemove={() => patchCharacter(charId, c => { c.specProfession = null; })} />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: `${profColor}50` }}>Beruf · Spezifikum</span>
                      </div>
                    )}
                  </div>

                  {/* Hobby1 Spezifikum */}
                  {hasSpec ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <SpecTile spec={char.specHobby1!} selectedAs={null} reservedAs={null}
                        onToggle={() => patchCharacter(charId, c => { c.specHobby1 = null; })}
                        showIcon={false} mode={mode} />
                      <RemoveBtn corner="bottom-right" onRemove={() => patchCharacter(charId, c => { c.specHobby1 = null; })} />
                    </div>
                  ) : (
                    <div className="relative rounded-lg border transition-colors overflow-hidden"
                      style={{
                        borderColor:     hobbySpecDragOver ? `${hobbyColor}90` : `${hobbyColor}35`,
                        backgroundColor: hobbySpecDragOver ? `${hobbyColor}18` : `${hobbyColor}08`,
                        outline:         hobbySpecDragOver ? `1.5px dashed ${hobbyColor}` : 'none',
                        minHeight: 40,
                      }}
                      onDragOver={e => {
                        if (mode !== 'edit' || !e.dataTransfer.types.includes('application/x-tears-spec')) return;
                        e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setHobbySpecDragOver(true);
                      }}
                      onDragLeave={() => setHobbySpecDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setHobbySpecDragOver(false);
                        const json = e.dataTransfer.getData('application/x-tears-spec');
                        if (!json) return;
                        patchCharacter(charId, c => {
                          const spec = JSON.parse(json) as Specification;
                          c.specHobby1 = spec;
                          if (c.hobby1Talent && getCategoryOf(c, c.hobby1Talent) !== spec.category) c.hobby1Talent = null;
                        });
                      }}
                    >
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: `${hobbyColor}60` }}>Hobby Spezifikum</span>
                      </div>
                    </div>
                  )}

                  {/* frei + */}
                  <div className="relative rounded-lg border transition-colors overflow-hidden"
                    style={{
                      borderColor:     specPosDragOver ? '#3F6B3A90' : char.specFreePositive ? 'transparent' : '#9C856030',
                      backgroundColor: char.specFreePositive ? 'transparent' : '#9C856006',
                      outline:         specPosDragOver ? '1.5px dashed #3F6B3A' : 'none',
                      minHeight:       char.specFreePositive ? 0 : 40,
                    }}
                    onDragOver={e => {
                      if (mode !== 'edit' || !e.dataTransfer.types.includes('application/x-tears-spec-pos')) return;
                      e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setSpecPosDragOver(true);
                    }}
                    onDragLeave={() => setSpecPosDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setSpecPosDragOver(false);
                      const json = e.dataTransfer.getData('application/x-tears-spec');
                      if (json) { const spec = JSON.parse(json); if (spec.modifier > 0) patchCharacter(charId, c => { c.specFreePositive = spec; }); }
                    }}
                  >
                    {char.specFreePositive ? (
                      <>
                        <SpecTile spec={char.specFreePositive} selectedAs={null} reservedAs={null}
                          onToggle={() => patchCharacter(charId, c => { c.specFreePositive = null; })}
                          showIcon={false} mode={mode} />
                        <RemoveBtn corner="bottom-right" onRemove={() => patchCharacter(charId, c => { c.specFreePositive = null; })} />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#3F6B3A50' }}>frei +</span>
                      </div>
                    )}
                  </div>

                  {/* frei − */}
                  <div className="relative rounded-lg border transition-colors overflow-hidden"
                    style={{
                      borderColor:     specNegDragOver ? '#8B2E2290' : char.specFreeNegative ? 'transparent' : '#9C856030',
                      backgroundColor: char.specFreeNegative ? 'transparent' : '#9C856006',
                      outline:         specNegDragOver ? '1.5px dashed #8B2E22' : 'none',
                      minHeight:       char.specFreeNegative ? 0 : 40,
                    }}
                    onDragOver={e => {
                      if (mode !== 'edit' || !e.dataTransfer.types.includes('application/x-tears-spec-neg')) return;
                      e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setSpecNegDragOver(true);
                    }}
                    onDragLeave={() => setSpecNegDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setSpecNegDragOver(false);
                      const json = e.dataTransfer.getData('application/x-tears-spec');
                      if (json) {
                        const spec = JSON.parse(json) as Specification;
                        if (spec.modifier < 0 && canAddSpec(char, spec, char.specFreeNegative)) {
                          patchCharacter(charId, c => { c.specFreeNegative = spec; });
                        }
                      }
                    }}
                  >
                    {char.specFreeNegative ? (
                      <>
                        <SpecTile spec={char.specFreeNegative} selectedAs={null} reservedAs={null}
                          onToggle={() => patchCharacter(charId, c => { c.specFreeNegative = null; })}
                          showIcon={false} mode={mode} />
                        <RemoveBtn corner="bottom-right" onRemove={() => patchCharacter(charId, c => { c.specFreeNegative = null; })} />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full py-2.5">
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#8B2E2250' }}>frei −</span>
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div style={{ height: 1, background: 'linear-gradient(to right, #2B1D1022, #2B1D1010)', borderRadius: 1, margin: '2px 0' }} />

                  {/* Kategorie-Spezifika */}
                  {visibleSpecs.map(spec => (
                    <SpecTile key={spec.name} spec={spec}
                      selectedAs={selectedAsSpec(spec.name)}
                      reservedAs={reservedAsSpec(spec.name)}
                      onToggle={() => toggleSpec(spec)}
                      showIcon={false} mode={mode} />
                  ))}
                  {showSpecForm ? (
                    <CustomSpecForm charId={charId} onClose={() => setShowSpecForm(false)} />
                  ) : (
                    <button
                      onClick={() => setShowSpecForm(true)}
                      className="flex items-center justify-center rounded-lg border border-dashed transition-colors hover:opacity-80"
                      style={{ borderColor: `${activeCat.color}40`, backgroundColor: `${activeCat.color}06`, minHeight: 40 }}
                    >
                      <span className="text-xl leading-none" style={{ color: `${activeCat.color}60` }}>+</span>
                    </button>
                  )}
                </div>
                )}

              </div>
              </>
            );
          })()}

        </div>
      </div>

    </div>
  );
}
