interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  canIncrease?: boolean;
}

export function Stepper({ value, min = 0, max = 99, onChange, size = 'md', disabled = false, canIncrease }: StepperProps) {
  const sm = size === 'sm';
  const btnCls = sm
    ? 'w-6 h-6 text-xs'
    : 'w-8 h-8 text-sm';
  const valCls = sm
    ? 'w-6 text-sm font-mono'
    : 'w-8 text-base font-mono';

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        className={`${btnCls} rounded border border-hairline bg-raised text-muted hover:text-primary hover:border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center`}
      >
        −
      </button>
      <span className={`${valCls} text-center text-primary`}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max || (canIncrease !== undefined && !canIncrease)}
        className={`${btnCls} rounded border border-hairline bg-raised text-muted hover:text-primary hover:border-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center`}
      >
        +
      </button>
    </div>
  );
}
