import { useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { ATTRIBUTES, ATTR_MAX, ATTR_FREE } from '../../data/attributes';
import { attrPointsLeft, attrJobMin, stepCost } from '../../rules/attributeCost';
import { calcDerived } from '../../rules/derivedValues';
import type { AttributeKey } from '../../types/character';
import { SpiderChart } from '../ui/SpiderChart';
import type { SpiderAxis, HatchZone } from '../ui/SpiderChart';
import { PointsBar } from '../ui/PointsBar';

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
  KK: { left: '50%', top: '7%',  align: 'center', tip: 'down'  },
  GE: { left: '84%', top: '28%', align: 'left',   tip: 'left'  },
  AU: { left: '84%', top: '65%', align: 'left',   tip: 'left'  },
  IN: { left: '50%', top: '86%', align: 'center', tip: 'up'    },
  CH: { left: '16%', top: '65%', align: 'right',  tip: 'right' },
  MB: { left: '16%', top: '28%', align: 'right',  tip: 'right' },
};

const PRIMARY_GRID = [8, 14, 17];

// ── Combat attr layout ────────────────────────────────────────────────────────
type TipDir = 'up' | 'down' | 'left' | 'right';

type CombatMeta = {
  key: string; color: string;
  left: string; top: string; tip: TipDir;
};

const COMBAT_META: CombatMeta[] = [
  { key: 'ATN', color: C.ATN, left: '50%', top: '12%', tip: 'down'  },
  { key: 'PA',  color: C.PA,  left: '88%', top: '50%', tip: 'left'  },
  { key: 'ATD', color: C.ATD, left: '50%', top: '88%', tip: 'up'    },
  { key: 'INI', color: C.INI, left: '12%', top: '50%', tip: 'right' },
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

// ── Primary attribute control ─────────────────────────────────────────────────
function AttrControl({
  attrKey, value, minValue, pointsLeft, onDecrease, onIncrease, color, name,
  onHoverChange,
}: {
  attrKey: AttributeKey; value: number; minValue: number; pointsLeft: number;
  onDecrease: () => void; onIncrease: () => void; color: string; name: string;
  onHoverChange: (delta: number) => void;
}) {
  const pos     = ATTR_POSITIONS[attrKey];
  const cost    = stepCost(value);
  const prevCost = value > minValue ? stepCost(value - 1) : 0;
  const canInc  = value < ATTR_MAX && pointsLeft >= cost;
  const canDec  = value > minValue;

  const alignCls = pos.align === 'center' ? 'items-center'
    : pos.align === 'left' ? 'items-start'
    : 'items-end';

  const plusCls = !canInc
    ? 'border-hairline/40 text-faint/40 cursor-not-allowed'
    : cost === 3
      ? 'border-danger/70 text-danger hover:bg-danger/10 active:scale-95'
      : cost === 2
        ? 'border-amber-500/70 text-amber-400 hover:bg-amber-500/10 active:scale-95'
        : 'border-hairline text-muted hover:text-primary hover:border-muted active:scale-95';

  return (
    <div
      className={`absolute flex flex-col gap-0.5 ${alignCls}`}
      style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)' }}
    >
      <div className={`flex items-center gap-1 ${pos.align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-[10px] font-mono font-bold leading-none" style={{ color }}>
          {attrKey}
        </span>
        <InfoBtn content={<span style={{ color }}>{name}</span>} dir={pos.tip} />
      </div>

      <span className="text-3xl font-mono font-bold leading-none" style={{ color }}>
        {value}
      </span>

      {/* Always − left, + right */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrease} disabled={!canDec}
          onMouseEnter={() => canDec && onHoverChange(prevCost)}
          onMouseLeave={() => onHoverChange(0)}
          className="w-6 h-6 rounded border text-sm leading-none transition-colors active:scale-95 flex items-center justify-center disabled:opacity-25"
          style={{ borderColor: color + '88', color }}
        >−</button>
        <button
          onClick={onIncrease} disabled={!canInc}
          onMouseEnter={() => canInc && onHoverChange(-cost)}
          onMouseLeave={() => onHoverChange(0)}
          className={`w-6 h-6 rounded border text-sm leading-none transition-colors flex items-center justify-center ${plusCls}`}
        >+</button>
      </div>
    </div>
  );
}

// ── Combat attribute label ────────────────────────────────────────────────────
function CombatLabel({
  attrKey, color, value, left, top, tip,
}: {
  attrKey: string; color: string; value: number;
  left: string; top: string; tip: TipDir;
}) {
  return (
    <div
      className="absolute flex flex-col items-center gap-0.5"
      style={{ left, top, transform: 'translate(-50%, -50%)' }}
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono font-bold leading-none" style={{ color }}>
          {attrKey}
        </span>
        <InfoBtn content={combatTooltip(attrKey, color)} dir={tip} />
      </div>
      <span className="text-xl font-mono font-bold leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ── LE / GG single-line row ───────────────────────────────────────────────────
function ResourceRow({
  shortKey, value, maxValue, color, info,
}: {
  shortKey: string; value: number; maxValue: number; color: string; info: ReactNode;
}) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] font-bold shrink-0 w-5 leading-none" style={{ color }}>
        {shortKey}
      </span>
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

      {/* Attribute points bar with hover forecast */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <PointsBar total={ATTR_FREE} used={pointsLeft} color="#7A8A9A" />
        </div>
        {hoverDelta !== 0 && (
          <span className={`text-xs font-mono font-bold shrink-0 transition-colors ${
            hoverDelta > 0 ? 'text-success' : 'text-danger'
          }`}>
            → {forecasted}
          </span>
        )}
      </div>

      {/* ── Side-by-side radars ── */}
      <div className="flex gap-3 overflow-visible w-full">

        {/* Primary radar */}
        <div
          className="relative overflow-visible shrink-0"
          style={{ flex: '0 1 220px', minWidth: 160, aspectRatio: '3/4' }}
        >
          <div className="absolute" style={{ left: '18%', top: '24%', width: '64%', aspectRatio: '1' }}>
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
                onHoverChange={setHoverDelta}
              />
            );
          })}
        </div>

        {/* Right column: combat radar + LE/GG rows */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="relative overflow-visible shrink-0" style={{ height: 145 }}>
            <div
              className="absolute"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <SpiderChart axes={combatAxes} size={85} gridValues={[5, 10, 15, 20]} showGridLabels chartId="combat" />
            </div>

            {COMBAT_META.map(m => (
              <CombatLabel
                key={m.key}
                attrKey={m.key}
                color={m.color}
                value={derived[m.key as keyof typeof derived]}
                left={m.left}
                top={m.top}
                tip={m.tip}
              />
            ))}
          </div>

          {/* LE & GG as compact single-line rows */}
          <div className="flex flex-col gap-2 pt-1">
            <ResourceRow
              shortKey="LE"
              value={derived.LE}
              maxValue={LE_MAX}
              color={C.LE}
              info={<><span style={{color:C.LE}}>Lebensenergie</span>: (<A k="KK"/>×2 + <A k="AU"/>) × 3</>}
            />
            <ResourceRow
              shortKey="GG"
              value={derived.GG}
              maxValue={GG_MAX}
              color={C.GG}
              info={<><span style={{color:C.GG}}>Geist. Gesundheit</span>: (<A k="AU"/>+<A k="IN"/>+<A k="MB"/>×2) × 3</>}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
