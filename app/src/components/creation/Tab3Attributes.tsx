import { useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { ATTRIBUTES, ATTR_MAX, ATTR_FREE } from '../../data/attributes';
import { attrPointsLeft, attrJobMin, stepCost } from '../../rules/attributeCost';
import { calcDerived } from '../../rules/derivedValues';
import type { AttributeKey } from '../../types/character';
import { SpiderChart } from '../ui/SpiderChart';
import type { SpiderAxis, HatchZone } from '../ui/SpiderChart';


// ── 12 distinct colors ────────────────────────────────────────────────────────
const C = {
  KK:  '#D1453B',
  GE:  '#3E7FCE',
  AU:  '#4FA968',
  CH:  '#D45C95',
  IN:  '#8C5FC4',
  MB:  '#E08C3C',
  ATN: '#C4881C',
  PA:  '#2DB38C',
  ATD: '#4CAED8',
  INI: '#88C040',
  LE:  '#E83050',
  GG:  '#6050C8',
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

// ── Info button with directional ReactNode tooltip ────────────────────────────
function InfoBtn({ content, dir = 'up' }: { content: ReactNode; dir?: TipDir }) {
  const [open, setOpen] = useState(false);

  const tipPos: Record<TipDir, string> = {
    up:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    down:  'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left:  'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <span className="relative inline-flex shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-3.5 h-3.5 rounded-full border border-hairline/60 text-[7px] text-faint flex items-center justify-center hover:text-muted hover:border-muted transition-colors leading-none"
      >
        i
      </button>
      {open && (
        <span
          className={`absolute z-30 ${tipPos[dir]} px-2.5 py-1.5 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl`}
          onClick={() => setOpen(false)}
        >
          {content}
        </span>
      )}
    </span>
  );
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
  onHoverChange,
}: {
  attrKey: AttributeKey; value: number; minValue: number; pointsLeft: number;
  onDecrease: () => void; onIncrease: () => void; color: string; name: string; icon: string;
  onHoverChange: (delta: number) => void;
}) {
  const pos      = ATTR_POSITIONS[attrKey];
  const arrow    = ARROW_META[attrKey];
  const cost     = stepCost(value);
  const prevCost = value > minValue ? stepCost(value - 1) : 0;
  const canInc   = value < ATTR_MAX && pointsLeft >= cost;
  const canDec   = value > minValue;

  const plusSrc  = cost >= 3     ? '/icons/attr/arrow_up3.png'   : cost === 2     ? '/icons/attr/arrow_up2.png'   : '/icons/attr/arrow_up.png';
  const minusSrc = prevCost >= 3 ? '/icons/attr/arrow_down3.png' : prevCost === 2 ? '/icons/attr/arrow_down2.png' : '/icons/attr/arrow_down.png';
  const plusGlow = cost >= 3 ? 'drop-shadow(0 0 4px #D1453B)' : cost === 2 ? 'drop-shadow(0 0 4px #E08C3C)' : undefined;

  const px = Math.round(arrow.perpX * BTN_OFFSET);
  const py = Math.round(arrow.perpY * BTN_OFFSET);

  // Label positioned away from center based on tip direction
  const labelStyle: React.CSSProperties = pos.tip === 'down'
    ? { position: 'absolute', top: -18 - 4, left: 0, transform: 'translate(-50%, -100%)', textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none' }
    : pos.tip === 'up'
      ? { position: 'absolute', top: 18 + 4,  left: 0, transform: 'translateX(-50%)',         textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none' }
      : pos.tip === 'left'
        ? { position: 'absolute', top: 0, left:  18 + 7, transform: 'translateY(-50%)', textAlign: 'left',  whiteSpace: 'nowrap', pointerEvents: 'none' }
        : { position: 'absolute', top: 0, left: -(18 + 7), transform: 'translate(-100%, -50%)', textAlign: 'right', whiteSpace: 'nowrap', pointerEvents: 'none' };

  return (
    <div className="absolute overflow-visible" style={{ left: pos.left, top: pos.top }}>

      {/* Icon medallion — 36px, centered at anchor, same style as CombatLabel */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{ width: 36, height: 36, left: -18, top: -18, boxShadow: `0 0 0 2px ${color}88` }}
      >
        <img src={icon} alt={name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <span className="text-base font-mono font-bold leading-none drop-shadow-md" style={{ color }}>
            {value}
          </span>
        </div>
      </div>

      {/* Key + name label, positioned away from chart center */}
      <div style={labelStyle}>
        <span className="text-[9px] font-mono font-bold leading-none" style={{ color }}>{attrKey}</span>
        <span className="block text-[7px] text-faint leading-none mt-0.5">{name}</span>
      </div>

      {/* + arrow — transparent button, no visible frame */}
      <button
        onClick={onIncrease}
        disabled={!canInc}
        onMouseEnter={() => canInc && onHoverChange(-cost)}
        onMouseLeave={() => onHoverChange(0)}
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
        onMouseEnter={() => canDec && onHoverChange(prevCost)}
        onMouseLeave={() => onHoverChange(0)}
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
  attrKey, color, icon, value, left, top, tip,
}: {
  attrKey: string; color: string; icon: string; value: number;
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
      <div className="relative w-9 h-9 rounded-full overflow-hidden cursor-default"
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
        <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <span className="text-sm font-mono font-bold leading-none drop-shadow-md" style={{ color }}>
            {value}
          </span>
        </div>
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

// ── LE / GG medallion overlay (matches CombatLabel style) ────────────────────
function ResourceLabel({
  shortKey, fullName, value, color, icon, info,
}: {
  shortKey: string; fullName: string; value: number; color: string; icon: string; info: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-9 h-9 rounded-full overflow-hidden"
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
        <img src={icon} alt={shortKey} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <span className="text-sm font-mono font-bold leading-none drop-shadow-md" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] font-mono font-bold leading-none" style={{ color }}>{shortKey}</span>
        <span className="text-[7px] text-faint leading-none">{fullName}</span>
      </div>
      <InfoBtn content={info} dir="up" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab3Attributes({ charId }: { charId: string }) {
  const char           = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);
  const [hoverDelta, setHoverDelta] = useState(0);

  if (!char) return null;

  const pointsLeft = attrPointsLeft(char);
  const derived    = calcDerived(char);
  const forecasted = pointsLeft + hoverDelta;

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

      {/* AP healthbar with forecast ghost */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-faint shrink-0">AP</span>
        <div className="relative flex-1 h-2.5 rounded-full overflow-hidden bg-raised">
          {/* Current fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
            style={{
              width: `${Math.max(0, (pointsLeft / ATTR_FREE) * 100)}%`,
              backgroundColor: '#7A8A9A',
            }}
          />
          {/* Forecast ghost overlay */}
          {hoverDelta !== 0 && (
            <div
              className="absolute inset-y-0 rounded-full transition-all duration-100 opacity-60"
              style={hoverDelta > 0
                ? {
                    // gaining points: ghost extends right from current edge
                    left:  `${(pointsLeft / ATTR_FREE) * 100}%`,
                    width: `${(hoverDelta / ATTR_FREE) * 100}%`,
                    backgroundColor: '#4FA968',
                  }
                : {
                    // losing points: ghost shrinks left from current edge
                    left:  `${(forecasted / ATTR_FREE) * 100}%`,
                    width: `${(Math.abs(hoverDelta) / ATTR_FREE) * 100}%`,
                    backgroundColor: '#D1453B',
                  }
              }
            />
          )}
        </div>
        <span className="text-[9px] font-mono text-faint shrink-0 w-8 text-right">
          {forecasted !== pointsLeft
            ? <span style={{ color: hoverDelta > 0 ? '#4FA968' : '#D1453B' }}>{forecasted}</span>
            : pointsLeft
          }/{ATTR_FREE}
        </span>
      </div>

      {/* ── Stacked radars ── */}
      <div className="flex flex-col gap-8">

        {/* Primary radar – full width, square container */}
        <div className="relative overflow-visible w-full" style={{ aspectRatio: '1/1' }}>
          <div className="absolute" style={{ left: '12.5%', top: '12.5%', width: '75%', aspectRatio: '1' }}>
            <SpiderChart
              axes={primaryAxes}
              size={140}
              gridValues={PRIMARY_GRID}
              showGridLabels
              chartId="primary"
              className="w-full h-full"
              hatchZones={[
                { from: 14, to: 17, color: '#E8A020', density: 'light' },
                { from: 17, to: 19, color: '#C83030', density: 'dense' },
              ] as HatchZone[]}
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
                onHoverChange={setHoverDelta}
              />
            );
          })}
        </div>

        {/* Combat radar – square container, same approach as primary */}
        <div className="relative overflow-visible w-full" style={{ aspectRatio: '1/1' }}>
          <div className="absolute" style={{ left: '12.5%', top: '12.5%', width: '75%', aspectRatio: '1' }}>
            <SpiderChart axes={combatAxes} size={110} gridValues={[5, 10, 15, 20]} showGridLabels chartId="combat" className="w-full h-full" />
          </div>

          {COMBAT_META.map(m => (
            <CombatLabel
              key={m.key}
              attrKey={m.key}
              color={m.color}
              icon={m.icon}
              value={derived[m.key as keyof typeof derived]}
              left={m.left}
              top={m.top}
              tip={m.tip}
            />
          ))}
        </div>

        {/* LE & GG — side by side, same medallion style as combat labels */}
        <div className="flex justify-center gap-10">
          <ResourceLabel
            shortKey="LE"
            fullName="Lebensenergie"
            value={derived.LE}
            color={C.LE}
            icon="/icons/attr/le.png"
            info={<><span style={{color:C.LE}}>Lebensenergie</span>: (<A k="KK"/>×2 + <A k="AU"/>) × 3</>}
          />
          <ResourceLabel
            shortKey="GG"
            fullName="Geist. Gesundheit"
            value={derived.GG}
            color={C.GG}
            icon="/icons/attr/gg.png"
            info={<><span style={{color:C.GG}}>Geist. Gesundheit</span>: (<A k="AU"/>+<A k="IN"/>+<A k="MB"/>×2) × 3</>}
          />
        </div>

      </div>

    </div>
  );
}
