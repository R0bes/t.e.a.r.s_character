import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { PROFESSIONS } from '../../data/professions';
import { ATTR_MAP } from '../../data/attributes';
import { TALENT_CATEGORIES, TALENT_CATEGORY_OF, TALENT_CAT_MAP } from '../../data/talents';
import { SPECIFICATIONS, isNegativeSpec, isPositiveSpec } from '../../data/specifications';
import type { Character, ProfessionKey, Specification, TalentCategory } from '../../types/character';
import { CatIcon } from '../ui/CatIcon';

const CAT_COLOR: Record<TalentCategory, string> = {
  koerperlich: '#E07040',
  motorisch:   '#28B4C0',
  geistig:     '#7C56D0',
  sozial:      '#3CB870',
  kampf:       '#C83030',
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
  { key: 'männlich',    label: 'Männlich',    icon: '/icons/attr/id_maennlich.png' },
  { key: 'weiblich',    label: 'Weiblich',    icon: '/icons/attr/id_weiblich.png' },
  { key: 'divers',      label: 'Divers',      icon: '/icons/attr/id_divers.png' },
  { key: 'nonbinär',   label: 'Nonbinär',    icon: '/icons/attr/id_nonbinaer.png' },
  { key: 'agender',     label: 'Agender',     icon: '/icons/attr/id_agender.png' },
  { key: 'genderfluid', label: 'Genderfluid', icon: '/icons/attr/id_genderfluid.png' },
  { key: 'asexuell',    label: 'Asexuell',    icon: '/icons/attr/id_asexuell.png' },
  { key: 'unbekannt',   label: 'Unbekannt',   icon: '/icons/attr/id_unknown.png' },
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
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="grid grid-cols-4 gap-3">
            {GENDER_OPTIONS.map(g => {
              const selected = value === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => { onSelect(g.key); onClose(); }}
                  className="aspect-square flex items-center justify-center rounded-lg border transition-all hover:opacity-90"
                  style={{
                    backgroundColor: selected ? '#B8B8C028' : '#B8B8C00A',
                    borderColor:     selected ? '#B8B8C090' : '#2D303A',
                    boxShadow:       selected ? 'inset 0 0 0 1px #B8B8C040' : 'none',
                  }}
                >
                  <CatIcon src={g.icon} size={56} className="shrink-0" />
                </button>
              );
            })}
          </div>
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
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-paper/70">Berufskategorie wählen</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-1 gap-2">
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
                  <div className="flex items-start gap-3">
                    <CatIcon src={prof.icon} size={90} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-semibold leading-tight block mb-1.5" style={{ color }}>{prof.label}</span>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {Object.entries(prof.talentPts).map(([cat, pts]) => {
                          const c = cat as TalentCategory;
                          const catMeta = TALENT_CAT_MAP[c];
                          return (
                            <span key={c} className="flex items-center gap-1">
                              <CatIcon src={catMeta.icon} size={28} />
                              <span className="text-[10px] font-mono font-medium" style={{ color: CAT_COLOR[c] }}>+{pts}</span>
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(prof.attrMin).map(([attr, val]) => {
                          const meta = ATTR_MAP[attr as keyof typeof ATTR_MAP];
                          return (
                            <span key={attr} className="flex items-center gap-0.5 px-1 rounded" style={{ backgroundColor: `${meta?.color}22` }}>
                              <CatIcon src={meta?.icon ?? ''} size={24} />
                              <span className="text-[9px] font-mono" style={{ color: meta?.color }}>{val}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
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
                    className="relative w-full text-left p-3 pb-10 rounded-lg border transition-all hover:opacity-90 overflow-hidden flex flex-col gap-2"
                    style={{
                      backgroundColor: selected ? `${cat.color}20` : `${cat.color}0A`,
                      borderColor:     selected ? `${cat.color}70` : `${cat.color}28`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <CatIcon src={cat.icon} size={26} className="shrink-0" />
                      <span className="text-base font-semibold leading-tight" style={{ color: cat.color }}>
                        {spec.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-faint leading-snug">{spec.description}</p>
                    <span className={`absolute bottom-2.5 right-3 text-2xl font-mono font-bold ${modColor}`}>
                      {modStr}
                    </span>
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
  title, value, char, onSelect, onClose,
}: {
  title: string;
  value: string | null;
  char: Character;
  onSelect: (name: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col h-full max-w-2xl mx-auto w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-paper/70">{title}</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-hairline text-faint hover:text-primary transition-colors text-sm">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {value && (
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-hairline text-faint text-xs hover:border-muted hover:text-muted transition-colors mb-3"
            >
              — kein Talent —
            </button>
          )}
          <div className="grid grid-cols-4 gap-1.5">
            {TALENT_CATEGORIES.map(cat =>
              [...cat.talents, ...char.customTalents.filter(t => t.category === cat.key)].map(t => {
                const selected  = value === t.name;
                const currentTp = char.talents[t.name] ?? 0;
                return (
                  <button
                    key={t.name}
                    onClick={() => { onSelect(t.name); onClose(); }}
                    className="relative text-left p-2 pb-7 rounded-lg border transition-all hover:opacity-90 overflow-hidden flex flex-col gap-1.5"
                    style={{
                      backgroundColor: selected ? `${cat.color}20` : `${cat.color}0A`,
                      borderColor:     selected ? `${cat.color}70` : `${cat.color}28`,
                      minHeight: '72px',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <CatIcon src={cat.icon} size={20} className="shrink-0" />
                      <span
                        className="text-[11px] font-semibold leading-tight"
                        style={{
                          color: cat.color,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                    {t.attrs && (
                      <div className="flex gap-0.5">
                        {t.attrs.map((a, i) => (
                          <CatIcon key={i} src={ATTR_MAP[a].icon} size={16} />
                        ))}
                      </div>
                    )}
                    {currentTp > 0 && (
                      <span
                        className="absolute bottom-1.5 right-2 text-lg font-mono font-bold"
                        style={{ color: cat.color }}
                      >
                        {currentTp}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
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
        className="w-full text-center px-3 py-2.5 rounded-lg border border-dashed border-hairline text-faint text-sm hover:border-muted hover:text-muted transition-colors"
      >
        {placeholder}
      </button>
    );
  }
  const catMeta  = TALENT_CAT_MAP[spec.category];
  const color    = catMeta.color;
  const modColor = spec.modifier < 0 ? '#E83050' : '#4FA968';
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left p-3 pb-10 rounded-lg border transition-all hover:opacity-90 overflow-hidden flex flex-col gap-2"
      style={{ backgroundColor: `${color}20`, borderColor: `${color}60` }}
    >
      <div className="flex items-center gap-2">
        <CatIcon src={catMeta.icon} size={26} className="shrink-0" />
        <span className="text-base font-semibold leading-tight" style={{ color }}>{spec.name}</span>
      </div>
      <p className="text-[11px] text-faint leading-snug">{spec.description}</p>
      <span className="absolute bottom-2.5 right-3 flex items-center justify-center">
        <span className="text-2xl font-mono font-bold" style={{ color: modColor }}>
          {spec.modifier > 0 ? '+' : ''}{spec.modifier}
        </span>
        {modifierIgnored && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="44" stroke="#E83050" strokeWidth="10"/>
            <line x1="18" y1="82" x2="82" y2="18" stroke="#E83050" strokeWidth="10" strokeLinecap="round"/>
          </svg>
        )}
      </span>
    </button>
  );
}

// ── Talent display tile ───────────────────────────────────────────────────────
function qualityRibbon(effective: number): { label: string; color: string } | null {
  if (effective === 0)  return null;
  if (effective <= 4)   return { label: 'Anfänger', color: '#E08C3C' };
  if (effective <= 9)   return { label: 'Geübt',    color: '#8C8F99' };
  return                       { label: 'Profi',    color: '#4FA968' };
}

function TalentDisplayTile({ talentName, bonus, placeholder, label, onClick }: {
  talentName: string | null;
  bonus: number;
  placeholder: string;
  label?: string;
  onClick: () => void;
}) {
  if (!talentName) {
    return (
      <button
        onClick={onClick}
        className="w-full text-center px-3 py-2.5 rounded-lg border border-dashed border-hairline text-faint text-sm hover:border-muted hover:text-muted transition-colors"
      >
        {placeholder}
      </button>
    );
  }
  const catKey  = TALENT_CATEGORY_OF[talentName];
  const catMeta = catKey ? TALENT_CAT_MAP[catKey] : null;
  const color   = catMeta?.color ?? '#8C8F99';
  const qual    = qualityRibbon(bonus);
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left p-3 pb-10 rounded-lg border transition-all hover:opacity-90 overflow-hidden flex flex-col gap-2"
      style={{ backgroundColor: `${color}20`, borderColor: `${color}60` }}
    >
      <div className="flex items-center gap-2">
        {catMeta && <CatIcon src={catMeta.icon} size={26} className="shrink-0" />}
        <span className="text-base font-semibold leading-tight" style={{ color }}>{talentName}</span>
      </div>
      {qual && (
        <span
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide pointer-events-none"
          style={{ backgroundColor: `${qual.color}30`, color: qual.color }}
        >{qual.label}</span>
      )}
      <span className="absolute bottom-2.5 right-3 text-2xl font-mono font-bold" style={{ color }}>+{bonus}</span>
      {label && (
        <span className="absolute pointer-events-none"
          style={{
            bottom: 8, left: -22, width: 80, textAlign: 'center',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 0', backgroundColor: `${color}CC`, color: '#fff',
            transform: 'rotate(45deg)', transformOrigin: 'center', whiteSpace: 'nowrap',
          }}
        >{label}</span>
      )}
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
          {selectedGender
            ? <CatIcon src={selectedGender.icon} size={36} />
            : <span className="text-2xl leading-none text-faint">?</span>
          }
          <span className="text-[9px] text-faint">Geschlecht</span>
        </button>

        {/* Age / Height / Weight */}
        {[
          { key: 'age',    icon: '/icons/attr/info_age.png',    placeholder: 'Alter',   suffix: 'Jahre' },
          { key: 'height', icon: '/icons/attr/info_height.png', placeholder: 'Größe',   suffix: 'cm'    },
          { key: 'weight', icon: '/icons/attr/info_weight.png', placeholder: 'Gewicht', suffix: 'kg'    },
        ].map(f => (
          <div key={f.key} className="bg-raised border border-hairline rounded-lg p-2 flex flex-col items-center gap-1">
            <CatIcon src={f.icon} size={32} />
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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-raised/60 border-b border-hairline">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted shrink-0">Beruf</span>
          <span className="w-px h-3.5 bg-hairline shrink-0" />
          <input
            type="text"
            value={char.info.professionName}
            onChange={e => patchInfo('professionName', e.target.value)}
            placeholder="Berufsbezeichnung"
            className="flex-1 bg-transparent text-primary text-sm placeholder:text-faint focus:outline-none"
          />
        </div>
        <div className="p-3 space-y-2">

          {/* Berufskategorie — full info card if set, placeholder otherwise */}
          {selectedProf ? (
            <button
              onClick={() => setProfCatOverlay(true)}
              className="w-full text-left p-3 rounded-lg border transition-colors hover:opacity-90"
              style={{ borderColor: (profColor ?? '#888') + 'CC', backgroundColor: (profColor ?? '#888') + '18' }}
            >
              {/* Icon + singular label */}
              <div className="flex items-center gap-3 mb-2.5">
                <CatIcon src={selectedProf.icon} size={56} className="shrink-0" />
                <span className="text-sm font-semibold leading-snug" style={{ color: profColor }}>
                  {selectedProf.labelSingular}
                </span>
              </div>

              {/* Talent point chips */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedProf.talentPts).map(([cat, pts]) => {
                  const c = cat as TalentCategory;
                  const catMeta = TALENT_CAT_MAP[c];
                  return (
                    <span key={c} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: `${CAT_COLOR[c]}22` }}>
                      <CatIcon src={catMeta.icon} size={18} />
                      <span className="text-[10px] font-mono font-bold" style={{ color: CAT_COLOR[c] }}>+{pts}</span>
                    </span>
                  );
                })}
              </div>

              <div className="border-t border-hairline/40 my-2" />

              {/* Attribute minimum chips */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedProf.attrMin).map(([attr, val]) => {
                  const meta = ATTR_MAP[attr as keyof typeof ATTR_MAP];
                  return (
                    <span key={attr} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: `${meta?.color}18` }}>
                      <CatIcon src={meta?.icon ?? ''} size={16} />
                      <span className="text-[9px] font-mono font-medium" style={{ color: meta?.color }}>{attr} {val}</span>
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

          <div className="flex flex-col gap-2">
            <TalentDisplayTile
              talentName={char.professionTalent}
              bonus={5}
              label="Beruf"
              placeholder="Talent (+5 TP)"
              onClick={() => setTalentOverlay(true)}
            />
            <SpecDisplayTile
              spec={char.specProfession}
              placeholder="neg. Spezifikum"
              onClick={() => setSpecOverlay(true)}
            />
          </div>
        </div>
      </div>

      {/* ── Hobbies ── */}
      {!showHobby1 ? (
        <HobbyPlaceholder label="1. Hobby hinzufügen (+5 TP)" onClick={() => setH1Open(true)} />
      ) : (
        <>
          {/* Hobby 1 card */}
          <div className="rounded-lg border border-hairline overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-raised/60 border-b border-hairline">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted shrink-0">1. Hobby</span>
              <span className="w-px h-3.5 bg-hairline shrink-0" />
              <input
                type="text"
                value={char.hobby1Name}
                onChange={e => patch(charId, c => { c.hobby1Name = e.target.value; })}
                placeholder="Bezeichnung"
                className="flex-1 bg-transparent text-primary text-sm placeholder:text-faint focus:outline-none"
              />
              <button
                onClick={() => {
                  patch(charId, c => {
                    if (c.hobby2Name || c.hobby2Talent) {
                      c.hobby1Name   = c.hobby2Name;
                      c.hobby1Talent = c.hobby2Talent;
                      c.specHobby1   = null;
                      c.hobby2Name   = '';
                      c.hobby2Talent = null;
                    } else {
                      c.hobby1Name   = '';
                      c.hobby1Talent = null;
                      c.specHobby1   = null;
                    }
                  });
                  setH2Open(false);
                  if (!char.hobby2Name && !char.hobby2Talent) setH1Open(false);
                }}
                className="text-faint hover:text-muted text-sm leading-none shrink-0"
                title="1. Hobby entfernen"
              >✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex flex-col gap-2">
                <TalentDisplayTile
                  talentName={char.hobby1Talent}
                  bonus={5}
                  label="1. Hobby"
                  placeholder="Talent (+5 TP)"
                  onClick={() => setH1TalentOverlay(true)}
                />
              </div>
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
              <div className="flex items-center gap-2 px-3 py-1.5 bg-raised/60 border-b border-hairline">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted shrink-0">2. Hobby</span>
                <span className="w-px h-3.5 bg-hairline shrink-0" />
                <input
                  type="text"
                  value={char.hobby2Name}
                  onChange={e => patch(charId, c => { c.hobby2Name = e.target.value; })}
                  placeholder="Bezeichnung"
                  className="flex-1 bg-transparent text-primary text-sm placeholder:text-faint focus:outline-none"
                />
                <button
                  onClick={() => { patch(charId, c => { c.hobby2Name = ''; c.hobby2Talent = null; }); setH2Open(false); }}
                  className="text-faint hover:text-muted text-sm leading-none shrink-0"
                  title="2. Hobby entfernen"
                >✕</button>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex flex-col gap-2">
                  <TalentDisplayTile
                    talentName={char.hobby2Talent}
                    bonus={3}
                    label="2. Hobby"
                    placeholder="Talent (+3 TP)"
                    onClick={() => setH2TalentOverlay(true)}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Freie Spezifika ── */}
      <div className="rounded-lg border border-hairline overflow-hidden">
        <div className="px-3 py-1.5 bg-raised/60 border-b border-hairline">
          <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Freie Spezifika</span>
        </div>
        <div className="p-3 space-y-2">
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
        </div>
      </div>

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
          excludeNames={[char.specHobby1?.name, char.specFreeNegative?.name].filter(Boolean) as string[]}
          onSelect={spec => saveSpec(patch, charId, 'specProfession', spec)}
          onClose={() => setSpecOverlay(false)}
        />
      )}
      {talentOverlay && (
        <TalentOverlay
          title="Berufsnahes Talent wählen"
          value={char.professionTalent}
          char={safeChar}
          onSelect={name => patch(charId, c => { c.professionTalent = name; })}
          onClose={() => setTalentOverlay(false)}
        />
      )}
      {h1TalentOverlay && (
        <TalentOverlay
          title="Hobby 1 — Talent wählen"
          value={char.hobby1Talent}
          char={safeChar}
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
          excludeNames={[char.specProfession?.name, char.specFreeNegative?.name].filter(Boolean) as string[]}
          onSelect={spec => saveSpec(patch, charId, 'specHobby1', spec)}
          onClose={() => setH1SpecOverlay(false)}
        />
      )}
      {h2TalentOverlay && (
        <TalentOverlay
          title="Hobby 2 — Talent wählen"
          value={char.hobby2Talent}
          char={safeChar}
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
