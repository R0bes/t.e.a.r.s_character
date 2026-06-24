import { useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { ATTRIBUTES, ATTR_MAX, ATTR_FREE } from '../../data/attributes';
import { attrPointsLeft, attrJobMin, stepCost } from '../../rules/attributeCost';
import { calcDerived } from '../../rules/derivedValues';
import type { AttributeKey } from '../../types/character';
import { SpiderChart } from '../ui/SpiderChart';
import type { SpiderAxis, ColorZone } from '../ui/SpiderChart';


// ── 12 distinct colors ────────────────────────────────────────────────────────
const C = {
  KK:  '#CC2828',
  GE:  '#C89A10',
  AU:  '#D05020',
  CH:  '#CC2888',
  IN:  '#1E58C8',
  MB:  '#7030B0',
  ATN: '#B82020',
  PA:  '#607090',
  ATD: '#28A028',
  INI: '#D4A010',
  LE:  '#208838',
  GG:  '#1898A0',
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

const PRIMARY_GRID = [8, 14, 17];

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

// ── Primary attribute control ─────────────────────────────────────────────────
function AttrControl({
  attrKey, value, minValue, pointsLeft, onDecrease, onIncrease, color, name, icon,
}: {
  attrKey: AttributeKey; value: number; minValue: number; pointsLeft: number;
  onDecrease: () => void; onIncrease: () => void; color: string; name: string; icon: string;
}) {
  const [open, setOpen] = useState(false);
  const pos      = ATTR_POSITIONS[attrKey];
  const arrow    = ARROW_META[attrKey];
  const cost     = stepCost(value);
  const prevCost = value > minValue ? stepCost(value - 1) : 0;
  const canInc   = value < ATTR_MAX && pointsLeft >= cost;
  const canDec   = value > minValue;

  const plusSrc  = cost >= 3     ? '/icons/attr/arrow_up3.png'   : cost === 2     ? '/icons/attr/arrow_up2.png'   : '/icons/attr/arrow_up.png';
  const minusSrc = prevCost >= 3 ? '/icons/attr/arrow_down3.png' : prevCost === 2 ? '/icons/attr/arrow_down2.png' : '/icons/attr/arrow_down.png';
  const plusGlow = cost >= 3 ? 'drop-shadow(0 0 4px #CC2828)' : cost === 2 ? 'drop-shadow(0 0 4px #D05020)' : undefined;

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
          style={{ boxShadow: `0 0 0 2px ${color}88` }}>
          <img src={icon} alt={name} className="w-full h-full object-cover" />
        </div>
        {open && (
          <span className={`absolute z-30 ${tipPos[pos.tip]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none`}>
            <span style={{ color }}>{name}</span>
          </span>
        )}
      </div>

      {/* + arrow — transparent button, no visible frame */}
      <button
        onClick={onIncrease}
        disabled={!canInc}
        className="absolute p-0 bg-transparent border-0 outline-none"
        style={{ left: px - 14, top: py - 12, width: 28, height: 24 }}
      >
        <img
          src={plusSrc}
          className="w-full h-full object-contain transition-opacity"
          style={{ transform: `rotate(${arrow.rotate}deg)`, opacity: canInc ? 1 : 0.2, filter: plusGlow }}
        />
      </button>

      {/* − arrow — transparent button, rotated 180° of the + arrow */}
      <button
        onClick={onDecrease}
        disabled={!canDec}
        className="absolute p-0 bg-transparent border-0 outline-none"
        style={{ left: -px - 14, top: -py - 12, width: 28, height: 24 }}
      >
        <img
          src={minusSrc}
          className="w-full h-full object-contain transition-opacity"
          style={{ transform: `rotate(${arrow.rotate}deg)`, opacity: canDec ? 0.8 : 0.15 }}
        />
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
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
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
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
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
                { from: 14, to: 17, color: '#C89020', opacity: 0.10 },
                { from: 17, to: 19, color: '#C83020', opacity: 0.13 },
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
