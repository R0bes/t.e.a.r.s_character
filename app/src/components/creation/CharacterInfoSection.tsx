import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { CatIcon } from '../ui/CatIcon';

const GENDER_OPTIONS = [
  { key: 'männlich',    label: 'Männlich',    icon: '/icons/attr/id_maennlich.png' },
  { key: 'weiblich',   label: 'Weiblich',    icon: '/icons/attr/id_weiblich.png' },
  { key: 'divers',     label: 'Divers',      icon: '/icons/attr/id_divers.png' },
  { key: 'nonbinär',  label: 'Nonbinär',    icon: '/icons/attr/id_nonbinaer.png' },
  { key: 'agender',    label: 'Agender',     icon: '/icons/attr/id_agender.png' },
  { key: 'genderfluid',label: 'Genderfluid', icon: '/icons/attr/id_genderfluid.png' },
  { key: 'asexuell',   label: 'Asexuell',   icon: '/icons/attr/id_asexuell.png' },
  { key: 'unbekannt',  label: 'Unbekannt',  icon: '/icons/attr/id_unknown.png' },
];

function GenderOverlay({ value, onSelect, onClose, anchorRect }: {
  value: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  function handleClose() { setVisible(false); setTimeout(onClose, 140); }
  const cardStyle = anchorRect ? {
    position: 'fixed' as const,
    top: anchorRect.top, left: anchorRect.left,
    transformOrigin: 'top left',
    transform: visible ? 'scale(1)' : 'scale(0)',
    opacity: visible ? 1 : 0,
    transition: 'transform 140ms cubic-bezier(0.2,0,0,1), opacity 140ms ease',
  } : {};
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={handleClose} />
      <div className="fixed z-50 bg-surface border border-hairline rounded-xl shadow-2xl p-3" style={cardStyle} onClick={e => e.stopPropagation()}>
        <div className="grid grid-cols-4 gap-2">
          {GENDER_OPTIONS.map(g => {
            const selected = value === g.key;
            return (
              <button key={g.key} onClick={() => { onSelect(g.key); handleClose(); }}
                className="aspect-square flex items-center justify-center rounded-lg border transition-all hover:opacity-90"
                style={{ backgroundColor: selected ? '#B8B8C028' : '#B8B8C00A', borderColor: selected ? '#B8B8C090' : '#2D303A', boxShadow: selected ? 'inset 0 0 0 1px #B8B8C040' : 'none' }}>
                <CatIcon src={g.icon} size={57} className="shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CharacterInfoSection({ charId, mode }: { charId: string; mode: 'edit' | 'fix' }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  const genderBtnRef = useRef<HTMLButtonElement>(null);
  const [genderOverlay, setGenderOverlay] = useState(false);
  const [genderAnchor,  setGenderAnchor]  = useState<DOMRect | null>(null);

  if (!char) return null;

  const selectedGender = GENDER_OPTIONS.find(g => g.key === char.info.gender);
  const infoIncomplete = mode === 'fix' && (!char.info.name || !char.info.gender || !char.info.age || !char.info.height || !char.info.weight);

  function patchInfo(key: string, value: string) {
    patchCharacter(charId, c => { (c.info as Record<string, string>)[key] = value; });
  }

  return (
    <>
      <div
        className="shrink-0 w-48 rounded-lg border overflow-hidden flex flex-col"
        style={{
          borderColor: infoIncomplete ? '#E8305060' : '#FFFFFF0C',
          boxShadow:   infoIncomplete ? '0 0 8px #E8305030' : 'none',
        }}
      >
        {/* Name — full width */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-raised/60 border-b border-hairline shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted shrink-0">Name</span>
          <span className="w-px h-3 bg-hairline shrink-0" />
          <input
            type="text"
            value={char.info.name}
            onChange={e => patchInfo('name', e.target.value)}
            placeholder="Charaktername"
            className="flex-1 bg-transparent text-primary text-xs placeholder:text-faint focus:outline-none min-w-0"
          />
        </div>
        {/* Body: narrow fields left + image placeholder right */}
        <div className="p-2 flex gap-2 flex-1">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {([
              { key: 'age',    icon: '/icons/attr/info_age.png',    placeholder: 'Alter',   suffix: 'J'  },
              { key: 'height', icon: '/icons/attr/info_height.png', placeholder: 'Größe',   suffix: 'cm' },
              { key: 'weight', icon: '/icons/attr/info_weight.png', placeholder: 'Gewicht', suffix: 'kg' },
            ] as const).map(f => {
              const val = (char.info as Record<string, string>)[f.key] ?? '';
              return (
                <div key={f.key} className="flex items-center gap-1 px-1.5 py-0.5 bg-raised border border-hairline rounded">
                  <CatIcon src={f.icon} size={14} className="shrink-0" />
                  <input
                    type="text"
                    value={val}
                    onChange={e => patchInfo(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="flex-1 bg-transparent text-primary text-[11px] font-mono placeholder:text-faint focus:outline-none min-w-0 w-0"
                  />
                  {val && <span className="text-[9px] text-faint shrink-0">{f.suffix}</span>}
                </div>
              );
            })}
            <button
              ref={genderBtnRef}
              onClick={() => { setGenderAnchor(genderBtnRef.current?.getBoundingClientRect() ?? null); setGenderOverlay(true); }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                selectedGender ? 'bg-raised border-hairline hover:border-muted' : 'border-dashed border-hairline text-faint hover:border-muted hover:text-muted'
              }`}
            >
              {selectedGender
                ? <CatIcon src={selectedGender.icon} size={14} className="shrink-0" />
                : <span className="text-xs leading-none text-faint w-4 text-center">?</span>
              }
              <span className="text-[11px] text-primary truncate">
                {selectedGender ? selectedGender.label : 'Geschlecht'}
              </span>
            </button>
          </div>
          {/* Image placeholder */}
          <div className="w-14 shrink-0 rounded border border-dashed border-hairline flex items-center justify-center self-stretch">
            <span className="text-[8px] uppercase tracking-widest text-faint/40" style={{ writingMode: 'vertical-rl' }}>Bild</span>
          </div>
        </div>
      </div>

      {genderOverlay && (
        <GenderOverlay
          value={char.info.gender}
          onSelect={key => patchInfo('gender', key)}
          onClose={() => setGenderOverlay(false)}
          anchorRect={genderAnchor}
        />
      )}
    </>
  );
}
