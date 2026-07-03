import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { SPECIFICATIONS } from '../../data/specifications';
import { TALENT_CATEGORIES, TALENT_CAT_MAP } from '../../data/talents';
import type { Specification, TalentCategory } from '../../types/character';
import { CatIcon } from '../ui/CatIcon';

// ── Custom spec form ──────────────────────────────────────────────────────────
export function CustomSpecForm({ charId, onClose }: { charId: string; onClose: () => void }) {
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
      if (modifier >= 0 && !c.specFreePositive)  c.specFreePositive  = spec;
      else if (modifier < 0 && !c.specFreeNegative) c.specFreeNegative = spec;
    });
    onClose();
  }

  return (
    <div className="bg-raised/40 rounded-lg p-3 space-y-2 border border-hairline/60">
      <input
        type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Name des Spezifikums"
        className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none"
      />
      {/* Category selector — icons only */}
      <div className="flex gap-1.5">
        {TALENT_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCat(cat.key)}
            className="p-1.5 rounded border transition-colors"
            style={{
              borderColor:     category === cat.key ? cat.color + 'AA' : '#2D303A',
              backgroundColor: category === cat.key ? cat.color + '20' : 'transparent',
            }}
          >
            <CatIcon src={cat.icon} size={24} />
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-[10px] text-faint shrink-0">Wert:</label>
        <input
          type="number" value={modifier}
          onChange={e => setMod(Number(e.target.value))}
          className="flex-1 bg-bg border border-hairline rounded px-2 py-1 text-primary text-sm font-mono focus:outline-none"
        />
        <span className={`text-[10px] shrink-0 ${modifier >= 0 ? 'text-success' : 'text-danger'}`}>
          {modifier >= 0 ? 'Bonus' : 'Malus'}
        </span>
      </div>
      <input
        type="text" value={description} onChange={e => setDesc(e.target.value)}
        placeholder="Beschreibung"
        className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none"
      />
      {exists && <p className="text-xs text-danger">Name bereits vergeben.</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-1.5 border border-hairline rounded text-xs text-muted">
          Abbrechen
        </button>
        <button onClick={save} disabled={!name.trim() || !description.trim() || exists}
          className="flex-1 py-1.5 bg-paper text-bg rounded text-xs font-medium disabled:opacity-40">
          Hinzufügen
        </button>
      </div>
    </div>
  );
}

// ── Single spec tile ──────────────────────────────────────────────────────────
export function SpecTile({ spec, selectedAs, reservedAs, onToggle, showIcon = true, mode = 'edit' }: {
  spec: Specification;
  selectedAs: 'frei +' | 'frei −' | null;
  reservedAs: 'beruf' | 'hobby' | null;
  onToggle: () => void;
  showIcon?: boolean;
  mode?: 'edit' | 'fix';
}) {
  const catMeta  = TALENT_CAT_MAP[spec.category];
  const catColor = catMeta.color;

  // modifier < 0 = good for character (green), modifier > 0 = bad (red)
  const tileColor = spec.modifier < 0 ? '#4FA968' : '#E83050';

  const isActive = !!selectedAs || !!reservedAs;
  const isHobby    = reservedAs === 'hobby';
  const modIgnored = isHobby;

  return (
    <button
      onClick={onToggle}
      disabled={!!reservedAs || mode === 'fix'}
      draggable={mode === 'edit'}
      onDragStart={e => {
        if (mode !== 'edit') return;
        e.dataTransfer.setData('application/x-tears-spec', JSON.stringify(spec));
        e.dataTransfer.setData(spec.modifier > 0 ? 'application/x-tears-spec-pos' : 'application/x-tears-spec-neg', '1');
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`relative text-left w-full p-3 rounded-lg border transition-all overflow-hidden flex flex-col gap-2 ${
        reservedAs ? 'cursor-default' : 'hover:opacity-90'
      }`}
      style={{
        backgroundColor: isActive ? `${tileColor}20` : `${tileColor}0C`,
        borderColor:     isActive ? `${tileColor}60` : `${tileColor}28`,
      }}
    >
      {/* Header: icon + name + modifier on same line */}
      <div className="flex items-center gap-2">
        {showIcon && <CatIcon src={catMeta.icon} size={26} className="shrink-0" />}
        <span className="text-sm font-semibold leading-tight" style={{ color: catColor }}>
          {spec.name}
        </span>
        <span className="ml-auto relative font-mono font-bold text-xl leading-none shrink-0" style={{ color: catColor, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.25s ease' }}>
          {spec.modifier > 0 ? '+' : ''}{spec.modifier}
          {modIgnored && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="44" stroke="#E83050" strokeWidth="10"/>
              <line x1="18" y1="82" x2="82" y2="18" stroke="#E83050" strokeWidth="10" strokeLinecap="round"/>
            </svg>
          )}
        </span>
      </div>
      {/* Description */}
      <p className="text-[11px] text-faint leading-snug">{spec.description}</p>
    </button>
  );
}

// ── Category tab button ───────────────────────────────────────────────────────
function SpecCatTab({ cat, count, isActive, onClick }: {
  cat: { key: TalentCategory; color: string; icon: string };
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg border transition-colors"
      style={{
        borderColor:     isActive ? `${cat.color}90` : `${cat.color}30`,
        backgroundColor: isActive ? `${cat.color}20` : `${cat.color}08`,
        boxShadow:       isActive ? `inset 0 -2px 0 ${cat.color}` : 'none',
      }}
    >
      <CatIcon src={cat.icon} size={20} />
      <span className="text-[10px] font-mono font-bold leading-none" style={{ color: cat.color }}>
        {count}
      </span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab7FreeSpecs({ charId }: { charId: string }) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);
  const [selectedCat, setSelectedCat] = useState<TalentCategory>(TALENT_CATEGORIES[0].key);
  const [showForm, setShowForm]       = useState(false);

  if (!char) return null;

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

  const visibleSpecs: Specification[] = [
    ...SPECIFICATIONS.filter(s => s.category === selectedCat),
    ...char.customSpecifications.filter(s => s.category === selectedCat),
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 px-4 pt-4 pb-2 shrink-0">
        {TALENT_CATEGORIES.map(cat => {
          const count = [
            ...SPECIFICATIONS.filter(s => s.category === cat.key),
            ...char.customSpecifications.filter(s => s.category === cat.key),
          ].length;
          return (
            <SpecCatTab
              key={cat.key}
              cat={cat}
              count={count}
              isActive={selectedCat === cat.key}
              onClick={() => { setSelectedCat(cat.key); setShowForm(false); }}
            />
          );
        })}
      </div>

      {/* ── Spec tiles for selected category ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-2 gap-1.5 content-start">
        {visibleSpecs.map(spec => (
          <SpecTile
            key={spec.name}
            spec={spec}
            selectedAs={selectedAs(spec.name)}
            reservedAs={reservedAs(spec.name)}
            onToggle={() => toggleSpec(spec)}
          />
        ))}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="col-span-2 w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors mt-1"
          >
            <span className="text-sm leading-none">+</span>
            <span className="text-xs">Neues Spezifikum</span>
          </button>
        ) : (
          <div className="col-span-2 mt-1">
            <CustomSpecForm charId={charId} onClose={() => setShowForm(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
