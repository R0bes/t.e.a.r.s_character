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
      <label className="text-xs text-muted font-medium uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-raised border border-hairline rounded px-3 py-2 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted transition-colors"
      />
    </div>
  );
}

export function Tab1Info({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;

  type InfoKey = 'name' | 'gender' | 'age' | 'height' | 'professionName';
  function patch(key: InfoKey, value: string) {
    patchCharacter(charId, c => { c.info[key] = value; });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg text-paper">Charakterinformationen</h2>
        <p className="text-xs text-muted">Grundlegende Angaben zu deinem Charakter.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name" value={char.info.name} onChange={v => patch('name', v)} placeholder="Vollständiger Name" />
        </div>
        <Field label="Geschlecht" value={char.info.gender} onChange={v => patch('gender', v)} placeholder="z.B. männlich" />
        <Field label="Alter" value={char.info.age} onChange={v => patch('age', v)} placeholder="z.B. 32" />
        <Field label="Größe (cm)" value={char.info.height} onChange={v => patch('height', v)} placeholder="z.B. 178" />
        <div className="sm:col-span-2">
          <Field label="Beruf" value={char.info.professionName} onChange={v => patch('professionName', v)} placeholder="z.B. Elektriker" />
        </div>
      </div>
    </div>
  );
}
