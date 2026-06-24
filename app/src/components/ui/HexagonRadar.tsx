import type { AttributeKey } from '../../types/character';
import { ATTR_MAX } from '../../data/attributes';

interface HexagonRadarProps {
  values: Record<AttributeKey, number>;
  size?: number;
  showLabels?: boolean;
}

const ORDER: AttributeKey[] = ['KK', 'GE', 'AU', 'CH', 'IN', 'MB'];
const COLORS: Record<AttributeKey, string> = {
  KK: '#CC2828', GE: '#C89A10', AU: '#D05020',
  CH: '#CC2888', IN: '#1E58C8', MB: '#7030B0',
};

function hexPoint(cx: number, cy: number, r: number, i: number): [number, number] {
  const angle = ((i * 60) - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function HexagonRadar({ values, size = 200, showLabels = true }: HexagonRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = showLabels ? size / 2 - 24 : size / 2 - 8;

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const gridHex = (frac: number) =>
    ORDER.map((_, i) => hexPoint(cx, cy, maxR * frac, i))
      .map(([x, y]) => `${x},${y}`)
      .join(' ');

  const valuePoints = ORDER.map((key, i) => {
    const frac = values[key] / ATTR_MAX;
    return hexPoint(cx, cy, maxR * frac, i);
  });

  const valuePath = valuePoints.map(([x, y]) => `${x},${y}`).join(' ');

  const labelPoints = ORDER.map((_, i) => hexPoint(cx, cy, maxR + 16, i));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map(frac => (
        <polygon
          key={frac}
          points={gridHex(frac)}
          fill="none"
          stroke="#2D303A"
          strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {ORDER.map((_, i) => {
        const [x, y] = hexPoint(cx, cy, maxR, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2D303A" strokeWidth="1" />;
      })}
      {/* Value area */}
      <polygon
        points={valuePath}
        fill="rgba(232,225,207,0.12)"
        stroke="#E8E1CF"
        strokeWidth="1.5"
      />
      {/* Value dots */}
      {valuePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={COLORS[ORDER[i]]} />
      ))}
      {/* Labels (optional) */}
      {showLabels && ORDER.map((key, i) => {
        const [lx, ly] = labelPoints[i];
        return (
          <text
            key={key}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontFamily="IBM Plex Mono"
            fontWeight="500"
            fill={COLORS[key]}
          >
            {key}
          </text>
        );
      })}
    </svg>
  );
}
