import { useStore } from '../../store/useStore';
import { TALENT_CATEGORIES, TALENT_CATEGORY_OF } from '../../data/talents';
import { SPECIFICATIONS } from '../../data/specifications';
import { talentAvailable } from '../../rules/talentBudget';
import type { Specification, TalentCategory } from '../../types/character';
import { SpecPicker } from '../ui/SpecPicker';

export function Tab6Hobbies({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  const hobby1Category: TalentCategory | undefined = char.hobby1Talent
    ? (TALENT_CATEGORY_OF[char.hobby1Talent] ?? char.customTalents.find(t => t.name === char.hobby1Talent)?.category)
    : undefined;

  // Points bonus that Hobby 1 provides, shown live
  const hobby1Cat = hobby1Category;
  const hobby1PtsLabel = hobby1Cat
    ? `+5 Punkte in "${TALENT_CATEGORIES.find(c => c.key === hobby1Cat)?.label ?? hobby1Cat}"`
    : '+5 Punkte';

  function handleSpec1Change(spec: Specification | null) {
    patchCharacter(charId, c => {
      c.specHobby1 = spec;
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
        <h2 className="font-display text-lg text-paper">Hobbys</h2>
        <p className="text-xs text-muted">
          Optional. Hobby 1 gibt +5 Punkte in der Talentkategorie des gewählten Talents + ein negatives Spezifikum.
          Hobby 2 gibt +3 Punkte.
        </p>
      </div>

      {/* Hobby 1 */}
      <div className="bg-surface border border-hairline rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-primary">Hobby 1</span>
          <span className="text-xs font-mono text-paper bg-paper/10 px-1.5 py-0.5 rounded">{hobby1PtsLabel}</span>
        </div>

        {/* Hobby name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Name des Hobbys</label>
          <input
            type="text"
            placeholder="z.B. Bogenschießen, Fotografieren…"
            value={char.hobby1Name}
            onChange={e => patchCharacter(charId, c => { c.hobby1Name = e.target.value; })}
            className="bg-raised border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
          />
        </div>

        {/* Talent select */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Passendes Talent</label>
          <select
            value={char.hobby1Talent ?? ''}
            onChange={e => {
              const v = e.target.value || null;
              patchCharacter(charId, c => { c.hobby1Talent = v; if (!v) c.specHobby1 = null; });
            }}
            className="bg-raised border border-hairline rounded px-2 py-2 text-primary text-sm focus:outline-none focus:border-muted"
          >
            <option value="">— Kein Talent verknüpfen —</option>
            {TALENT_CATEGORIES.map(cat => (
              <optgroup key={cat.key} label={cat.label}>
                {cat.talents.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
                {char.customTalents.filter(ct => ct.category === cat.key).map(ct => (
                  <option key={ct.name} value={ct.name}>{ct.name} ✎</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Live budget preview */}
        {char.hobby1Talent && hobby1Cat && (
          <p className="text-[10px] text-success">
            Die Talentkategorie „{TALENT_CATEGORIES.find(c => c.key === hobby1Cat)?.label}" hat jetzt{' '}
            {talentAvailable(char, hobby1Cat)} verfügbare Punkte.
          </p>
        )}

        {/* Spec for Hobby 1 */}
        {char.hobby1Talent && (
          <SpecPicker
            label="Negatives Spezifikum zu Hobby 1"
            hint="Der Modifikatorwert wird bei Hobby-Spezifika ignoriert."
            polarity="negative"
            filterCategory={hobby1Category}
            value={char.specHobby1}
            onChange={handleSpec1Change}
            customSpecs={char.customSpecifications}
          />
        )}
      </div>

      {/* Hobby 2 */}
      <div className="bg-surface border border-hairline rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-primary">Hobby 2</span>
          <span className="text-xs font-mono text-paper bg-paper/10 px-1.5 py-0.5 rounded">+3 Punkte</span>
        </div>

        {/* Hobby name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Name des Hobbys</label>
          <input
            type="text"
            placeholder="z.B. Kochen, Klettern…"
            value={char.hobby2Name}
            onChange={e => patchCharacter(charId, c => { c.hobby2Name = e.target.value; })}
            className="bg-raised border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
          />
        </div>

        {/* Talent select */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Passendes Talent</label>
          <select
            value={char.hobby2Talent ?? ''}
            onChange={e => patchCharacter(charId, c => { c.hobby2Talent = e.target.value || null; })}
            className="bg-raised border border-hairline rounded px-2 py-2 text-primary text-sm focus:outline-none focus:border-muted"
          >
            <option value="">— Kein Talent verknüpfen —</option>
            {TALENT_CATEGORIES.map(cat => (
              <optgroup key={cat.key} label={cat.label}>
                {cat.talents.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
                {char.customTalents.filter(ct => ct.category === cat.key).map(ct => (
                  <option key={ct.name} value={ct.name}>{ct.name} ✎</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Live budget preview */}
        {char.hobby2Talent && (() => {
          const cat = TALENT_CATEGORY_OF[char.hobby2Talent!] ?? char.customTalents.find(t => t.name === char.hobby2Talent)?.category;
          return cat ? (
            <p className="text-[10px] text-success">
              Die Talentkategorie „{TALENT_CATEGORIES.find(c => c.key === cat)?.label}" hat jetzt{' '}
              {talentAvailable(char, cat)} verfügbare Punkte.
            </p>
          ) : null;
        })()}
      </div>
    </div>
  );
}
