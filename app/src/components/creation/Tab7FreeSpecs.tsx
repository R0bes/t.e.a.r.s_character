import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { SPECIFICATIONS, getSpecsByCategory } from '../../data/specifications';
import type { Specification, TalentCategory } from '../../types/character';

// Same category order and colors as Tab4Talents
const CAT_ORDER: TalentCategory[] = ['koerperlich', 'motorisch', 'geistig', 'sozial', 'kampf'];

const CAT_META: Record<TalentCategory, { label: string; color: string }> = {
  koerperlich: { label: 'Körperliche Spezifika',    color: '#D1453B' },
  motorisch:   { label: 'Motorische Spezifika',     color: '#3E7FCE' },
  geistig:     { label: 'Geistige Spezifika',        color: '#8C5FC4' },
  sozial:      { label: 'Soziale Spezifika',         color: '#D6B23E' },
  kampf:       { label: 'Kampf- / Waffen Spezifika', color: '#7A2420' },
};

// ── Custom spec form ──────────────────────────────────────────────────────────
function CustomSpecForm({ category, charId, onClose }: {
  category: TalentCategory; charId: string; onClose: () => void;
}) {
  const patch = useStore(s => s.patchCharacter);
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const [name, setName]         = useState('');
  const [modifier, setModifier] = useState(5);
  const [description, setDesc]  = useState('');

  const exists = !!(
    char?.customSpecifications.find(s => s.name === name.trim()) ||
    SPECIFICATIONS.find(s => s.name === name.trim())
  );

  function save() {
    if (!name.trim() || exists) return;
    const spec: Specification = { name: name.trim(), modifier, description, category };
    patch(charId, c => {
      c.customSpecifications.push(spec);
      if (modifier < 0 && !c.specFreePositive) c.specFreePositive = spec;
      else if (modifier > 0 && !c.specFreeNegative) c.specFreeNegative = spec;
    });
    onClose();
  }

  return (
    <div className="mt-1.5 bg-raised/40 rounded-lg p-3 space-y-2 border border-hairline/60">
      <p className="text-[10px] text-warn font-medium">Neues Spezifikum (SL-Absprache)</p>
      <input
        type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Name des Spezifikums"
        className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none"
      />
      <div className="flex gap-2 items-center">
        <label className="text-[10px] text-faint shrink-0">Modifier:</label>
        <input
          type="number" value={modifier}
          onChange={e => setModifier(Number(e.target.value))}
          className="flex-1 bg-bg border border-hairline rounded px-2 py-1 text-primary text-sm font-mono focus:outline-none"
        />
        <span className={`text-[10px] shrink-0 ${modifier > 0 ? 'text-danger' : 'text-success'}`}>
          {modifier > 0 ? 'Malus' : 'Bonus'}
        </span>
      </div>
      <input
        type="text" value={description} onChange={e => setDesc(e.target.value)}
        placeholder="Beschreibung (optional)"
        className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none"
      />
      {exists && <p className="text-xs text-danger">Name bereits vergeben.</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-1.5 border border-hairline rounded text-xs text-muted">
          Abbrechen
        </button>
        <button onClick={save} disabled={!name.trim() || exists}
          className="flex-1 py-1.5 bg-paper text-bg rounded text-xs font-medium disabled:opacity-40">
          Hinzufügen
        </button>
      </div>
    </div>
  );
}

// ── Spec tile (1-per-row, full width) ────────────────────────────────────────
function SpecTile({ spec, isSelected, reservedAs, onToggle, catColor }: {
  spec: Specification;
  isSelected: boolean;
  reservedAs: 'beruf' | 'hobby' | null;
  onToggle: () => void;
  catColor: string;
}) {
  const isMalus  = spec.modifier > 0;
  const modColor = isMalus ? '#E83050' : '#4FA968';

  const tileBg     = isSelected ? `${catColor}20` : `${catColor}0C`;
  const tileBorder = isSelected ? `${catColor}60` : reservedAs ? '#2D303A44' : `${catColor}28`;

  return (
    <button
      onClick={onToggle}
      disabled={!!reservedAs}
      className={`text-left w-full p-2.5 rounded-lg border transition-all ${
        reservedAs ? 'opacity-45 cursor-default' : 'hover:opacity-90'
      }`}
      style={{ backgroundColor: tileBg, borderColor: tileBorder }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold leading-tight" style={{ color: catColor }}>
          {spec.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-mono font-bold" style={{ color: modColor }}>
            {isMalus ? '+' : ''}{spec.modifier}
          </span>
          {isSelected && <span className="text-[9px] text-paper font-bold">✓</span>}
          {reservedAs && <span className="text-[8px] font-mono text-faint capitalize">{reservedAs}</span>}
        </div>
      </div>
      <p className="text-[9px] text-faint leading-snug">{spec.description}</p>
    </button>
  );
}

// ── Add-spec tile (full width) ────────────────────────────────────────────────
function AddSpecTile({ onClick, catColor }: { onClick: () => void; catColor: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed text-faint hover:text-muted transition-colors"
      style={{ borderColor: `${catColor}40` }}
    >
      <span className="text-sm leading-none">+</span>
      <span className="text-xs">Neues Spezifikum</span>
    </button>
  );
}

// ── Category section (accordion, matches Talent view) ─────────────────────────
function SpecCategory({ catKey, charId, isOpen, onOpen }: {
  catKey: TalentCategory; charId: string; isOpen: boolean; onOpen: () => void;
}) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);
  const [showForm, setShowForm] = useState(false);

  if (!char) return null;

  const meta         = CAT_META[catKey];
  const builtinSpecs = getSpecsByCategory(catKey) as Specification[];
  const customSpecs  = char.customSpecifications.filter(s => s.category === catKey);
  const allSpecs     = [...builtinSpecs, ...customSpecs];

  function isSelected(name: string) {
    return char!.specFreePositive?.name === name || char!.specFreeNegative?.name === name;
  }

  function reservedAs(name: string): 'beruf' | 'hobby' | null {
    if (char!.specProfession?.name === name) return 'beruf';
    if (char!.specHobby1?.name === name) return 'hobby';
    return null;
  }

  function toggleSpec(spec: Specification) {
    const isMalus = spec.modifier > 0;
    patch(charId, c => {
      if (isMalus) {
        c.specFreeNegative = c.specFreeNegative?.name === spec.name ? null : spec;
      } else {
        c.specFreePositive = c.specFreePositive?.name === spec.name ? null : spec;
      }
    });
  }

  return (
    <div className="rounded-lg overflow-hidden border border-hairline">
      {/* Header — same pattern as Talent accordion */}
      <button
        onClick={onOpen}
        className="w-full px-3 py-2.5 flex items-center gap-2 transition-colors hover:bg-white/5"
        style={{ backgroundColor: `${meta.color}18` }}
      >
        <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
        <span className="flex-1 text-xs font-bold tracking-wider uppercase text-left" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-faint text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Body — only when open */}
      {isOpen && (
        <div className="p-2 border-t border-hairline" style={{ backgroundColor: `${meta.color}06` }}>
          <div className="grid grid-cols-3 gap-1.5">
            {allSpecs.map(spec => (
              <SpecTile
                key={spec.name}
                spec={spec}
                isSelected={isSelected(spec.name)}
                reservedAs={reservedAs(spec.name)}
                onToggle={() => toggleSpec(spec)}
                catColor={meta.color}
              />
            ))}
            {!showForm && (
              <AddSpecTile onClick={() => setShowForm(true)} catColor={meta.color} />
            )}
          </div>

          {showForm && (
            <CustomSpecForm category={catKey} charId={charId} onClose={() => setShowForm(false)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab7FreeSpecs({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [openCat, setOpenCat] = useState<TalentCategory>(CAT_ORDER[0]);

  if (!char) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {CAT_ORDER.map(cat => (
        <SpecCategory
          key={cat}
          catKey={cat}
          charId={charId}
          isOpen={openCat === cat}
          onOpen={() => setOpenCat(cat)}
        />
      ))}
    </div>
  );
}
