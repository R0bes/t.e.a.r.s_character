export interface SpiderAxis {
  key: string;
  label?: string;
  value: number;
  maxValue: number;
  color: string;
}

export interface HatchZone {
  from: number;
  to: number;
  color: string;
  density: 'light' | 'dense';
}

export interface ColorZone {
  from: number;
  to: number;
  color: string;
  opacity: number;
}

interface SpiderChartProps {
  axes: SpiderAxis[];
  size?: number;
  gridValues?: number[];
  showGridLabels?: boolean;
  showAxisLabels?: boolean;
  showValueLabels?: boolean;
  dotRadius?: number;
  chartId?: string;
  hatchZones?: HatchZone[];
  colorZones?: ColorZone[];
  labelGap?: number;
  className?: string;
  fillBlur?: number;
}

function point(cx: number, cy: number, r: number, i: number, n: number): [number, number] {
  const angle = ((i / n) * 360 - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function ringPath(cx: number, cy: number, maxR: number, fracOuter: number, fracInner: number, n: number): string {
  const outer = Array.from({ length: n }, (_, i) => point(cx, cy, maxR * fracOuter, i, n));
  const inner = Array.from({ length: n }, (_, i) => point(cx, cy, maxR * fracInner, i, n));
  // Outer ring clockwise, inner ring counter-clockwise → evenodd fills the band
  const outerPath = outer.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
  const innerPath = inner.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
  return `${outerPath} ${innerPath}`;
}

export function SpiderChart({
  axes,
  size = 180,
  gridValues = [5, 10, 14, 17],
  showGridLabels = false,
  showAxisLabels = false,
  showValueLabels = false,
  dotRadius = 6,
  chartId = 'sc',
  hatchZones = [],
  colorZones = [],
  labelGap = 10,
  className = '',
  fillBlur = 0,
}: SpiderChartProps) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = showAxisLabels ? size / 2 - 28 : size / 2 - 4;
  const refMax = axes[0]?.maxValue ?? 19;

  const gridFracs = gridValues.map(v => v / refMax);
  const outerPts = axes.map((_, i) => point(cx, cy, maxR, i, n));
  const valuePts = axes.map((ax, i) => {
    const frac = Math.max(0, Math.min(1, ax.value / ax.maxValue));
    return point(cx, cy, maxR * frac, i, n);
  });

  const outerPoly = outerPts.map(p => p.join(',')).join(' ');
  const valuePoly = valuePts.map(p => p.join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible" className={className || undefined}>
      <defs>
        {fillBlur > 0 && (
          <filter id={`${chartId}-fill-blur`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={fillBlur} />
          </filter>
        )}

        {/* Edge-to-edge color gradients: each sector transitions from color[i] to color[j] */}
        {axes.map((ax, i) => {
          const j = (i + 1) % n;
          const [ox1, oy1] = outerPts[i];
          const [ox2, oy2] = outerPts[j];
          return (
            <linearGradient
              key={ax.key}
              id={`${chartId}-edge-${i}`}
              x1={ox1} y1={oy1} x2={ox2} y2={oy2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor={ax.color}        stopOpacity={0.7} />
              <stop offset="100%" stopColor={axes[j].color}   stopOpacity={0.7} />
            </linearGradient>
          );
        })}

        {/* Radial mask: transparent at center, opaque at outer edge */}
        <radialGradient id={`${chartId}-rfade`} cx={cx} cy={cy} r={maxR} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="white" stopOpacity={0}   />
          <stop offset="25%"  stopColor="white" stopOpacity={0.25} />
          <stop offset="100%" stopColor="white" stopOpacity={1}   />
        </radialGradient>
        <mask id={`${chartId}-cmask`}>
          <rect x={0} y={0} width={size} height={size} fill={`url(#${chartId}-rfade)`} />
        </mask>

        {hatchZones.map((zone, zi) => (
          <pattern
            key={zi}
            id={`${chartId}-hatch-${zi}`}
            patternUnits="userSpaceOnUse"
            width={zone.density === 'dense' ? 4 : 7}
            height={zone.density === 'dense' ? 4 : 7}
            patternTransform="rotate(45)"
          >
            <line
              x1="0" y1="0" x2="0"
              y2={zone.density === 'dense' ? 4 : 7}
              stroke={zone.color}
              strokeWidth={zone.density === 'dense' ? 1.2 : 0.9}
              strokeOpacity={zone.density === 'dense' ? 0.45 : 0.30}
            />
          </pattern>
        ))}
      </defs>

      {/* Grid rings */}
      {gridFracs.map((frac, gi) => {
        const pts = axes.map((_, i) => point(cx, cy, maxR * frac, i, n).join(',')).join(' ');
        return (
          <polygon
            key={gi}
            points={pts}
            fill="none"
            stroke="#2D303A"
            strokeWidth={frac === 1 ? 1.2 : 0.7}
            strokeDasharray={frac < 1 ? '2,3' : undefined}
          />
        );
      })}

      {/* Color zones — subtle solid band fills */}
      {colorZones.map((zone, zi) => {
        const fracOuter = Math.min(1, zone.to / refMax);
        const fracInner = Math.max(0, zone.from / refMax);
        const d = ringPath(cx, cy, maxR, fracOuter, fracInner, n);
        return (
          <path
            key={zi}
            d={d}
            fill={zone.color}
            fillOpacity={zone.opacity}
            fillRule="evenodd"
          />
        );
      })}

      {/* Hatch zones (drawn before axis lines so they don't cover them) */}
      {hatchZones.map((zone, zi) => {
        const fracOuter = Math.min(1, zone.to / refMax);
        const fracInner = Math.max(0, zone.from / refMax);
        const d = ringPath(cx, cy, maxR, fracOuter, fracInner, n);
        return (
          <path
            key={zi}
            d={d}
            fill={`url(#${chartId}-hatch-${zi})`}
            fillRule="evenodd"
            opacity={1}
          />
        );
      })}

      {/* Axis lines */}
      {outerPts.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2D303A" strokeWidth="0.8" />
      ))}

      {/* Sector fills — one triangle per sector, edge-color gradient + center fade */}
      <g
        mask={`url(#${chartId}-cmask)`}
        filter={fillBlur > 0 ? `url(#${chartId}-fill-blur)` : undefined}
      >
        {axes.map((ax, i) => {
          const j = (i + 1) % n;
          const [x1, y1] = valuePts[i];
          const [x2, y2] = valuePts[j];
          return (
            <polygon
              key={ax.key}
              points={`${cx},${cy} ${x1},${y1} ${x2},${y2}`}
              fill={`url(#${chartId}-edge-${i})`}
            />
          );
        })}
      </g>

      {/* Outer boundary */}
      <polygon points={outerPoly} fill="none" stroke="#2D303A" strokeWidth="1" />

      {/* Value polygon outline */}
      <polygon
        points={valuePoly}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />

      {/* Vertex dots with value centered inside */}
      {valuePts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={dotRadius} fill={axes[i].color} />
          {showValueLabels && (
            <text
              x={x} y={y}
              fontSize={dotRadius * (8.5 / 6)}
              fontFamily="IBM Plex Mono"
              fontWeight="700"
              fill="#1B1D23"
              textAnchor="middle"
              dy="0.35em"
            >
              {axes[i].value}
            </text>
          )}
        </g>
      ))}

      {/* Grid labels on axis 0 */}
      {showGridLabels && gridValues.map((v, gi) => {
        const frac = gridFracs[gi];
        const [lx, ly] = point(cx, cy, maxR * frac, 0, n);
        return (
          <text key={gi} x={lx + 4} y={ly + 1} fontSize="7" fontFamily="IBM Plex Mono" fill="#5A5D66">
            {v}
          </text>
        );
      })}

      {/* Axis labels at tips */}
      {showAxisLabels && axes.map((ax, i) => {
        const [lx, ly] = point(cx, cy, maxR + labelGap, i, n);
        const dx = lx - cx;
        const dy_ = ly - cy;
        const anchor = dx < -3 ? 'end' : dx > 3 ? 'start' : 'middle';
        const baseline = dy_ < -3 ? 'auto' : dy_ > 3 ? 'hanging' : 'middle';
        return (
          <text
            key={ax.key}
            x={lx} y={ly}
            fontSize="8.5"
            fontFamily="IBM Plex Mono"
            fontWeight="600"
            fill={ax.color}
            textAnchor={anchor}
            dominantBaseline={baseline}
            opacity={0.92}
          >
            {ax.label ?? ax.key}
          </text>
        );
      })}
    </svg>
  );
}
