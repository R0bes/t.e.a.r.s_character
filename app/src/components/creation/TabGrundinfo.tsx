import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { PROFESSIONS } from '../../data/professions';
import { ATTRIBUTES } from '../../data/attributes';
import { TALENT_CATEGORIES, TALENT_CATEGORY_OF } from '../../data/talents';
import { SPECIFICATIONS, isNegativeSpec } from '../../data/specifications';
import type { Character, ProfessionKey, Specification, TalentCategory } from '../../types/character';
import { SpecPicker } from '../ui/SpecPicker';

const CAT_COLOR: Record<TalentCategory, string> = {
  koerperlich: '#E07040',
  motorisch:   '#28B4C0',
  geistig:     '#7C56D0',
  sozial:      '#3CB870',
  kampf:       '#C83030',
};

const CAT_SHORT: Record<TalentCategory, string> = {
  koerperlich: 'KÖR',
  motorisch:   'MOT',
  geistig:     'GEI',
  sozial:      'SOZ',
  kampf:       'KBK',
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

// Primary category per profession (for icon button color)
const PROF_PRIMARY_CAT: Record<ProfessionKey, TalentCategory> = {
  koerperlich:  'koerperlich',
  handwerklich: 'motorisch',
  kundenkontakt:'sozial',
  kreativ:      'geistig',
  denkend:      'geistig',
  militaerisch: 'kampf',
  medizinisch:  'motorisch',
  arbeitslos:   'sozial',
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

// ── Spec Overlay ──────────────────────────────────────────────────────────────
function SpecOverlay({
  value,
  customSpecs,
  onSelect,
  onClose,
}: {
  value: Specification | null;
  customSpecs: Specification[];
  onSelect: (spec: Specification | null) => void;
  onClose: () => void;
}) {
  const negativeSpecs = SPECIFICATIONS.filter(isNegativeSpec);
  const negativeCustom = customSpecs.filter(isNegativeSpec);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex flex-col h-full max-w-lg mx-auto w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-danger/80">
            Negatives Spezifikum wählen
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {/* Clear selection */}
          {value && (
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-hairline text-faint text-xs hover:border-muted hover:text-muted transition-colors"
            >
              — kein Spezifikum —
            </button>
          )}

          {/* Specs grouped by category */}
          {TALENT_CATEGORIES.map(cat => {
            const inCat = negativeSpecs.filter(s => s.category === cat.key);
            const customInCat = negativeCustom.filter(s => s.category === cat.key);
            const all = [...inCat, ...customInCat];
            if (!all.length) return null;
            const color = CAT_COLOR[cat.key];
            return (
              <div key={cat.key}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 px-1" style={{ color }}>
                  {cat.label}
                </p>
                <div className="space-y-1.5">
                  {all.map(spec => {
                    const selected = value?.name === spec.name;
                    return (
                      <button
                        key={spec.name}
                        onClick={() => { onSelect(spec); onClose(); }}
                        className="w-full text-left px-3 py-2.5 rounded-lg border transition-all hover:opacity-90"
                        style={{
                          backgroundColor: selected ? `${color}20` : `${color}0A`,
                          borderColor: selected ? `${color}70` : `${color}28`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-semibold leading-tight" style={{ color }}>
                            {spec.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-danger ml-2 shrink-0">
                            +{spec.modifier}
                          </span>
                        </div>
                        <p className="text-[9px] text-faint leading-snug">{spec.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TabGrundinfo({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);

  if (!char) return null;
  const safeChar = char;

  const [genderOpen,  setGenderOpen]  = useState(!char.info.gender);
  const [profOpen,    setProfOpen]    = useState(!char.profession);
  const [specOverlay, setSpecOverlay] = useState(false);

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
  const profColor      = selectedProf ? CAT_COLOR[PROF_PRIMARY_CAT[selectedProf.key]] : undefined;

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

      {/* ── Geschlecht ── */}
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
          { key: 'age',    icon: '⏱', placeholder: 'Alter',   suffix: 'Jahre' },
          { key: 'height', icon: '📏', placeholder: 'Größe',   suffix: 'cm'    },
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

      {/* ── Beruf (grouped card) ── */}
      <div className="rounded-lg border border-hairline overflow-hidden">
        {/* Section header */}
        <div className="px-3 py-1.5 bg-raised/60 border-b border-hairline">
          <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Beruf</span>
        </div>

        <div className="p-3 space-y-3">
          {/* Row: Berufsbezeichnung + Kategorie-Icon-Button */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={char.info.professionName}
              onChange={e => patchInfo('professionName', e.target.value)}
              placeholder="Berufsbezeichnung (z.B. Kassiererin)"
              className="flex-1 bg-raised border border-hairline rounded-lg px-3 py-2.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted transition-colors"
            />
            {/* Kategorie-Icon-Button */}
            <button
              onClick={() => setProfOpen(v => !v)}
              className="w-11 h-11 shrink-0 rounded-lg border text-xl flex items-center justify-center transition-colors"
              style={profColor ? {
                borderColor: profColor + '80',
                backgroundColor: profColor + '18',
              } : { borderStyle: 'dashed' }}
              title={selectedProf ? selectedProf.label : 'Berufskategorie wählen'}
            >
              {selectedProf ? PROF_ICONS[selectedProf.key] : '?'}
            </button>
          </div>

          {/* Profession picker grid — open/close */}
          {profOpen && (
            <div className="grid grid-cols-2 gap-2">
              {PROFESSIONS.map(prof => {
                const selected = char.profession === prof.key;
                const color    = CAT_COLOR[PROF_PRIMARY_CAT[prof.key]];
                return (
                  <button
                    key={prof.key}
                    onClick={() => { selectProfession(prof.key); setProfOpen(false); }}
                    className="relative text-left p-3 rounded-lg border transition-colors"
                    style={{
                      borderColor: selected ? color + 'CC' : '#2D303A',
                      backgroundColor: selected ? color + '18' : '#1B1D23',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base leading-none">{PROF_ICONS[prof.key]}</span>
                      <span className="text-xs font-medium leading-tight text-primary">{prof.label}</span>
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

          {/* Divider */}
          <div className="border-t border-hairline" />

          {/* Pflicht-Spezifikum button */}
          <button
            onClick={() => setSpecOverlay(true)}
            className="w-full text-left px-3 py-2.5 rounded-lg border transition-colors"
            style={char.specProfession ? {
              borderColor: '#E83050' + '55',
              backgroundColor: '#E83050' + '0C',
            } : {
              borderStyle: 'dashed',
              borderColor: '#2D303A',
            }}
          >
            {char.specProfession ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-danger/90">{char.specProfession.name}</span>
                <span className="text-[11px] font-mono font-bold text-danger ml-2 shrink-0">
                  +{char.specProfession.modifier}
                </span>
              </div>
            ) : (
              <span className="text-sm text-faint">— Negatives Spezifikum wählen —</span>
            )}
            {char.specProfession?.description && (
              <p className="text-[9px] text-faint mt-0.5 leading-snug">{char.specProfession.description}</p>
            )}
          </button>
        </div>
      </div>

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

      {/* ── Spec Overlay ── */}
      {specOverlay && (
        <SpecOverlay
          value={char.specProfession}
          customSpecs={char.customSpecifications}
          onSelect={spec => saveSpec(patch, charId, 'specProfession', spec)}
          onClose={() => setSpecOverlay(false)}
        />
      )}
    </div>
  );
}
