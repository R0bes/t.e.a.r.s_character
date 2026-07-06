import { TALENT_CAT_MAP } from '../../data/talents';
import { CatIcon } from './CatIcon';
import type { Specification } from '../../types/character';

export function SpecList({ specs }: { specs: (Specification | null | undefined)[] }) {
  const valid = specs.filter((s): s is Specification => !!s);
  if (valid.length === 0) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-3">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Spezifika</span>
      <div className="mt-2 space-y-1.5">
        {valid.map(spec => {
          const catMeta = TALENT_CAT_MAP[spec.category];
          return (
            <div
              key={spec.name}
              className="rounded-lg border p-2"
              style={{ borderColor: `${catMeta.color}30`, backgroundColor: `${catMeta.color}08` }}
            >
              <div className="flex items-center gap-1.5">
                <CatIcon src={catMeta.icon} size={12} />
                <span className="text-xs font-semibold" style={{ color: catMeta.color }}>{spec.name}</span>
              </div>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{spec.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
