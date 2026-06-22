import { useStore } from '../../store/useStore';
import { SPECIFICATIONS } from '../../data/specifications';
import type { Specification } from '../../types/character';
import { SpecPicker } from '../ui/SpecPicker';

export function Tab5RequiredSpec({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  function handleChange(spec: Specification | null) {
    patchCharacter(charId, c => {
      c.specProfession = spec;
      if (spec && !SPECIFICATIONS.find(s => s.name === spec.name)) {
        if (!c.customSpecifications.find(s => s.name === spec.name)) {
          c.customSpecifications.push(spec);
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg text-paper">Pflicht-Spezifikum</h2>
        <p className="text-xs text-muted">
          Wähle ein negatives Spezifikum, das zu deinem Beruf passt. Positive Modifikatorwerte = negativer Effekt für den Charakter.
        </p>
      </div>

      <SpecPicker
        label="Negatives Spezifikum (Pflicht)"
        hint="Muss inhaltlich zum Beruf passen."
        polarity="negative"
        value={char.specProfession}
        onChange={handleChange}
        customSpecs={char.customSpecifications}
      />
    </div>
  );
}
