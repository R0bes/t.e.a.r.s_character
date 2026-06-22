import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { PROFESSIONS } from '../../data/professions';
import { ATTRIBUTES } from '../../data/attributes';
import { TALENT_CATEGORIES, TALENT_CATEGORY_OF, TALENT_CAT_MAP } from '../../data/talents';
import { SPECIFICATIONS, isNegativeSpec, isPositiveSpec } from '../../data/specifications';
import type { Character, ProfessionKey, Specification, TalentCategory } from '../../types/character';

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

// ── Gender Overlay ────────────────────────────────────────────────────────────
function GenderOverlay({ value, onSelect, onClose }: {
  value: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col h-full max-w-lg mx-auto w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-paper/70">Geschlecht wählen</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {GENDER_OPTIONS.map(g => {
            const selected = value === g.key;
            return (
              <button
                key={g.key}
                onClick={() => { onSelect(g.key); onClose(); }}
                className="w-full flex items-center justify-center gap-4 px-4 py-5 rounded-lg border transition-all hover:opacity-90"
                style={{
                  backgroundColor: selected ? '#B8B8C020' : '#B8B8C00A',
                  borderColor:     selected ? '#B8B8C070' : '#2D303A',
                }}
              >
                <span className="text-4xl leading-none">{g.symbol}</span>
                {selected && <span className="text-[10px] text-paper font-bold ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Profession Category Overlay ───────────────────────────────────────────────
function ProfCatOverlay({ value, onSelect, onClose }: {
  value: ProfessionKey | null;
  onSelect: (key: ProfessionKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col h-full max-w-lg mx-auto w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-paper/70">Berufskategorie wählen</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            {PROFESSIONS.map(prof => {
              const selected = value === prof.key;
              const color    = CAT_COLOR[PROF_PRIMARY_CAT[prof.key]];
              return (
                <button
                  key={prof.key}
                  onClick={() => { onSelect(prof.key); onClose(); }}
                  className="text-left p-3 rounded-lg border transition-colors"
                  style={{ borderColor: selected ? color + 'CC' : '#2D303A', backgroundColor: selected ? color + '18' : '#1B1D23' }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base leading-none">{PROF_ICONS[prof.key]}</span>
                    <span className="text-xs font-medium leading-tight text-primary">{prof.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {Object.entries(prof.talentPts).map(([cat, pts]) => {
                      const c = cat as TalentCategory;
                      return <span key={c} className="text-[10px] font-mono font-medium" style={{ color: CAT_COLOR[c] }}>+{pts} {CAT_SHORT[c]}</span>;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(prof.attrMin).map(([attr, val]) => {
                      const meta = ATTRIBUTES.find(a => a.key === attr);
                      return <span key={attr} className="text-[9px] font-mono px-1 rounded" style={{ color: meta?.color, backgroundColor: `${meta?.color}22` }}>{attr} {val}</span>;
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Spec Overlay ──────────────────────────────────────────────────────────────
function SpecOverlay({
  value, customSpecs, filterCategory, specType = 'negative', excludeNames = [],
  onSelect, onClose,
}: {
  value: Specification | null;
  customSpecs: Specification[];
  filterCategory?: TalentCategory;
  specType?: 'negative' | 'positive';
  excludeNames?: string[];
  onSelect: (spec: Specification | null) => void;
  onClose: () => void;
}) {
  const filterFn   = specType === 'negative' ? isNegativeSpec : isPositiveSpec;
  const filteredBuiltin = SPECIFICATIONS.filter(filterFn).filter(s => !excludeNames.includes(s.name));
  const filteredCustom  = customSpecs.filter(filterFn).filter(s => !excludeNames.includes(s.name));

  const titleText   = specType === 'negative' ? 'Negatives Spezifikum wählen' : 'Positives Spezifikum wählen';
  const modColor    = specType === 'negative' ? 'text-danger' : 'text-success';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col h-full max-w-lg mx-auto w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className={`text-xs font-bold uppercase tracking-widest ${modColor}/80`}>{titleText}</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {value && (
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-hairline text-faint text-xs hover:border-muted hover:text-muted transition-colors mb-2"
            >
              — kein Spezifikum —
            </button>
          )}
          {TALENT_CATEGORIES
            .filter(cat => !filterCategory || cat.key === filterCategory)
            .map(cat => {
              const inCat = [
                ...filteredBuiltin.filter(s => s.category === cat.key),
                ...filteredCustom.filter(s => s.category === cat.key),
              ];
              return inCat.map(spec => {
                const selected = value?.name === spec.name;
                const modStr   = spec.modifier > 0 ? `+${spec.modifier}` : `${spec.modifier}`;
                return (
                  <button
                    key={spec.name}
                    onClick={() => { onSelect(spec); onClose(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg border transition-all hover:opacity-90"
                    style={{
                      backgroundColor: selected ? `${cat.color}20` : `${cat.color}0A`,
                      borderColor:     selected ? `${cat.color}70` : `${cat.color}28`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">{cat.icon}</span>
                        <span className="text-[11px] font-semibold" style={{ color: cat.color }}>
                          {spec.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ml-2 shrink-0 ${modColor}`}>
                        {modStr}
                      </span>
                    </div>
                    <p className="text-[9px] text-faint leading-snug">{spec.description}</p>
                  </button>
                );
              });
            })}
        </div>
      </div>
    </div>
  );
}

// ── Talent Overlay ────────────────────────────────────────────────────────────
function TalentOverlay({
  title, value, customTalents, onSelect, onClose,
}: {
  title: string;
  value: string | null;
  customTalents: Character['customTalents'];
  onSelect: (name: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col h-full max-w-lg mx-auto w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-paper/70">{title}</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {value && (
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-hairline text-faint text-xs hover:border-muted hover:text-muted transition-colors mb-2"
            >
              — kein Talent —
            </button>
          )}
          {TALENT_CATEGORIES.map(cat =>
            [...cat.talents, ...customTalents.filter(t => t.category === cat.key)].map(t => {
              const selected = value === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => { onSelect(t.name); onClose(); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg border transition-all hover:opacity-90"
                  style={{
                    backgroundColor: selected ? `${cat.color}20` : `${cat.color}0A`,
                    borderColor:     selected ? `${cat.color}70` : `${cat.color}28`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">{cat.icon}</span>
                    <span className="text-[11px] font-semibold" style={{ color: cat.color }}>
                      {t.name}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Spec display tile ─────────────────────────────────────────────────────────
function SpecDisplayTile({ spec, placeholder, modifierIgnored, onClick }: {
  spec: Specification | null;
  placeholder: string;
  modifierIgnored?: boolean;
  onClick: () => void;
}) {
  if (!spec) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-hairline text-faint text-sm hover:border-muted hover:text-muted transition-colors"
      >
        {placeholder}
      </button>
    );
  }
  const catMeta = TALENT_CAT_MAP[spec.category];
  const color   = catMeta.color;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg border transition-all hover:opacity-90"
      style={{ backgroundColor: `${color}20`, borderColor: `${color}60` }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] leading-none shrink-0">{catMeta.icon}</span>
          <span className="text-[11px] font-semibold leading-tight" style={{ color }}>
            {spec.name}
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold ml-2 shrink-0 ${modifierIgnored ? 'text-faint line-through' : 'text-danger'}`}>
          +{spec.modifier}
        </span>
      </div>
      <p className="text-[9px] text-faint leading-snug">{spec.description}</p>
    </button>
  );
}

// ── Talent display tile ───────────────────────────────────────────────────────
function TalentDisplayTile({ talentName, bonus, placeholder, onClick }: {
  talentName: string | null;
  bonus: number;
  placeholder: string;
  onClick: () => void;
}) {
  if (!talentName) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-hairline text-faint text-sm hover:border-muted hover:text-muted transition-colors"
      >
        {placeholder}
      </button>
    );
  }
  const catKey  = TALENT_CATEGORY_OF[talentName];
  const catMeta = catKey ? TALENT_CAT_MAP[catKey] : null;
  const color   = catMeta?.color ?? '#8C8F99';
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg border transition-all hover:opacity-90"
      style={{ backgroundColor: `${color}20`, borderColor: `${color}60` }}
    >
      <div className="flex items-center gap-1.5">
        {catMeta && <span className="text-[11px] leading-none shrink-0">{catMeta.icon}</span>}
        <span className="text-[11px] font-semibold" style={{ color }}>{talentName}</span>
        <span className="text-[9px] font-mono text-paper/60 ml-auto shrink-0">+{bonus}</span>
      </div>
    </button>
  );
}

// ── Hobby placeholder card ────────────────────────────────────────────────────
function HobbyPlaceholder({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center p-3 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors"
    >
      <span className="text-xs">{label}</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TabGrundinfo({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);

  if (!char) return null;
  const safeChar = char;

  const [genderOverlay,      setGenderOverlay]      = useState(false);
  const [profCatOverlay,     setProfCatOverlay]      = useState(false);
  const [specOverlay,        setSpecOverlay]         = useState(false);
  const [talentOverlay,      setTalentOverlay]       = useState(false);
  const [h1Open,             setH1Open]              = useState(false);
  const [h2Open,             setH2Open]              = useState(false);
  const [h1TalentOverlay,    setH1TalentOverlay]     = useState(false);
  const [h1SpecOverlay,      setH1SpecOverlay]       = useState(false);
  const [h2TalentOverlay,    setH2TalentOverlay]     = useState(false);
  const [freeNegOverlay,     setFreeNegOverlay]      = useState(false);
  const [freePosOverlay,     setFreePosOverlay]      = useState(false);

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

  const hobby1Active = !!(char.hobby1Name || char.hobby1Talent);
  const hobby2Active = !!(char.hobby2Name || char.hobby2Talent);
  const showHobby1   = h1Open || hobby1Active;
  const showHobby2   = showHobby1 && (h2Open || hobby2Active);

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

      {/* ── Geschlecht + Alter / Größe / Gewicht — 4 columns ── */}
      <div className="grid grid-cols-4 gap-2">
        {/* Gender — placeholder style when not selected */}
        <button
          onClick={() => setGenderOverlay(true)}
          className={`rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-colors ${
            selectedGender
              ? 'bg-raised border border-hairline hover:border-muted'
              : 'border border-dashed border-hairline text-faint hover:border-muted hover:text-muted'
          }`}
        >
          <span className={`text-2xl leading-none ${selectedGender ? '' : 'text-faint'}`}>
            {selectedGender ? selectedGender.symbol : '?'}
          </span>
          <span className="text-[9px] text-faint">Geschlecht</span>
        </button>

        {/* Age / Height / Weight */}
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

      {/* ── Beruf ── */}
      <div className="rounded-lg border border-hairline overflow-hidden">
        <div className="px-3 py-1.5 bg-raised/60 border-b border-hairline">
          <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Beruf</span>
        </div>
        <div className="p-3 space-y-2">
          {/* Berufsbezeichnung */}
          <input
            type="text"
            value={char.info.professionName}
            onChange={e => patchInfo('professionName', e.target.value)}
            placeholder="Berufsbezeichnung"
            className="w-full bg-raised border border-hairline rounded-lg px-3 py-2.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted transition-colors"
          />

          {/* Berufskategorie — full info card if set, placeholder otherwise */}
          {selectedProf ? (
            <button
              onClick={() => setProfCatOverlay(true)}
              className="w-full text-left p-3 rounded-lg border transition-all hover:opacity-90"
              style={{ backgroundColor: (profColor ?? '#888') + '18', borderColor: (profColor ?? '#888') + '80' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">{PROF_ICONS[selectedProf.key]}</span>
                <span className="text-sm font-medium text-primary">{selectedProf.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                {Object.entries(selectedProf.talentPts).map(([cat, pts]) => {
                  const c = cat as TalentCategory;
                  return (
                    <span key={c} className="text-[10px] font-mono font-medium" style={{ color: CAT_COLOR[c] }}>
                      +{pts} {CAT_SHORT[c]}
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedProf.attrMin).map(([attr, val]) => {
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
          ) : (
            <button
              onClick={() => setProfCatOverlay(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-hairline text-faint text-sm hover:border-muted hover:text-muted transition-colors"
            >
              — Berufskategorie wählen —
            </button>
          )}

          <div className="border-t border-hairline" />

          <TalentDisplayTile
            talentName={char.professionTalent}
            bonus={5}
            placeholder="Talent wählen (+5 TP)"
            onClick={() => setTalentOverlay(true)}
          />
          <SpecDisplayTile
            spec={char.specProfession}
            placeholder="neg. Spezifikum wählen"
            onClick={() => setSpecOverlay(true)}
          />
        </div>
      </div>

      {/* ── Hobbies ── */}
      {!showHobby1 ? (
        <HobbyPlaceholder label="1. Hobby hinzufügen (+5 TP)" onClick={() => setH1Open(true)} />
      ) : (
        <>
          {/* Hobby 1 card */}
          <div className="rounded-lg border border-hairline overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-raised/60 border-b border-hairline">
              <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Hobby 1</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-paper/40">+5 TP</span>
                <button
                  onClick={() => { patch(charId, c => { c.hobby1Name = ''; c.hobby1Talent = null; c.specHobby1 = null; }); setH1Open(false); }}
                  className="text-faint hover:text-muted text-sm leading-none"
                  title="Hobby 1 entfernen"
                >✕</button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <input
                type="text"
                value={char.hobby1Name}
                onChange={e => patch(charId, c => { c.hobby1Name = e.target.value; })}
                placeholder="Hobby-Name"
                className="w-full bg-raised border border-hairline rounded-lg px-3 py-2 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
              />
              <TalentDisplayTile
                talentName={char.hobby1Talent}
                bonus={5}
                placeholder="Talent wählen (+5 TP)"
                onClick={() => setH1TalentOverlay(true)}
              />
              {char.hobby1Talent && (
                <SpecDisplayTile
                  spec={char.specHobby1}
                  placeholder="neg. Spezifikum wählen"
                  modifierIgnored
                  onClick={() => setH1SpecOverlay(true)}
                />
              )}
            </div>
          </div>

          {/* Hobby 2 placeholder or card */}
          {!showHobby2 ? (
            <HobbyPlaceholder label="2. Hobby hinzufügen (+3 TP)" onClick={() => setH2Open(true)} />
          ) : (
            <div className="rounded-lg border border-hairline overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-raised/60 border-b border-hairline">
                <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Hobby 2</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-paper/40">+3 TP</span>
                  <button
                    onClick={() => { patch(charId, c => { c.hobby2Name = ''; c.hobby2Talent = null; }); setH2Open(false); }}
                    className="text-faint hover:text-muted text-sm leading-none"
                    title="Hobby 2 entfernen"
                  >✕</button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={char.hobby2Name}
                  onChange={e => patch(charId, c => { c.hobby2Name = e.target.value; })}
                  placeholder="Hobby-Name"
                  className="w-full bg-raised border border-hairline rounded-lg px-3 py-2 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
                />
                <TalentDisplayTile
                  talentName={char.hobby2Talent}
                  bonus={3}
                  placeholder="Talent wählen (+3 TP)"
                  onClick={() => setH2TalentOverlay(true)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Freie Spezifika ── */}
      <SpecDisplayTile
        spec={char.specFreeNegative}
        placeholder="neg. Spezifikum wählen"
        onClick={() => setFreeNegOverlay(true)}
      />
      <SpecDisplayTile
        spec={char.specFreePositive}
        placeholder="pos. Spezifikum wählen"
        onClick={() => setFreePosOverlay(true)}
      />

      {/* ── Overlays ── */}
      {genderOverlay && (
        <GenderOverlay
          value={char.info.gender}
          onSelect={key => patchInfo('gender', key)}
          onClose={() => setGenderOverlay(false)}
        />
      )}
      {profCatOverlay && (
        <ProfCatOverlay
          value={char.profession}
          onSelect={key => selectProfession(key)}
          onClose={() => setProfCatOverlay(false)}
        />
      )}
      {specOverlay && (
        <SpecOverlay
          value={char.specProfession}
          customSpecs={char.customSpecifications}
          onSelect={spec => saveSpec(patch, charId, 'specProfession', spec)}
          onClose={() => setSpecOverlay(false)}
        />
      )}
      {talentOverlay && (
        <TalentOverlay
          title="Berufsnahes Talent wählen"
          value={char.professionTalent}
          customTalents={char.customTalents}
          onSelect={name => patch(charId, c => { c.professionTalent = name; })}
          onClose={() => setTalentOverlay(false)}
        />
      )}
      {h1TalentOverlay && (
        <TalentOverlay
          title="Hobby 1 — Talent wählen"
          value={char.hobby1Talent}
          customTalents={char.customTalents}
          onSelect={name => patch(charId, c => {
            c.hobby1Talent = name;
            if (!name) {
              c.specHobby1 = null;
            } else {
              const newCat = TALENT_CATEGORY_OF[name] ?? c.customTalents.find(t => t.name === name)?.category;
              if (c.specHobby1 && c.specHobby1.category !== newCat) {
                c.specHobby1 = null;
              }
            }
          })}
          onClose={() => setH1TalentOverlay(false)}
        />
      )}
      {h1SpecOverlay && (
        <SpecOverlay
          value={char.specHobby1}
          customSpecs={char.customSpecifications}
          filterCategory={hobby1Category}
          onSelect={spec => saveSpec(patch, charId, 'specHobby1', spec)}
          onClose={() => setH1SpecOverlay(false)}
        />
      )}
      {h2TalentOverlay && (
        <TalentOverlay
          title="Hobby 2 — Talent wählen"
          value={char.hobby2Talent}
          customTalents={char.customTalents}
          onSelect={name => patch(charId, c => { c.hobby2Talent = name; })}
          onClose={() => setH2TalentOverlay(false)}
        />
      )}
      {freeNegOverlay && (
        <SpecOverlay
          value={char.specFreeNegative}
          customSpecs={char.customSpecifications}
          specType="negative"
          excludeNames={[char.specProfession?.name, char.specHobby1?.name, char.specFreePositive?.name].filter(Boolean) as string[]}
          onSelect={spec => patch(charId, c => { c.specFreeNegative = spec; })}
          onClose={() => setFreeNegOverlay(false)}
        />
      )}
      {freePosOverlay && (
        <SpecOverlay
          value={char.specFreePositive}
          customSpecs={char.customSpecifications}
          specType="positive"
          excludeNames={[char.specFreeNegative?.name].filter(Boolean) as string[]}
          onSelect={spec => patch(charId, c => { c.specFreePositive = spec; })}
          onClose={() => setFreePosOverlay(false)}
        />
      )}
    </div>
  );
}
