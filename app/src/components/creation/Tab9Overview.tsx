import { useStore } from '../../store/useStore';
import { ATTRIBUTES } from '../../data/attributes';
import { PROFESSION_MAP } from '../../data/professions';
import { calcDerived } from '../../rules/derivedValues';
import { ABILITY_MAP } from '../../data/specialAbilities';
import { TALENT_CATEGORIES } from '../../data/talents';

export function Tab9Overview({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const { setScreen, exportCharacter } = useStore();

  if (!char) return null;

  const derived = calcDerived(char);
  const prof = char.profession ? PROFESSION_MAP[char.profession] : null;

  const allSpecs = [
    char.specProfession && { ...char.specProfession, label: 'Beruf' },
    char.specHobby1 && { ...char.specHobby1, label: 'Hobby 1' },
    char.specFreePositive && { ...char.specFreePositive, label: 'Frei +' },
    char.specFreeNegative && { ...char.specFreeNegative, label: 'Frei −' },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg text-paper">Übersicht</h2>
        <p className="text-xs text-muted">Zusammenfassung deines Charakters.</p>
      </div>

      {/* Basic info */}
      <div className="bg-surface border border-hairline rounded-lg p-3 space-y-1">
        <div className="font-display text-xl text-paper">{char.info.name || 'Unbenannt'}</div>
        <div className="text-sm text-muted">{char.info.professionName || prof?.label || '—'}</div>
        <div className="flex gap-3 text-xs text-faint mt-1">
          {char.info.gender && <span>{char.info.gender}</span>}
          {char.info.age && <span>{char.info.age} Jahre</span>}
          {char.info.height && <span>{char.info.height} cm</span>}
        </div>
      </div>

      {/* Attributes */}
      <div className="bg-surface border border-hairline rounded-lg p-3">
        <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Attribute</p>
        <div className="grid grid-cols-3 gap-2">
          {ATTRIBUTES.map(attr => (
            <div key={attr.key} className="flex items-center gap-2">
              <span className="font-mono text-xs" style={{ color: attr.color }}>{attr.key}</span>
              <span className="font-mono text-sm text-primary">{char.attributes[attr.key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Derived */}
      <div className="bg-surface border border-hairline rounded-lg p-3">
        <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Abgeleitete Werte</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(derived).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className="font-mono text-xs text-muted">{key}</div>
              <div className="font-mono text-lg text-primary">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Talents summary */}
      <div className="bg-surface border border-hairline rounded-lg p-3">
        <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Talente</p>
        <div className="space-y-1">
          {TALENT_CATEGORIES.map(cat => {
            const talents = cat.talents.filter(t => (char.talents[t.name] ?? 0) > 0);
            if (talents.length === 0) return null;
            return (
              <div key={cat.key}>
                <span className="text-xs font-medium" style={{ color: cat.color }}>{cat.label}</span>
                <div className="flex flex-wrap gap-2 mt-1 ml-2">
                  {talents.map(t => (
                    <span key={t.name} className="text-xs text-muted">
                      {t.name} <span className="font-mono text-primary">{char.talents[t.name]}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Specifications */}
      {allSpecs.length > 0 && (
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Spezifika</p>
          <div className="space-y-1">
            {allSpecs.map((s, i) => s && (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-xs px-1 rounded font-mono ${s.modifier > 0 ? 'text-danger' : 'text-success'}`}>
                  {s.modifier > 0 ? `+${s.modifier}` : s.modifier}
                </span>
                <span className="text-sm text-primary">{s.name}</span>
                <span className="text-xs text-faint">({s.label})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special abilities */}
      {char.specialAbilities.length > 0 && (
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted mb-2 font-medium uppercase tracking-wider">Besondere Fähigkeiten</p>
          <div className="flex flex-wrap gap-2">
            {char.specialAbilities.map(id => (
              <span key={id} className="text-xs text-primary bg-raised px-2 py-1 rounded border border-hairline">
                {ABILITY_MAP[id]?.name ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => exportCharacter(charId)}
          className="flex-1 py-2.5 border border-hairline rounded-lg text-sm text-muted hover:text-primary hover:border-muted transition-colors"
        >
          JSON Export
        </button>
        <button
          onClick={() => setScreen('sheet')}
          className="flex-1 py-2.5 bg-paper text-bg font-medium rounded-lg text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          Abschließen →
        </button>
      </div>
    </div>
  );
}
