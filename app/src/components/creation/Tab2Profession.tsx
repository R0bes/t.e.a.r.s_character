import { useStore } from '../../store/useStore';
import { PROFESSIONS } from '../../data/professions';
import { ATTRIBUTES } from '../../data/attributes';
import { TALENT_CATEGORIES, TALENT_CATEGORY_OF } from '../../data/talents';
import { SPECIFICATIONS } from '../../data/specifications';
import { talentAvailable } from '../../rules/talentBudget';
import type { Character, ProfessionKey, Specification, TalentCategory } from '../../types/character';
import { SpecPicker } from '../ui/SpecPicker';

const PROF_ICONS: Record<ProfessionKey, string> = {
  koerperlich:  '💪',
  handwerklich: '🔧',
  kundenkontakt:'🤝',
  kreativ:      '🎨',
  denkend:      '🧠',
  militaerisch: '⚔️',
  medizinisch:  '🏥',
  arbeitslos:   '🎓',
};

function saveCustomSpec(
  patchCharacter: (id: string, updater: (c: Character) => void) => void,
  charId: string,
  field: 'specProfession' | 'specHobby1',
  spec: Specification | null,
) {
  patchCharacter(charId, c => {
    c[field] = spec;
    if (spec && !SPECIFICATIONS.find(s => s.name === spec.name)) {
      if (!c.customSpecifications.find(s => s.name === spec.name)) {
        c.customSpecifications.push(spec);
      }
    }
  });
}

export function Tab2Profession({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  function selectProfession(key: ProfessionKey) {
    patchCharacter(charId, c => {
      c.profession = key;
      const prof = PROFESSIONS.find(p => p.key === key)!;
      const baseAttrs = { KK: 8, GE: 8, AU: 8, CH: 8, IN: 8, MB: 8 } as typeof c.attributes;
      for (const [k, minVal] of Object.entries(prof.attrMin)) {
        baseAttrs[k as keyof typeof baseAttrs] = minVal as number;
      }
      c.attributes = baseAttrs;
    });
  }

  const hobby1Category: TalentCategory | undefined = char.hobby1Talent
    ? (TALENT_CATEGORY_OF[char.hobby1Talent] ?? char.customTalents.find(t => t.name === char.hobby1Talent)?.category)
    : undefined;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* ── Profession selection ── */}
      <div className="space-y-2">
        <h2 className="font-display text-lg text-paper">Berufskategorie</h2>
        <p className="text-xs text-muted">Legt Start-Attribute und Talentbudgets fest.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROFESSIONS.map(prof => {
            const selected = char.profession === prof.key;
            return (
              <button
                key={prof.key}
                onClick={() => selectProfession(prof.key)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selected
                    ? 'border-paper bg-raised text-primary'
                    : 'border-hairline bg-surface text-muted hover:border-muted hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{PROF_ICONS[prof.key]}</span>
                  <span className="font-medium text-sm">{prof.label}</span>
                  {selected && <span className="ml-auto text-paper text-xs">✓</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(prof.attrMin).map(([attr, val]) => {
                    const meta = ATTRIBUTES.find(a => a.key === attr);
                    return (
                      <span
                        key={attr}
                        className="text-[10px] font-mono px-1 rounded"
                        style={{ color: meta?.color, backgroundColor: `${meta?.color}22` }}
                      >
                        {attr} min {val}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pflicht-Spezifikum ── */}
      <div className="space-y-2 border-t border-hairline pt-4">
        <div>
          <h3 className="font-display text-base text-paper">Pflicht-Spezifikum</h3>
          <p className="text-xs text-muted mt-0.5">
            Jeder Charakter hat ein negatives Spezifikum, das zum Beruf passt.
          </p>
        </div>
        <SpecPicker
          label="Negatives Spezifikum (Pflicht)"
          hint="Muss inhaltlich zum Beruf passen."
          polarity="negative"
          value={char.specProfession}
          onChange={spec => saveCustomSpec(patchCharacter, charId, 'specProfession', spec)}
          customSpecs={char.customSpecifications}
        />
      </div>

      {/* ── Hobby 1 ── */}
      <div className="space-y-2 border-t border-hairline pt-4">
        <div>
          <h3 className="font-display text-base text-paper">Hobby 1</h3>
          <p className="text-xs text-muted mt-0.5">
            Gibt +5 Punkte fest auf das gewählte Talent + ein negatives Spezifikum (Modifier wird ignoriert).
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Name des Hobbys</label>
          <input
            type="text"
            placeholder="z.B. Bogenschießen, Fotografie…"
            value={char.hobby1Name}
            onChange={e => patchCharacter(charId, c => { c.hobby1Name = e.target.value; })}
            className="bg-raised border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
          />
        </div>
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
        {char.hobby1Talent && hobby1Category && (
          <p className="text-[10px] text-success">
            „{char.hobby1Talent}" erhält +5 Punkte fix (Kategorie hat jetzt insgesamt{' '}
            {talentAvailable(char, hobby1Category) + 5} Punkte für dieses Talent).
          </p>
        )}
        {char.hobby1Talent && (
          <SpecPicker
            label="Negatives Spezifikum zu Hobby 1"
            hint="Modifier wird ignoriert — die +5 Punkte sind bereits der Bonus."
            polarity="negative"
            filterCategory={hobby1Category}
            value={char.specHobby1}
            onChange={spec => saveCustomSpec(patchCharacter, charId, 'specHobby1', spec)}
            customSpecs={char.customSpecifications}
          />
        )}
      </div>

      {/* ── Hobby 2 ── */}
      <div className="space-y-2 border-t border-hairline pt-4">
        <div>
          <h3 className="font-display text-base text-paper">Hobby 2</h3>
          <p className="text-xs text-muted mt-0.5">
            Gibt +3 Punkte fest auf das gewählte Talent. Kein Spezifikum nötig.
          </p>
        </div>
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
        {char.hobby2Talent && (
          <p className="text-[10px] text-success">
            „{char.hobby2Talent}" erhält +3 Punkte fix.
          </p>
        )}
      </div>
    </div>
  );
}
