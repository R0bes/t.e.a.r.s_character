import { useStore } from '../../store/useStore';
import { SPECIAL_ABILITIES } from '../../data/specialAbilities';
import { varPtsLeft, varPtsSpent } from '../../rules/talentBudget';
import { VARIABLE_PTS } from '../../data/professions';
import { PointsBar } from '../ui/PointsBar';

export function Tab8SpecialAbilities({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  const left = varPtsLeft(char);
  const spent = varPtsSpent(char);

  function toggle(id: string) {
    const ability = SPECIAL_ABILITIES.find(a => a.id === id)!;
    const has = char!.specialAbilities.includes(id);
    if (has) {
      patchCharacter(charId, c => { c.specialAbilities = c.specialAbilities.filter(x => x !== id); });
    } else if (left >= ability.cost) {
      patchCharacter(charId, c => { c.specialAbilities.push(id); });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg text-paper">Besondere Fähigkeiten</h2>
        <p className="text-xs text-muted">
          Werden mit variablen Talentpunkten bezahlt (jede Berufskategorie gibt {VARIABLE_PTS} Punkte).
        </p>
      </div>

      {/* Budget */}
      <div className="bg-raised border border-hairline rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Variable Punkte</span>
          <span className={`font-mono font-medium ${left < 0 ? 'text-danger' : 'text-paper'}`}>
            {left} / {VARIABLE_PTS}
          </span>
        </div>
        <PointsBar total={VARIABLE_PTS} used={spent} color="#E8E1CF" />
      </div>

      {/* Abilities */}
      <div className="space-y-2">
        {SPECIAL_ABILITIES.map(ability => {
          const active = char.specialAbilities.includes(ability.id);
          const canAfford = left >= ability.cost;

          return (
            <button
              key={ability.id}
              onClick={() => toggle(ability.id)}
              disabled={!active && !canAfford}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left
                ${active
                  ? 'border-paper bg-paper/10 text-primary'
                  : canAfford
                    ? 'border-hairline bg-surface text-muted hover:border-muted hover:text-primary'
                    : 'border-hairline bg-surface text-faint opacity-50 cursor-not-allowed'
                }
              `}
            >
              <span className="text-sm font-medium">{ability.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{ability.cost} Punkte</span>
                {active && <span className="text-paper text-xs">✓</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
