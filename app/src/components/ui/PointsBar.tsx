interface PointsBarProps {
  total: number;
  used: number;
  color?: string;
  className?: string;
}

export function PointsBar({ total, used, color = '#E8E1CF', className = '' }: PointsBarProps) {
  const over = used > total;

  return (
    <div className={`flex gap-0.5 flex-wrap ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        const filled = i < used;
        return (
          <div
            key={i}
            className="h-2 rounded-sm flex-1 min-w-[6px] transition-colors"
            style={{
              backgroundColor: filled
                ? over ? '#D1453B' : color
                : '#2D303A',
            }}
          />
        );
      })}
      {over && (
        <div
          className="h-2 rounded-sm flex-1 min-w-[6px] bg-danger"
          style={{ minWidth: `${(used - total) * 8}px` }}
        />
      )}
    </div>
  );
}
