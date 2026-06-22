export interface SpiderAxis {
  key: string;
  label?: string;
  value: number;
  maxValue: number;
  color: string;
}

interface SpiderChartProps {
  axes: SpiderAxis[];
  size?: number;
  gridValues?: number[];
  showGridLabels?: boolean;
  showAxisLabels?: boolean;
  /** Namespace for gradient IDs — must be unique per page if multiple charts coexist */
  chartId?: string;
}

function point(cx: number, cy: number, r: number, i: number, n: number): [number, number] {
  const angle = ((i / n) * 360 - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function SpiderChart({
  axes,
  size = 180,
  gridValues = [5, 10, 14, 17],
  showGridLabels = false,
  showAxisLabels = false,
  chartId = 'sc',
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

  const LABEL_GAP = 10;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      <defs>
        {axes.map((ax, i) => {
          const j = (i + 1) % n;
          const [ox1, oy1] = outerPts[i];
          const [ox2, oy2] = outerPts[j];
          return (
            <linearGradient
              key={ax.key}
              id={`${chartId}-grad-${i}`}
              x1={ox1} y1={oy1}
              x2={ox2} y2={oy2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor={ax.color}       stopOpacity={0.38} />
              <stop offset="100%" stopColor={axes[j].color}  stopOpacity={0.38} />
            </linearGradient>
          );
        })}
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

      {/* Axis lines */}
      {outerPts.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2D303A" strokeWidth="0.8" />
      ))}

      {/* Gradient sector fills */}
      {axes.map((ax, i) => {
        const j = (i + 1) % n;
        const [x1, y1] = valuePts[i];
        const [x2, y2] = valuePts[j];
        return (
          <polygon
            key={ax.key}
            points={`${cx},${cy} ${x1},${y1} ${x2},${y2}`}
            fill={`url(#${chartId}-grad-${i})`}
          />
        );
      })}

      {/* Outer boundary */}
      <polygon points={outerPoly} fill="none" stroke="#2D303A" strokeWidth="1" />

      {/* Value polygon outline */}
      <polygon
        points={valuePoly}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />

      {/* Vertex dots — colored per axis */}
      {valuePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={axes[i].color} />
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
        const [lx, ly] = point(cx, cy, maxR + LABEL_GAP, i, n);
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
