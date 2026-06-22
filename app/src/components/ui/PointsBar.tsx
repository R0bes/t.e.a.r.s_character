interface PointsBarProps {
  total: number;
  /** Number of points still available (filled segments). Segments deplete as this decreases. */
  used: number;
  color?: string;
  className?: string;
  /** If set, renders in blocks of this size (max 2 rows). Used for TP bars. */
  blockSize?: number;
}

export function PointsBar({ total, used, color = '#E8E1CF', className = '', blockSize }: PointsBarProps) {
  const remaining = Math.max(0, used);
  const over      = used < 0;

  if (blockSize && blockSize > 0) {
    const blocksCount  = Math.ceil(total / blockSize);
    const maxPerRow    = Math.ceil(blocksCount / 2);
    const segsPerRow   = maxPerRow * blockSize;
    const rows: boolean[][] = [];
    let segsDone = 0;
    for (let r = 0; r < 2 && segsDone < total; r++) {
      const count = Math.min(segsPerRow, total - segsDone);
      rows.push(Array.from({ length: count }, (_, i) => segsDone + i < remaining));
      segsDone += count;
    }

    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-0.5">
            {row.map((filled, si) => {
              const isBlockBoundary = si > 0 && si % blockSize === 0;
              return (
                <div
                  key={si}
                  className={`h-2 rounded-sm transition-colors ${isBlockBoundary ? 'ml-0.5' : ''}`}
                  style={{ flex: 1, minWidth: 4, backgroundColor: filled ? color : '#2D303A' }}
                />
              );
            })}
          </div>
        ))}
        {over && (
          <div className="h-2 rounded-sm bg-danger" style={{ minWidth: 6 }} />
        )}
      </div>
    );
  }

  // Default: single-row, uniform segments, fills left → right showing remaining points
  return (
    <div className={`flex gap-0.5 flex-wrap ${className}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-2 rounded-sm flex-1 min-w-[6px] transition-colors"
          style={{ backgroundColor: i < remaining ? color : '#2D303A' }}
        />
      ))}
      {over && (
        <div className="h-2 rounded-sm flex-1 min-w-[6px] bg-danger" />
      )}
    </div>
  );
}
