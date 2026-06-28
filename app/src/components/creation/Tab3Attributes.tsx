import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { ATTRIBUTES, ATTR_MAX } from '../../data/attributes';
import { PROFESSIONS, PROFESSION_MAP } from '../../data/professions';
import { TALENT_CATEGORIES, TALENT_CAT_MAP } from '../../data/talents';
import { attrPointsLeft, attrJobMin, stepCost } from '../../rules/attributeCost';
import { getCategoryOf, canAddSpec, talentFixedBonus } from '../../rules/talentBudget';
import { calcSuccessProb } from '../../rules/checks';
import { calcDerived } from '../../rules/derivedValues';
import type { AttributeKey, TalentCategory, Specification } from '../../types/character';
import { CatIcon } from '../ui/CatIcon';
import { SpiderChart } from '../ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../ui/SpiderChart';
import { TalentTile, CatSummaryTile, AbilityTab, SpecialAbilitiesSection, CustomTalentForm, type TabKey } from './Tab4Talents';
import { SpecTile, CustomSpecForm } from './Tab7FreeSpecs';
import { SPECIFICATIONS } from '../../data/specifications';


// ── Gender options ────────────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { key: 'männlich',    label: 'Männlich',    icon: '/icons/attr/id_maennlich.png' },
  { key: 'weiblich',   label: 'Weiblich',    icon: '/icons/attr/id_weiblich.png' },
  { key: 'divers',     label: 'Divers',      icon: '/icons/attr/id_divers.png' },
  { key: 'nonbinär',  label: 'Nonbinär',    icon: '/icons/attr/id_nonbinaer.png' },
  { key: 'agender',    label: 'Agender',     icon: '/icons/attr/id_agender.png' },
  { key: 'genderfluid',label: 'Genderfluid', icon: '/icons/attr/id_genderfluid.png' },
  { key: 'asexuell',   label: 'Asexuell',   icon: '/icons/attr/id_asexuell.png' },
  { key: 'unbekannt',  label: 'Unbekannt',  icon: '/icons/attr/id_unknown.png' },
];

function GenderOverlay({ value, onSelect, onClose, anchorRect }: {
  value: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  function handleClose() { setVisible(false); setTimeout(onClose, 140); }
  const cardStyle = anchorRect ? {
    position: 'fixed' as const,
    top: anchorRect.top, left: anchorRect.left,
    transformOrigin: 'top left',
    transform: visible ? 'scale(1)' : 'scale(0)',
    opacity: visible ? 1 : 0,
    transition: 'transform 140ms cubic-bezier(0.2,0,0,1), opacity 140ms ease',
  } : {};
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={handleClose} />
      <div className="fixed z-50 bg-surface border border-hairline rounded-xl shadow-2xl p-3" style={cardStyle} onClick={e => e.stopPropagation()}>
        <div className="grid grid-cols-4 gap-2">
          {GENDER_OPTIONS.map(g => {
            const selected = value === g.key;
            return (
              <button key={g.key} onClick={() => { onSelect(g.key); handleClose(); }}
                className="aspect-square flex items-center justify-center rounded-lg border transition-all hover:opacity-90"
                style={{ backgroundColor: selected ? '#B8B8C028' : '#B8B8C00A', borderColor: selected ? '#B8B8C090' : '#2D303A', boxShadow: selected ? 'inset 0 0 0 1px #B8B8C040' : 'none' }}>
                <CatIcon src={g.icon} size={57} className="shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── 12 colors — rainbow spectrum, strict primary/combat alternation ──────────
// Even positions (0,2,4,6,8,10) = primary; odd (1,3,5,7,9,11) = combat
// GG sits at 210° between IN and MB — both in its formula AU+IN+MB×2 ✓✓
// ATD at 270° is the unavoidable "orphan" slot (no formula links MB+CH)
const C = {
  KK:  '#E03838',  // 0°   warm red    – Körperkraft (Stärke, Kraft)
  INI: '#E06828',  // 30°  orange      – Initiative (Reaktion, Schnelligkeit)
  GE:  '#D4A820',  // 60°  amber       – Geschicklichkeit (Präzision, Gold)
  PA:  '#98C818',  // 90°  chartreuse  – Parade (defensiv, Alert)
  AU:  '#28B040',  // 120° green       – Ausdauer (Vitalität, Natur)
  LE:  '#18A868',  // 150° sea-green   – Lebensenergie (Heilung, Leben)
  IN:  '#10A8D0',  // 180° cyan        – Intelligenz (Verstand, Klarheit)
  GG:  '#2870D8',  // 210° blue        – Geist. Gesundheit (Psyche, Tiefe)
  MB:  '#5040C8',  // 240° indigo      – Ment. Belastbarkeit (Willenskraft)
  ATD: '#8828C0',  // 270° violet      – Attacke Distanz (Weite, Kraft)
  CH:  '#C82888',  // 300° magenta     – Charme (sozial, Persönlichkeit)
  ATN: '#B82030',  // 330° deep garnet – Attacke Nahkampf (dunkel, intensiv)
} as const;


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
  { type: 'primary', key: 'KK',  color: C.KK,  icon: '/icons/attr/kk.png'  },  // 0°   primär  – oben
  { type: 'combat',  key: 'INI', color: C.INI, icon: '/icons/attr/ini.png' },  // 30°  kampf   – KK+5−GE/2 (zwischen KK & GE)
  { type: 'primary', key: 'GE',  color: C.GE,  icon: '/icons/attr/ge.png'  },  // 60°  primär
  { type: 'combat',  key: 'PA',  color: C.PA,  icon: '/icons/attr/pa.png'  },  // 90°  kampf   – (KK+GE+AU)/3
  { type: 'primary', key: 'AU',  color: C.AU,  icon: '/icons/attr/au.png'  },  // 120° primär
  { type: 'combat',  key: 'LE',  color: C.LE,  icon: '/icons/attr/le.png',  maxValue: 180 }, // 150° kampf   – (KK×2+AU)×3
  { type: 'primary', key: 'IN',  color: C.IN,  icon: '/icons/attr/in.png'  },  // 180° primär  – unten
  { type: 'combat',  key: 'GG',  color: C.GG,  icon: '/icons/attr/gg.png',  maxValue: 240 }, // 210° kampf   – (AU+IN+MB×2)×3 (zwischen IN & MB)
  { type: 'primary', key: 'MB',  color: C.MB,  icon: '/icons/attr/mb.png'  },  // 240° primär
  { type: 'combat',  key: 'ATD', color: C.ATD, icon: '/icons/attr/atd.png' },  // 270° kampf   – (GE×2+AU)/3
  { type: 'primary', key: 'CH',  color: C.CH,  icon: '/icons/attr/ch.png'  },  // 300° primär
  { type: 'combat',  key: 'ATN', color: C.ATN, icon: '/icons/attr/atn.png' },  // 330° kampf   – (KK×2+GE)/3 (neben KK)
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
        border: (mode === 'fix' && canInc) ? '1px solid #E8305060' : `1px solid ${color}30`,
        backgroundColor: (mode === 'fix' && canInc) ? '#E8305008' : `${color}08`,
        boxShadow: (mode === 'fix' && canInc) ? '0 0 8px #E8305030' : 'none',
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
          style={{ color: '#22c55e', opacity: canInc ? 1 : 0.2, transform: `rotate(${textRotation}deg)` }}
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
          style={{ color: '#ef4444', opacity: canDec ? 0.9 : 0.15, transform: `rotate(${textRotation}deg)` }}
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
  const genderBtnRef  = useRef<HTMLButtonElement>(null);
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

  if (!char) return null;

  const [genderOverlay, setGenderOverlay] = useState(false);
  const [genderAnchor,  setGenderAnchor]  = useState<DOMRect | null>(null);

  const selectedGender = GENDER_OPTIONS.find(g => g.key === char.info.gender);

  function patchInfo(key: string, value: string) {
    patchCharacter(charId, c => { (c.info as Record<string, string>)[key] = value; });
  }

  const pointsLeft = attrPointsLeft(char);
  const derived    = calcDerived(char);

  function setAttr(key: AttributeKey, val: number) {
    patchCharacter(charId, c => { c.attributes[key] = val; });
  }

  const activeProfMeta  = PROFESSIONS.find(p => p.key === char.profession);
  const profColor       = activeProfMeta?.color ?? '#8C8F99';
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
      return { attrs: ct.attrs, costMul: ct.costMultiplier as 1 | 2, catColor: cat?.color ?? '#888' };
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
        style={{ backgroundColor: '#1A1D26CC', border: '1px solid #FFFFFF18' }}
      >
        <span style={{ fontSize: 12, color: '#8C8F99', lineHeight: 1 }}>×</span>
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
        <path d="M2 3.5l3 3 3-3" stroke="#8C8F99" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        border: expanded === 'chart' ? '1px solid #FFFFFF08' : '1px solid #FFFFFF0C',
        cursor: expanded !== 'chart' ? 'pointer' : 'default',
      }}
      onClick={expanded !== 'chart' ? () => setExpanded('chart') : undefined}
    >
      <div className="absolute" style={{ left: '17%', top: '17%', width: '66%', aspectRatio: '1', opacity: expanded === 'chart' ? 1 : 0, transition: 'opacity 0.6s ease 0.3s', pointerEvents: expanded === 'chart' ? 'auto' : 'none' }}>
        <SpiderChart axes={combinedAxes} size={140} gridValues={[5, 10, 14, 18]} showGridLabels showValueLabels chartId="combined" className="w-full h-full"
          colorZones={[{ from: 0, to: 5, color: '#5878A0', opacity: 0.07 }, { from: 5, to: 14, color: '#8898A8', opacity: 0.05 }, { from: 14, to: 18, color: '#C89020', opacity: 0.10 }, { from: 18, to: 20, color: '#C83020', opacity: 0.13 }] as ColorZone[]} />
      </div>
      <div className="absolute pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: expanded === 'chart' && mode === 'edit' ? 1 : 0, transition: 'opacity 0.25s ease' }}>
        <div className="flex flex-col items-center leading-none">
          <span className="font-mono font-bold" style={{ fontSize: 22, color: pointsLeft > 0 ? '#7A8A9A' : '#C83030' }}>{pointsLeft}</span>
          <span className="text-[9px] tracking-widest uppercase" style={{ color: '#7A8A9A80' }}>AP</span>
        </div>
      </div>
      {pointsLeft > 0 && (
        <div className="absolute pointer-events-none flex items-baseline gap-1 leading-none" style={{ right: 8, top: '50%', transform: 'translateY(-50%)', opacity: expanded !== 'chart' ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <span className="font-mono font-bold" style={{ fontSize: mode === 'fix' ? 15 : 11, color: mode === 'fix' ? '#E83050' : '#7A8A9A' }}>{pointsLeft}</span>
          <span style={{ fontSize: mode === 'fix' ? 8 : 7, color: mode === 'fix' ? '#E8305080' : '#7A8A9A60', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AP</span>
        </div>
      )}
      {HEADER_DIVIDER_PCTS.map(pct => (
        <div key={pct} style={{ position: 'absolute', left: `${pct}%`, top: '15%', bottom: '15%', width: 1, background: 'linear-gradient(to bottom, transparent, #FFFFFF18 30%, #FFFFFF18 70%, transparent)', opacity: expanded !== 'chart' ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }} />
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
        style={{ position: 'absolute', top: 6, right: 6, zIndex: 20, opacity: expanded === 'chart' ? 1 : 0, pointerEvents: expanded === 'chart' ? 'auto' : 'none', transition: 'opacity 0.2s ease 0.1s', padding: 4, backgroundColor: '#1A1D2680', border: '1px solid #FFFFFF10', borderRadius: 6 }}>
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

        {/* Left: Identität — kompakter Block mit Bild rechts */}
        {(() => {
          const infoIncomplete = mode === 'fix' && (!char.info.name || !char.info.gender || !char.info.age || !char.info.height || !char.info.weight);
          return (
        <div className="shrink-0 w-48 rounded-lg border overflow-hidden flex flex-col" style={{ borderColor: infoIncomplete ? '#E8305060' : '#FFFFFF0C', boxShadow: infoIncomplete ? '0 0 8px #E8305030' : 'none' }}>
          {/* Name — volle Breite */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-raised/60 border-b border-hairline shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted shrink-0">Name</span>
            <span className="w-px h-3 bg-hairline shrink-0" />
            <input
              type="text"
              value={char.info.name}
              onChange={e => patchInfo('name', e.target.value)}
              placeholder="Charaktername"
              className="flex-1 bg-transparent text-primary text-xs placeholder:text-faint focus:outline-none min-w-0"
            />
          </div>
          {/* Body: schmale Felder links + Bild rechts */}
          <div className="p-2 flex gap-2 flex-1">
            {/* Schmale Felder-Spalte */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {([
                { key: 'age',    icon: '/icons/attr/info_age.png',    placeholder: 'Alter',   suffix: 'J'  },
                { key: 'height', icon: '/icons/attr/info_height.png', placeholder: 'Größe',   suffix: 'cm' },
                { key: 'weight', icon: '/icons/attr/info_weight.png', placeholder: 'Gewicht', suffix: 'kg' },
              ] as const).map(f => {
                const val = (char.info as Record<string, string>)[f.key] ?? '';
                return (
                  <div key={f.key} className="flex items-center gap-1 px-1.5 py-0.5 bg-raised border border-hairline rounded">
                    <CatIcon src={f.icon} size={14} className="shrink-0" />
                    <input
                      type="text"
                      value={val}
                      onChange={e => patchInfo(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="flex-1 bg-transparent text-primary text-[11px] font-mono placeholder:text-faint focus:outline-none min-w-0 w-0"
                    />
                    {val && <span className="text-[9px] text-faint shrink-0">{f.suffix}</span>}
                  </div>
                );
              })}
              <button
                ref={genderBtnRef}
                onClick={() => { setGenderAnchor(genderBtnRef.current?.getBoundingClientRect() ?? null); setGenderOverlay(true); }}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                  selectedGender ? 'bg-raised border-hairline hover:border-muted' : 'border-dashed border-hairline text-faint hover:border-muted hover:text-muted'
                }`}
              >
                {selectedGender
                  ? <CatIcon src={selectedGender.icon} size={14} className="shrink-0" />
                  : <span className="text-xs leading-none text-faint w-4 text-center">?</span>
                }
                <span className="text-[11px] text-primary truncate">
                  {selectedGender ? selectedGender.label : 'Geschlecht'}
                </span>
              </button>
            </div>
            {/* Bild-Platzhalter rechts */}
            <div className="w-14 shrink-0 rounded border border-dashed border-hairline flex items-center justify-center self-stretch">
              <span className="text-[8px] uppercase tracking-widest text-faint/40" style={{ writingMode: 'vertical-rl' }}>Bild</span>
            </div>
          </div>
        </div>
          );
        })()}

        {/* Right: Berufsklassen — 4 Spalten, füllt restliche Breite */}
        <div className={mode === 'fix' ? 'flex-1 min-w-0 flex flex-col gap-2' : 'flex-1 min-w-0'}>
          <div style={{ maxHeight: mode === 'edit' ? 600 : 0, opacity: mode === 'edit' ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
            <div className="grid grid-cols-4 gap-1">
              {PROFESSIONS.map(prof => {
                const isActive = char.profession === prof.key;
                const shortLabel = prof.labelSingular.replace(/ ?Beruf(e?)/, '').trim();
                return (
                  <button key={prof.key}
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
                    {/* Icon + Titel in einer Zeile */}
                    <div className="flex items-center gap-1.5 w-full min-w-0">
                      <CatIcon src={prof.icon} size={24} className="shrink-0" />
                      <span
                        className="text-[10px] font-semibold leading-tight min-w-0"
                        style={{ color: prof.color, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >{shortLabel}</span>
                    </div>
                    {/* Attr-Min: icon + ≥N */}
                    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 w-full">
                      {Object.entries(prof.attrMin).map(([k, v]) => {
                        const attrMeta = ATTRIBUTES.find(a => a.key === k);
                        const color = C[k as keyof typeof C] ?? '#888';
                        return (
                          <div key={k} className="flex items-center gap-[3px]">
                            <img src={attrMeta?.icon ?? ''} alt={k} style={{ width: 11, height: 11, borderRadius: '50%', border: `1px solid ${color}55`, flexShrink: 0 }} />
                            <span className="text-[9px] font-mono leading-none" style={{ color }}>≥{v}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Talent-Pts: catIcon + N */}
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
          <div style={{ maxHeight: mode === 'fix' ? 80 : 0, opacity: mode === 'fix' ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
            {activeProfMeta ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: `${activeProfMeta.color}60`, backgroundColor: `${activeProfMeta.color}12` }}>
                <CatIcon src={activeProfMeta.icon} size={22} />
                <span className="text-sm font-semibold" style={{ color: activeProfMeta.color }}>{activeProfMeta.labelSingular}</span>
              </div>
            ) : mode === 'fix' && (
              <div className="flex items-center justify-center px-3 py-2 rounded-lg border"
                style={{ borderColor: '#E8305060', backgroundColor: '#E8305010', boxShadow: '0 0 8px #E8305030' }}>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#E8305080' }}>Keine Berufsklasse</span>
              </div>
            )}
          </div>
          {mode === 'fix' && attrSectionJSX}
          {mode === 'fix' && catTabsJSX}
        </div>

      </div>

      {/* ── Attribute section: morphing header ↔ chart (edit mode only — fix mode renders inside profession column) ── */}
      {mode !== 'fix' && <div
        ref={containerRef}
        className="relative rounded-lg"
        style={{
          height: expanded === 'chart' ? Math.max(containerWidth, HEADER_H) : HEADER_H,
          overflow: 'hidden',
          transition: 'height 0.9s cubic-bezier(0.4,0,0.2,1), border-color 0.6s ease, box-shadow 0.3s ease',
          border: expanded === 'chart' ? '1px solid #FFFFFF08' : '1px solid #FFFFFF0C',
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
              { from:  0, to:  5, color: '#5878A0', opacity: 0.07 },
              { from:  5, to: 14, color: '#8898A8', opacity: 0.05 },
              { from: 14, to: 18, color: '#C89020', opacity: 0.10 },
              { from: 18, to: 20, color: '#C83020', opacity: 0.13 },
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
            <span className="font-mono font-bold" style={{ fontSize: 22, color: pointsLeft > 0 ? '#7A8A9A' : '#C83030' }}>
              {pointsLeft}
            </span>
            <span className="text-[9px] tracking-widest uppercase" style={{ color: '#7A8A9A80' }}>AP</span>
          </div>
        </div>

        {/* Remaining AP — collapsed header, left edge, only when > 0 */}
        {pointsLeft > 0 && (
          <div className="absolute pointer-events-none flex flex-col items-center leading-none" style={{
            left: 6, top: '50%', transform: 'translateY(-50%)',
            opacity: expanded !== 'chart' ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            <span className="font-mono font-bold" style={{ fontSize: 11, color: '#7A8A9A' }}>{pointsLeft}</span>
            <span style={{ fontSize: 7, color: '#7A8A9A60', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AP</span>
          </div>
        )}

        {/* Group dividers — visible only in collapsed header */}
        {HEADER_DIVIDER_PCTS.map(pct => (
          <div key={pct} style={{
            position: 'absolute', left: `${pct}%`, top: '15%', bottom: '15%', width: 1,
            background: 'linear-gradient(to bottom, transparent, #FFFFFF18 30%, #FFFFFF18 70%, transparent)',
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
            backgroundColor: '#1A1D2680',
            border: '1px solid #FFFFFF10',
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
              ? (hasTalent ? (talentMeta?.catColor ?? '#8C8F99') : (specCat?.color ?? '#8C8F99'))
              : '#8C8F99';
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
                      borderColor:     talentDragOver ? `${profColor}90` : char.professionTalent ? 'transparent' : '#4A4D5830',
                      backgroundColor: char.professionTalent ? 'transparent' : '#4A4D5806',
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
                        borderColor:     hobby2DragOver ? '#8C8F9990' : '#4A4D5830',
                        backgroundColor: '#4A4D5806',
                        outline:         hobby2DragOver ? '1.5px dashed #8C8F99' : 'none',
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
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#8C8F9950' }}>2. Hobby +3TP</span>
                      </div>
                    </div>
                  ))}

                  {/* Separator */}
                  {mode === 'edit' && <div style={{ height: 1, background: 'linear-gradient(to right, #FFFFFF22, #FFFFFF10)', borderRadius: 1, margin: '2px 0' }} />}

                  {/* Kategorie-Talente */}
                  {(() => {
                    const all = mode === 'fix'
                      ? [
                          ...TALENT_CATEGORIES.flatMap(cat =>
                            cat.talents.filter(t => !assignedTalentNames.has(t.name))
                              .map(t => ({ name: t.name, attrs: t.attrs, costMul: t.costMultiplier, isCustom: false, catColor: cat.color }))
                          ),
                          ...char.customTalents.filter(ct => !assignedTalentNames.has(ct.name))
                            .map(ct => ({ name: ct.name, attrs: ct.attrs, costMul: ct.costMultiplier, isCustom: true, catColor: (TALENT_CAT_MAP as Record<string, { color: string }>)[ct.category]?.color ?? '#8C8F99' })),
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
                        style={{ borderColor: '#E8305060', boxShadow: '0 0 8px #E8305030', backgroundColor: `${color}08`, minHeight: 40 }}>
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
                          : emptySlot('frei +', '#4FA968')}
                        {char.specFreeNegative
                          ? <SpecTile key="slot-spec-neg" spec={char.specFreeNegative} selectedAs={null} reservedAs={null} onToggle={() => {}} showIcon={false} mode={mode} />
                          : emptySlot('frei −', '#E83050')}
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
                            : emptySlot('2. Hobby +3TP', '#8C8F99'))}
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
                      borderColor:     specDragOver ? `${profColor}90` : char.specProfession ? 'transparent' : '#4A4D5830',
                      backgroundColor: char.specProfession ? 'transparent' : '#4A4D5806',
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
                      borderColor:     specPosDragOver ? '#4FA96890' : char.specFreePositive ? 'transparent' : '#4A4D5830',
                      backgroundColor: char.specFreePositive ? 'transparent' : '#4A4D5806',
                      outline:         specPosDragOver ? '1.5px dashed #4FA968' : 'none',
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
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#4FA96850' }}>frei +</span>
                      </div>
                    )}
                  </div>

                  {/* frei − */}
                  <div className="relative rounded-lg border transition-colors overflow-hidden"
                    style={{
                      borderColor:     specNegDragOver ? '#E8305090' : char.specFreeNegative ? 'transparent' : '#4A4D5830',
                      backgroundColor: char.specFreeNegative ? 'transparent' : '#4A4D5806',
                      outline:         specNegDragOver ? '1.5px dashed #E83050' : 'none',
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
                        <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#E8305050' }}>frei −</span>
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div style={{ height: 1, background: 'linear-gradient(to right, #FFFFFF22, #FFFFFF10)', borderRadius: 1, margin: '2px 0' }} />

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

      {genderOverlay && (
        <GenderOverlay
          value={char.info.gender}
          onSelect={key => patchInfo('gender', key)}
          onClose={() => setGenderOverlay(false)}
          anchorRect={genderAnchor}
        />
      )}
    </div>
  );
}
