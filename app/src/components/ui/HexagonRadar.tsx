import type { AttributeKey } from '../../types/character';
import { ATTR_MAX } from '../../data/attributes';

interface HexagonRadarProps {
  values: Record<AttributeKey, number>;
  size?: number;
  showLabels?: boolean;
}

const ORDER: AttributeKey[] = ['KK', 'GE', 'AU', 'CH', 'IN', 'MB'];
const COLORS: Record<AttributeKey, string> = {
  KK: '#8B2E22', GE: '#8C6A1D', AU: '#3F6B3A',
  CH: '#7A3560', IN: '#29707A', MB: '#3F3E7A',
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
          stroke="#B4A075"
          strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {ORDER.map((_, i) => {
        const [x, y] = hexPoint(cx, cy, maxR, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#B4A075" strokeWidth="1" />;
      })}
      {/* Value area */}
      <polygon
        points={valuePath}
        fill="rgba(43,29,16,0.10)"
        stroke="#2B1D10"
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
            fontFamily="Kalam"
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
