import { useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { ATTRIBUTES, ATTR_MAX, ATTR_FREE } from '../../data/attributes';
import { attrPointsLeft, attrJobMin, stepCost } from '../../rules/attributeCost';
import { calcDerived } from '../../rules/derivedValues';
import type { AttributeKey } from '../../types/character';
import { SpiderChart } from '../ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../ui/SpiderChart';


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
const RADAR_ORDER: AttributeKey[] = ['KK', 'GE', 'AU', 'IN', 'CH', 'MB'];

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

const PRIMARY_GRID = [8, 14, 18];

// ── Combat attr layout ────────────────────────────────────────────────────────
type TipDir = 'up' | 'down' | 'left' | 'right';

type CombatMeta = {
  key: string; color: string; icon: string;
  left: string; top: string; tip: TipDir;
};

const COMBAT_META: CombatMeta[] = [
  { key: 'ATN', color: C.ATN, icon: '/icons/attr/atn.png', left: '50%', top: '8%',  tip: 'down'  },
  { key: 'PA',  color: C.PA,  icon: '/icons/attr/pa.png',  left: '92%', top: '50%', tip: 'left'  },
  { key: 'ATD', color: C.ATD, icon: '/icons/attr/atd.png', left: '50%', top: '92%', tip: 'up'    },
  { key: 'INI', color: C.INI, icon: '/icons/attr/ini.png', left: '8%',  top: '50%', tip: 'right' },
];

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
  overridePos, overrideArrow, textRotation = 0,
}: {
  attrKey: AttributeKey; value: number; minValue: number; pointsLeft: number;
  onDecrease: () => void; onIncrease: () => void; color: string; name: string; icon: string;
  overridePos?:   { left: string; top: string; align: 'center'|'left'|'right'; tip: TipDir };
  overrideArrow?: { rotate: number; perpX: number; perpY: number };
  textRotation?: number;
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

  // Tooltip positioning: 'down' means icon is at top edge → tooltip above; 'left' means right edge → tooltip right, etc.
  const tipPos: Record<TipDir, string> = {
    down:  'bottom-full left-1/2 -translate-x-1/2 mb-2',
    up:    'top-full left-1/2 -translate-x-1/2 mt-2',
    left:  'left-full top-1/2 -translate-y-1/2 ml-2',
    right: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div className="absolute overflow-visible" style={{ left: pos.left, top: pos.top }}>

      {/* Icon medallion with hover tooltip */}
      <div
        className="absolute"
        style={{ width: 44, height: 44, left: -22, top: -22 }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="w-full h-full rounded-full overflow-hidden"
          style={{ boxShadow: `0 0 0 2px ${color}, 0 0 6px 1px ${color}aa, 0 0 14px 4px ${color}44` }}>
          <img src={icon} alt={name} className="w-full h-full object-cover" />
        </div>
        {open && (
          <span className={`absolute z-30 ${tipPos[pos.tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
            <span style={{ color }}>{name}</span>
          </span>
        )}
      </div>

      {/* + button — green */}
      <button
        onClick={onIncrease}
        disabled={!canInc}
        className="absolute p-0 bg-transparent border-0 outline-none cursor-pointer"
        style={{ left: px - 14, top: py - 12, width: 28, height: 24 }}
      >
        <span
          className={`flex items-center justify-center w-full h-full font-bold ${plusSize} leading-none select-none transition-opacity`}
          style={{ color: '#22c55e', opacity: canInc ? 1 : 0.2, transform: `rotate(${textRotation}deg)` }}
        >
          {plusLabel}
        </span>
      </button>

      {/* − button — red */}
      <button
        onClick={onDecrease}
        disabled={!canDec}
        className="absolute p-0 bg-transparent border-0 outline-none cursor-pointer"
        style={{ left: -px - 14, top: -py - 12, width: 28, height: 24 }}
      >
        <span
          className={`flex items-center justify-center w-full h-full font-bold ${minusSize} leading-none select-none transition-opacity`}
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
}: {
  attrKey: string; color: string; icon: string;
  left: string; top: string; tip: TipDir;
}) {
  const [open, setOpen] = useState(false);

  const tipPos: Record<TipDir, string> = {
    up:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    down:  'top-full left-1/2 -translate-x-1/2 mt-2',
    left:  'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="absolute"
      style={{ left, top, transform: 'translate(-50%, -50%)' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative w-11 h-11 rounded-full overflow-hidden cursor-default"
        style={{ boxShadow: `0 0 0 2px ${color}, 0 0 6px 1px ${color}aa, 0 0 14px 4px ${color}44` }}>
        <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
      </div>
      {open && (
        <span
          className={`absolute z-30 ${tipPos[tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}
        >
          {combatTooltip(attrKey, color)}
        </span>
      )}
    </div>
  );
}

// ── LE / GG health bar ───────────────────────────────────────────────────────
function ResourceBar({
  shortKey, value, maxValue, color, icon, info,
}: {
  shortKey: string; value: number; maxValue: number; color: string; icon: string; info: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(100, (value / maxValue) * 100));

  return (
    <div
      className="relative flex items-center gap-2.5"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden cursor-default"
        style={{ boxShadow: `0 0 0 2px ${color}, 0 0 6px 1px ${color}aa, 0 0 14px 4px ${color}44` }}>
        <img src={icon} alt={shortKey} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{shortKey}</span>
          <span className="text-xs font-mono text-muted">{value}<span className="text-faint text-[10px]"> / {maxValue}</span></span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden bg-raised">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
      {open && (
        <span className="absolute z-30 bottom-full left-0 mb-2 px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none">
          {info}
        </span>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab3Attributes({ charId }: { charId: string }) {
  const char           = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  const pointsLeft = attrPointsLeft(char);
  const derived    = calcDerived(char);

  function setAttr(key: AttributeKey, val: number) {
    patchCharacter(charId, c => { c.attributes[key] = val; });
  }

  const primaryAxes: SpiderAxis[] = RADAR_ORDER.map(key => ({
    key, value: char.attributes[key], maxValue: ATTR_MAX, color: C[key],
  }));

  const combatAxes: SpiderAxis[] = COMBAT_META.map(m => ({
    key: m.key,
    value: derived[m.key as keyof typeof derived],
    maxValue: 20,
    color: m.color,
  }));

  const combinedAxes: SpiderAxis[] = COMBINED_ENTRIES.map(entry => ({
    key: entry.key,
    value: entry.type === 'primary'
      ? char.attributes[entry.key as AttributeKey]
      : derived[entry.key as keyof typeof derived] as number,
    maxValue: entry.maxValue ?? 20,
    color: entry.color,
  }));

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* AP bar — full width, 14 segments */}
      <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-raised">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-200"
          style={{ width: `${Math.max(0, (pointsLeft / ATTR_FREE) * 100)}%`, backgroundColor: '#7A8A9A' }}
        />
        {Array.from({ length: ATTR_FREE - 1 }, (_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 w-px"
            style={{ left: `${((i + 1) / ATTR_FREE) * 100}%`, backgroundColor: 'rgba(0,0,0,0.35)' }}
          />
        ))}
      </div>

      {/* ── Stacked radars ── */}
      <div className="flex flex-col gap-8">

        {/* Combined radar — primary editable, combat reactive */}
        <div className="relative overflow-visible w-full" style={{ aspectRatio: '1/1' }}>
          <div className="absolute" style={{ left: '17%', top: '17%', width: '66%', aspectRatio: '1' }}>
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

          {COMBINED_ENTRIES.map((entry, i) => {
            const { leftPct, topPct, perpX, perpY, rotate, tip } = combinedGeom(i, COMBINED_ENTRIES.length);
            const left = `${leftPct.toFixed(1)}%`;
            const top  = `${topPct.toFixed(1)}%`;

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
              />
            );
          })}
        </div>

        {/* Primary radar – full width, square container */}
        <div className="relative overflow-visible w-full" style={{ aspectRatio: '1/1' }}>
          <div className="absolute" style={{ left: '17%', top: '17%', width: '66%', aspectRatio: '1' }}>
            <SpiderChart
              axes={primaryAxes}
              size={140}
              gridValues={PRIMARY_GRID}
              showGridLabels
              showValueLabels
              chartId="primary"
              className="w-full h-full"
              colorZones={[
                { from:  0, to:  8, color: '#5878A0', opacity: 0.07 },
                { from:  8, to: 14, color: '#8898A8', opacity: 0.05 },
                { from: 14, to: 18, color: '#C89020', opacity: 0.10 },
                { from: 18, to: 19, color: '#C83020', opacity: 0.13 },
              ] as ColorZone[]}
            />
          </div>

          {RADAR_ORDER.map(key => {
            const meta   = ATTRIBUTES.find(a => a.key === key)!;
            const val    = char.attributes[key];
            const minVal = attrJobMin(char, key);
            return (
              <AttrControl
                key={key}
                attrKey={key}
                value={val}
                minValue={minVal}
                pointsLeft={pointsLeft}
                onDecrease={() => setAttr(key, Math.max(minVal, val - 1))}
                onIncrease={() => setAttr(key, Math.min(ATTR_MAX, val + 1))}
                color={C[key]}
                name={meta.name}
                icon={meta.icon}
                textRotation={normRot(ARROW_META[key].rotate - 90)}
              />
            );
          })}
        </div>

        {/* Combat radar – square container, same approach as primary */}
        <div className="relative overflow-visible w-full" style={{ aspectRatio: '1/1' }}>
          <div className="absolute" style={{ left: '17%', top: '17%', width: '66%', aspectRatio: '1' }}>
            <SpiderChart axes={combatAxes} size={110} gridValues={[5, 10, 15, 20]} showGridLabels showValueLabels dotRadius={4.7} chartId="combat" className="w-full h-full" />
          </div>

          {COMBAT_META.map(m => (
            <CombatLabel
              key={m.key}
              attrKey={m.key}
              color={m.color}
              icon={m.icon}
              left={m.left}
              top={m.top}
              tip={m.tip}
            />
          ))}
        </div>

        {/* LE & GG — stacked health bars */}
        <div className="flex flex-col gap-3 px-1">
          <ResourceBar
            shortKey="LE"
            value={derived.LE}
            maxValue={177}
            color={C.LE}
            icon="/icons/attr/le.png"
            info={<><span style={{color:C.LE}}>Lebensenergie</span>: (<A k="KK"/>×2 + <A k="AU"/>) × 3</>}
          />
          <ResourceBar
            shortKey="GG"
            value={derived.GG}
            maxValue={237}
            color={C.GG}
            icon="/icons/attr/gg.png"
            info={<><span style={{color:C.GG}}>Geist. Gesundheit</span>: (<A k="AU"/>+<A k="IN"/>+<A k="MB"/>×2) × 3</>}
          />
        </div>

      </div>

    </div>
  );
}
