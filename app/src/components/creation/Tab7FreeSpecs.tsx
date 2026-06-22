import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { SPECIFICATIONS } from '../../data/specifications';
import { TALENT_CATEGORIES, TALENT_CAT_MAP } from '../../data/talents';
import type { Specification, TalentCategory } from '../../types/character';
import { CatIcon } from '../ui/CatIcon';

// ── Custom spec form ──────────────────────────────────────────────────────────
function CustomSpecForm({ charId, onClose }: { charId: string; onClose: () => void }) {
  const patch = useStore(s => s.patchCharacter);
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const [name, setName]       = useState('');
  const [modifier, setMod]    = useState(5);
  const [description, setDesc]= useState('');
  const [category, setCat]    = useState<TalentCategory>('koerperlich');

  const exists = !!(
    char?.customSpecifications.find(s => s.name === name.trim()) ||
    SPECIFICATIONS.find(s => s.name === name.trim())
  );

  function save() {
    if (!name.trim() || exists) return;
    const spec: Specification = { name: name.trim(), modifier, description, category };
    patch(charId, c => {
      c.customSpecifications.push(spec);
      if (modifier < 0 && !c.specFreePositive)  c.specFreePositive  = spec;
      else if (modifier > 0 && !c.specFreeNegative) c.specFreeNegative = spec;
    });
    onClose();
  }

  return (
    <div className="bg-raised/40 rounded-lg p-3 space-y-2 border border-hairline/60">
      <p className="text-[10px] text-warn font-medium">Neues Spezifikum (SL-Absprache)</p>
      <input
        type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Name des Spezifikums"
        className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none"
      />
      {/* Category selector */}
      <div className="flex gap-1 flex-wrap">
        {TALENT_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCat(cat.key)}
            className="flex items-center gap-1 px-2 py-1 rounded border text-[10px] transition-colors"
            style={{
              borderColor:      category === cat.key ? cat.color + 'AA' : '#2D303A',
              backgroundColor:  category === cat.key ? cat.color + '20' : 'transparent',
              color:            category === cat.key ? cat.color : '#8C8F99',
            }}
          >
            <CatIcon src={cat.icon} size={14} />
            <span>{cat.label.replace(' Talente', '').replace(' & Waffen', '')}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-[10px] text-faint shrink-0">Modifier:</label>
        <input
          type="number" value={modifier}
          onChange={e => setMod(Number(e.target.value))}
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

// ── Single spec tile ──────────────────────────────────────────────────────────
function SpecTile({ spec, selectedAs, reservedAs, onToggle }: {
  spec: Specification;
  selectedAs: 'frei +' | 'frei −' | null;
  reservedAs: 'beruf' | 'hobby' | null;
  onToggle: () => void;
}) {
  const catMeta  = TALENT_CAT_MAP[spec.category];
  const color    = catMeta.color;
  const isMalus  = spec.modifier > 0;
  const modColor = isMalus ? '#E83050' : '#4FA968';

  const ribbonLabel = selectedAs
    ?? (reservedAs === 'beruf' ? 'Beruf' : reservedAs === 'hobby' ? '1. Hobby' : null);
  const isActive   = !!ribbonLabel; // highlighted when selected or reserved
  const isHobby    = reservedAs === 'hobby';
  const modIgnored = isHobby;

  return (
    <button
      onClick={onToggle}
      disabled={!!reservedAs}
      className={`relative text-left w-full p-2.5 rounded-lg border transition-all overflow-hidden ${
        reservedAs ? 'cursor-default' : 'hover:opacity-90'
      }`}
      style={{
        backgroundColor: isActive ? `${color}20` : `${color}0C`,
        borderColor:     isActive ? `${color}60` : `${color}28`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <CatIcon src={catMeta.icon} size={32} />
          <span className="text-[11px] font-semibold leading-tight truncate" style={{ color }}>
            {spec.name}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono font-bold shrink-0 ml-2 relative ${modIgnored ? 'line-through opacity-40' : ''}`}
          style={{ color: modColor }}
        >
          {isMalus ? '+' : ''}{spec.modifier}
          {modIgnored && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] not-italic no-underline opacity-70" style={{ textDecoration: 'none' }}>⊘</span>
          )}
        </span>
      </div>
      <p className="text-[9px] text-faint leading-snug pr-8">{spec.description}</p>
      {ribbonLabel && (
        <span
          className="absolute pointer-events-none"
          style={{
            bottom: 8, right: -22,
            width: 72, textAlign: 'center',
            fontSize: 7, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '2px 0',
            backgroundColor: `${color}50`,
            color,
            transform: 'rotate(-45deg)',
            transformOrigin: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {ribbonLabel}
        </span>
      )}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab7FreeSpecs({ charId }: { charId: string }) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);
  const [showForm, setShowForm] = useState(false);

  if (!char) return null;

  // All specs: predefined (in category order) + custom
  const allSpecs: Specification[] = [
    ...TALENT_CATEGORIES.flatMap(cat =>
      SPECIFICATIONS.filter(s => s.category === cat.key)
    ),
    ...char.customSpecifications,
  ];

  function selectedAs(name: string): 'frei +' | 'frei −' | null {
    if (char!.specFreePositive?.name === name)  return 'frei +';
    if (char!.specFreeNegative?.name === name)  return 'frei −';
    return null;
  }

  function reservedAs(name: string): 'beruf' | 'hobby' | null {
    if (char!.specProfession?.name === name) return 'beruf';
    if (char!.specHobby1?.name === name)     return 'hobby';
    return null;
  }

  function toggleSpec(spec: Specification) {
    const isMalus = spec.modifier > 0;
    const alreadySelected = !!selectedAs(spec.name);
    patch(charId, c => {
      if (isMalus) {
        c.specFreeNegative = alreadySelected ? null : spec;
      } else {
        c.specFreePositive = alreadySelected ? null : spec;
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 p-4">
      {allSpecs.map(spec => (
        <SpecTile
          key={spec.name}
          spec={spec}
          selectedAs={selectedAs(spec.name)}
          reservedAs={reservedAs(spec.name)}
          onToggle={() => toggleSpec(spec)}
        />
      ))}

      {/* Single add tile at the end */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors mt-1"
        >
          <span className="text-sm leading-none">+</span>
          <span className="text-xs">Neues Spezifikum</span>
        </button>
      ) : (
        <div className="mt-1">
          <CustomSpecForm charId={charId} onClose={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}
