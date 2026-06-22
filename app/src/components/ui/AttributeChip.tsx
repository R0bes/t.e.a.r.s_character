import type { AttributeKey } from '../../types/character';
import { ATTR_MAP } from '../../data/attributes';

interface AttributeChipProps {
  attr: AttributeKey;
  size?: 'xs' | 'sm' | 'md';
}

export function AttributeChip({ attr, size = 'sm' }: AttributeChipProps) {
  const meta = ATTR_MAP[attr];
  const sizeMap = { xs: 'text-[10px] px-1 py-0', sm: 'text-xs px-1.5 py-0.5', md: 'text-sm px-2 py-1' };

  return (
    <span
      className={`font-mono font-medium rounded ${sizeMap[size]} inline-block`}
      style={{ color: meta.color, backgroundColor: `${meta.color}22`, border: `1px solid ${meta.color}44` }}
    >
      {attr}
    </span>
  );
}
