import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { PROFESSIONS } from '../../data/professions';
import { ATTRIBUTES } from '../../data/attributes';
import { TALENT_CATEGORIES, TALENT_CATEGORY_OF } from '../../data/talents';
import { SPECIFICATIONS } from '../../data/specifications';
import type { Character, ProfessionKey, Specification, TalentCategory } from '../../types/character';
import { SpecPicker } from '../ui/SpecPicker';

// Category abbreviations shown on profession cards (matching mockup)
const CAT_SHORT: Record<TalentCategory, string> = {
  koerperlich: 'KÖR',
  motorisch:   'MOT',
  geistig:     'GEI',
  sozial:      'SOZ',
  kampf:       'KBK',
};
const CAT_COLOR: Record<TalentCategory, string> = {
  koerperlich: '#D1453B',
  motorisch:   '#3E7FCE',
  geistig:     '#8C5FC4',
  sozial:      '#D6B23E',
  kampf:       '#7A2420',
};

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

const GENDER_OPTIONS = [
  { key: 'weiblich', symbol: '♀' },
  { key: 'männlich', symbol: '♂' },
  { key: 'divers',   symbol: '⚥' },
];

function saveSpec(
  patchCharacter: (id: string, upd: (c: Character) => void) => void,
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

export function TabGrundinfo({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);

  if (!char) return null;
  const safeChar = char;

  const [genderOpen, setGenderOpen] = useState(!char.info.gender);
  const [profOpen,   setProfOpen]   = useState(!char.profession);

  function patchInfo(key: keyof typeof safeChar.info, value: string) {
    patch(charId, c => { (c.info as Record<string, string>)[key] = value; });
  }

  function selectProfession(key: ProfessionKey) {
    patch(charId, c => {
      c.profession = key;
      const prof = PROFESSIONS.find(p => p.key === key)!;
      const base = { KK: 8, GE: 8, AU: 8, CH: 8, IN: 8, MB: 8 } as typeof c.attributes;
      for (const [k, v] of Object.entries(prof.attrMin)) {
        base[k as keyof typeof base] = v as number;
      }
      c.attributes = base;
    });
  }

  const hobby1Category: TalentCategory | undefined = char.hobby1Talent
    ? (TALENT_CATEGORY_OF[char.hobby1Talent] ?? char.customTalents.find(t => t.name === char.hobby1Talent)?.category)
    : undefined;

  const selectedGender = GENDER_OPTIONS.find(g => g.key === char.info.gender);
  const selectedProf   = PROFESSIONS.find(p => p.key === char.profession);

  return (
    <div className="flex flex-col gap-5 p-4">

      {/* ── Name ── */}
      <input
        type="text"
        value={char.info.name}
        onChange={e => patchInfo('name', e.target.value)}
        placeholder="Name des Charakters"
        className="w-full bg-raised border border-hairline rounded-lg px-4 py-3 text-primary text-base font-medium placeholder:text-faint focus:outline-none focus:border-muted transition-colors"
      />

      {/* ── Geschlecht: collapsible ── */}
      {!genderOpen ? (
        <button
          onClick={() => setGenderOpen(true)}
          className={`w-full py-2.5 rounded-lg border text-base transition-colors ${
            selectedGender
              ? 'border-paper/60 bg-paper/5 text-paper'
              : 'border-dashed border-hairline text-faint hover:border-muted hover:text-muted'
          }`}
        >
          {selectedGender ? `${selectedGender.symbol} ${selectedGender.key}` : '— Geschlecht wählen —'}
        </button>
      ) : (
        <div className="flex gap-2">
          {GENDER_OPTIONS.map(g => (
            <button
              key={g.key}
              onClick={() => { patchInfo('gender', g.key); setGenderOpen(false); }}
              className={`flex-1 py-3 rounded-lg border text-2xl transition-colors ${
                char.info.gender === g.key
                  ? 'border-paper text-paper bg-paper/10'
                  : 'border-hairline text-faint hover:text-muted hover:border-muted'
              }`}
            >
              {g.symbol}
            </button>
          ))}
        </div>
      )}

      {/* ── Alter / Größe / Gewicht ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'age',    icon: '⏱', placeholder: 'Alter',    suffix: 'Jahre' },
          { key: 'height', icon: '📏', placeholder: 'Größe',    suffix: 'cm'    },
          { key: 'weight', icon: '⚖',  placeholder: 'Gewicht', suffix: 'kg'    },
        ].map(f => (
          <div key={f.key} className="bg-raised border border-hairline rounded-lg p-2 flex flex-col items-center gap-1">
            <span className="text-base">{f.icon}</span>
            <input
              type="text"
              value={(char.info as Record<string, string>)[f.key] ?? ''}
              onChange={e => patchInfo(f.key as keyof typeof char.info, e.target.value)}
              placeholder={f.placeholder}
              className="w-full bg-transparent text-center text-primary text-sm font-mono placeholder:text-faint focus:outline-none"
            />
            <span className="text-[9px] text-faint">{f.suffix}</span>
          </div>
        ))}
      </div>

      {/* ── Berufsbezeichnung ── */}
      <input
        type="text"
        value={char.info.professionName}
        onChange={e => patchInfo('professionName', e.target.value)}
        placeholder="Berufsbezeichnung (z.B. Kassiererin)"
        className="w-full bg-raised border border-hairline rounded-lg px-4 py-2.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted transition-colors"
      />

      {/* ── Berufskategorie: collapsible ── */}
      <div className="space-y-2">
        {!profOpen ? (
          <button
            onClick={() => setProfOpen(true)}
            className={`w-full py-2.5 rounded-lg border text-sm transition-colors text-left px-4 ${
              selectedProf
                ? 'border-paper/60 bg-paper/5 text-paper'
                : 'border-dashed border-hairline text-faint hover:border-muted hover:text-muted'
            }`}
          >
            {selectedProf
              ? `${PROF_ICONS[selectedProf.key]} ${selectedProf.label}`
              : '— Berufskategorie wählen —'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {PROFESSIONS.map(prof => {
              const selected = char.profession === prof.key;
              return (
                <button
                  key={prof.key}
                  onClick={() => { selectProfession(prof.key); setProfOpen(false); }}
                  className={`relative text-left p-3 rounded-lg border transition-colors ${
                    selected
                      ? 'border-paper bg-raised text-primary'
                      : 'border-hairline bg-surface text-muted hover:border-muted hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base leading-none">{PROF_ICONS[prof.key]}</span>
                    <span className="text-xs font-medium leading-tight">{prof.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {Object.entries(prof.talentPts).map(([cat, pts]) => {
                      const c = cat as TalentCategory;
                      return (
                        <span key={c} className="text-[10px] font-mono font-medium" style={{ color: CAT_COLOR[c] }}>
                          +{pts} {CAT_SHORT[c]}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(prof.attrMin).map(([attr, val]) => {
                      const meta = ATTRIBUTES.find(a => a.key === attr);
                      return (
                        <span key={attr} className="text-[9px] font-mono px-1 rounded"
                          style={{ color: meta?.color, backgroundColor: `${meta?.color}22` }}>
                          {attr} {val}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pflicht-Spezifikum ── */}
      {char.profession && (
        <div className="space-y-2 border-t border-hairline pt-4">
          <p className="text-[10px] text-faint uppercase tracking-widest">Pflicht-Spezifikum</p>
          <p className="text-xs text-muted">Negatives Spezifikum passend zum Beruf.</p>
          <SpecPicker
            label="Negatives Spezifikum"
            polarity="negative"
            value={char.specProfession}
            onChange={spec => saveSpec(patch, charId, 'specProfession', spec)}
            customSpecs={char.customSpecifications}
          />
        </div>
      )}

      {/* ── Hobbies ── */}
      <div className="space-y-4 border-t border-hairline pt-4">
        <p className="text-[10px] text-faint uppercase tracking-widest">Hobbies</p>

        {/* Hobby 1 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Hobby 1</span>
            <span className="text-[10px] font-mono text-paper/50">+5 Punkte fix</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={char.hobby1Name}
              onChange={e => patch(charId, c => { c.hobby1Name = e.target.value; })}
              placeholder="Hobby-Name (optional)"
              className="w-full bg-raised border border-hairline rounded-lg px-3 py-2 pr-8 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
            />
            {(char.hobby1Name || char.hobby1Talent) && (
              <button
                onClick={() => patch(charId, c => { c.hobby1Name = ''; c.hobby1Talent = null; c.specHobby1 = null; })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={char.hobby1Talent ?? ''}
            onChange={e => {
              const v = e.target.value || null;
              patch(charId, c => { c.hobby1Talent = v; if (!v) c.specHobby1 = null; });
            }}
            className="w-full bg-raised border border-hairline rounded-lg px-3 py-2 text-primary text-sm focus:outline-none focus:border-muted appearance-none"
          >
            <option value="">— Talent auswählen —</option>
            {TALENT_CATEGORIES.map(cat => (
              <optgroup key={cat.key} label={cat.label}>
                {cat.talents.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                {char.customTalents.filter(ct => ct.category === cat.key).map(ct => (
                  <option key={ct.name} value={ct.name}>{ct.name} ✎</option>
                ))}
              </optgroup>
            ))}
          </select>
          {char.hobby1Talent && (
            <SpecPicker
              label="Negatives Spezifikum (Modifier wird ignoriert)"
              polarity="negative"
              filterCategory={hobby1Category}
              value={char.specHobby1}
              onChange={spec => saveSpec(patch, charId, 'specHobby1', spec)}
              customSpecs={char.customSpecifications}
            />
          )}
        </div>

        {/* Hobby 2 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Hobby 2</span>
            <span className="text-[10px] font-mono text-paper/50">+3 Punkte fix</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={char.hobby2Name}
              onChange={e => patch(charId, c => { c.hobby2Name = e.target.value; })}
              placeholder="Hobby-Name (optional)"
              className="w-full bg-raised border border-hairline rounded-lg px-3 py-2 pr-8 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
            />
            {(char.hobby2Name || char.hobby2Talent) && (
              <button
                onClick={() => patch(charId, c => { c.hobby2Name = ''; c.hobby2Talent = null; })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={char.hobby2Talent ?? ''}
            onChange={e => patch(charId, c => { c.hobby2Talent = e.target.value || null; })}
            className="w-full bg-raised border border-hairline rounded-lg px-3 py-2 text-primary text-sm focus:outline-none focus:border-muted appearance-none"
          >
            <option value="">— Talent auswählen —</option>
            {TALENT_CATEGORIES.map(cat => (
              <optgroup key={cat.key} label={cat.label}>
                {cat.talents.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                {char.customTalents.filter(ct => ct.category === cat.key).map(ct => (
                  <option key={ct.name} value={ct.name}>{ct.name} ✎</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
