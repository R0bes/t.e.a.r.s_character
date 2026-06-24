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

const LE_MAX = 177;
const GG_MAX = 237;

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

  const plusCls = !canInc
    ? 'border-hairline/40 text-faint/40 cursor-not-allowed'
    : cost === 3
      ? 'border-danger/70 text-danger hover:bg-danger/10 active:scale-95'
      : cost === 2
        ? 'border-amber-500/70 text-amber-400 hover:bg-amber-500/10 active:scale-95'
        : 'border-hairline text-muted hover:text-primary hover:border-muted active:scale-95';

  const plusSrc  = cost >= 3     ? '/icons/attr/arrow_up3.png' : cost === 2     ? '/icons/attr/arrow_up2.png' : '/icons/attr/arrow_up.png';
  const minusSrc = prevCost >= 3 ? '/icons/attr/arrow_up3.png' : prevCost === 2 ? '/icons/attr/arrow_up2.png' : '/icons/attr/arrow_up.png';

  const px = Math.round(arrow.perpX * BTN_OFFSET);
  const py = Math.round(arrow.perpY * BTN_OFFSET);

  return (
    <div className="absolute overflow-visible" style={{ left: pos.left, top: pos.top }}>

      {/* Icon medallion — centered at anchor point */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{ width: 40, height: 40, left: -20, top: -20, boxShadow: `0 0 0 2px ${color}88` }}
      >
        <img src={icon} alt={name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <span className="text-lg font-mono font-bold leading-none drop-shadow-md" style={{ color }}>
            {value}
          </span>
        </div>
      </div>

      {/* + button — along perpendicular, pointing outward */}
      <button
        onClick={onIncrease} disabled={!canInc}
        onMouseEnter={() => canInc && onHoverChange(-cost)}
        onMouseLeave={() => onHoverChange(0)}
        className={`absolute w-8 h-6 flex items-center justify-center rounded border transition-colors ${plusCls}`}
        style={{ left: px - 16, top: py - 12 }}
      >
        <img src={plusSrc} className="w-6 h-5 object-contain" style={{ transform: `rotate(${arrow.rotate}deg)` }} />
      </button>

      {/* − button — opposite side, pointing inward */}
      <button
        onClick={onDecrease} disabled={!canDec}
        onMouseEnter={() => canDec && onHoverChange(prevCost)}
        onMouseLeave={() => onHoverChange(0)}
        className="absolute w-8 h-6 flex items-center justify-center rounded border border-hairline hover:opacity-80 disabled:opacity-20 transition-opacity"
        style={{ left: -px - 16, top: -py - 12 }}
      >
        <img src={minusSrc} className="w-6 h-5 object-contain" style={{ transform: `rotate(${arrow.rotate + 180}deg)` }} />
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
  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{ left, top, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0"
        style={{ boxShadow: `0 0 0 2px ${color}88` }}>
        <img src={icon} alt={attrKey} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          <span className="text-sm font-mono font-bold leading-none drop-shadow-md" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <InfoBtn content={combatTooltip(attrKey, color)} dir={tip} />
    </div>
  );
}

// ── LE / GG single-line row ───────────────────────────────────────────────────
function ResourceRow({
  shortKey, value, maxValue, color, icon, info,
}: {
  shortKey: string; value: number; maxValue: number; color: string; icon: string; info: ReactNode;
}) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100));
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0"
        style={{ boxShadow: `0 0 0 1.5px ${color}88` }}>
        <img src={icon} alt={shortKey} className="w-full h-full object-cover" />
      </div>
      <span className="font-mono text-sm font-bold shrink-0 leading-none" style={{ color }}>
        {value}
      </span>
      <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <InfoBtn content={info} dir="left" />
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
      <div className="flex flex-col gap-4">

        {/* Primary radar – full width, square container */}
        <div className="relative overflow-visible w-full" style={{ aspectRatio: '1/1' }}>
          <div className="absolute" style={{ left: '16%', top: '16%', width: '68%', aspectRatio: '1' }}>
            <SpiderChart
              axes={primaryAxes}
              size={140}
              gridValues={PRIMARY_GRID}
              showGridLabels
              chartId="primary"
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
          <div className="absolute" style={{ left: '16%', top: '16%', width: '68%', aspectRatio: '1' }}>
            <SpiderChart axes={combatAxes} size={110} gridValues={[5, 10, 15, 20]} showGridLabels chartId="combat" />
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

        {/* LE & GG */}
        <div className="flex flex-col gap-2">
          <ResourceRow
            shortKey="LE"
            value={derived.LE}
            maxValue={LE_MAX}
            color={C.LE}
            icon="/icons/attr/le.png"
            info={<><span style={{color:C.LE}}>Lebensenergie</span>: (<A k="KK"/>×2 + <A k="AU"/>) × 3</>}
          />
          <ResourceRow
            shortKey="GG"
            value={derived.GG}
            maxValue={GG_MAX}
            color={C.GG}
            icon="/icons/attr/gg.png"
            info={<><span style={{color:C.GG}}>Geist. Gesundheit</span>: (<A k="AU"/>+<A k="IN"/>+<A k="MB"/>×2) × 3</>}
          />
        </div>

      </div>

    </div>
  );
}
