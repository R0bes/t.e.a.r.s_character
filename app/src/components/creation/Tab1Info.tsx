import { useStore } from '../../store/useStore';

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}

function Field({ label, value, onChange, type = 'text', placeholder }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-muted font-medium uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-raised border border-hairline rounded px-2.5 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted transition-colors"
      />
    </div>
  );
}

const GENDERS = [
  { value: 'männlich', symbol: '♂' },
  { value: 'weiblich', symbol: '♀' },
  { value: 'divers',   symbol: '⚧' },
] as const;

export function Tab1Info({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  type InfoKey = 'name' | 'gender' | 'age' | 'height' | 'professionName';
  function patch(key: InfoKey, value: string) {
    patchCharacter(charId, c => { c.info[key] = value; });
  }

  const selectedGender = GENDERS.find(g => g.value === char.info.gender);

  return (
    <div className="flex flex-col gap-3 p-4">
      <Field label="Name" value={char.info.name} onChange={v => patch('name', v)} placeholder="Vollständiger Name" />

      {/* Gender tiles */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-muted font-medium uppercase tracking-wider">Geschlecht</label>
        <div className="flex gap-2">
          {GENDERS.map(g => {
            const active = char.info.gender === g.value;
            return (
              <button
                key={g.value}
                onClick={() => patch('gender', g.value)}
                className="flex-1 py-2 rounded border text-2xl leading-none transition-colors"
                style={{
                  borderColor:     active ? '#8C8F99' : '#2D303A',
                  backgroundColor: active ? '#8C8F9918' : 'transparent',
                  color: active ? '#ECE8DE' : '#5A5D66',
                }}
              >
                {g.symbol}
              </button>
            );
          })}
          {/* Custom text input if not one of the presets */}
          {!selectedGender && char.info.gender && (
            <span className="flex-1 py-2 px-2 rounded border border-paper/40 bg-paper/10 text-xs text-paper text-center leading-normal self-center">
              {char.info.gender}
            </span>
          )}
        </div>
        {/* Free text for custom gender */}
        <input
          value={selectedGender ? '' : char.info.gender}
          onChange={e => patch('gender', e.target.value)}
          placeholder="Oder eigene Eingabe…"
          className="bg-raised border border-hairline rounded px-2.5 py-1 text-primary text-xs placeholder:text-faint focus:outline-none focus:border-muted transition-colors mt-0.5"
        />
      </div>

      {/* Age + Height in a row */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Alter" value={char.info.age} onChange={v => patch('age', v)} placeholder="z.B. 32" />
        <Field label="Größe (cm)" value={char.info.height} onChange={v => patch('height', v)} placeholder="z.B. 178" />
      </div>

      <Field label="Beruf" value={char.info.professionName} onChange={v => patch('professionName', v)} placeholder="z.B. Elektriker" />
    </div>
  );
}
