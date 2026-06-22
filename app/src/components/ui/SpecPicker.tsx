import { useState } from 'react';
import { SPECIFICATIONS, CAT_LABEL, isNegativeSpec, isPositiveSpec } from '../../data/specifications';
import type { Specification, TalentCategory } from '../../types/character';
import { TALENT_CATEGORIES } from '../../data/talents';

interface SpecPickerProps {
  value: Specification | null;
  onChange: (spec: Specification | null) => void;
  filterCategory?: TalentCategory;        // if set, only show specs of this category
  polarity?: 'positive' | 'negative';     // filter by polarity (positive = good, negative = bad)
  label: string;
  hint?: string;
  customSpecs?: Specification[];          // already created custom specs to show in list
}

const CUSTOM_KEY = '__custom__';
const NONE_KEY   = '__none__';

export function SpecPicker({
  value,
  onChange,
  filterCategory,
  polarity,
  label,
  hint,
  customSpecs = [],
}: SpecPickerProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    modifier: polarity === 'positive' ? -5 : 3,
    description: '',
    category: (filterCategory ?? 'koerperlich') as TalentCategory,
  });

  // Filter predefined specs
  const predefined = SPECIFICATIONS.filter(s => {
    if (filterCategory && s.category !== filterCategory) return false;
    if (polarity === 'positive' && !isPositiveSpec(s)) return false;
    if (polarity === 'negative' && !isNegativeSpec(s)) return false;
    return true;
  });

  // Filter custom specs the same way
  const filteredCustom = customSpecs.filter(s => {
    if (filterCategory && s.category !== filterCategory) return false;
    if (polarity === 'positive' && !isPositiveSpec(s)) return false;
    if (polarity === 'negative' && !isNegativeSpec(s)) return false;
    return true;
  });

  const allOptions = [...predefined, ...filteredCustom];

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const key = e.target.value;
    if (key === NONE_KEY) { onChange(null); setShowForm(false); return; }
    if (key === CUSTOM_KEY) { setShowForm(true); return; }
    const found = allOptions.find(s => s.name === key);
    if (found) { onChange(found); setShowForm(false); }
  }

  function handleCreateCustom() {
    if (!form.name.trim()) return;
    const spec: Specification = {
      name: form.name.trim(),
      modifier: form.modifier,
      description: form.description.trim(),
      category: form.category,
    };
    onChange(spec);
    setShowForm(false);
    setForm({ ...form, name: '', description: '' });
  }

  const selectedKey = value ? value.name : NONE_KEY;
  const polarityColor = polarity === 'positive' ? 'border-success/40 bg-success/5' : polarity === 'negative' ? 'border-danger/40 bg-danger/5' : 'border-hairline';

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${polarityColor}`}>
      <div>
        <p className={`text-xs font-medium ${polarity === 'positive' ? 'text-success' : polarity === 'negative' ? 'text-danger' : 'text-muted'}`}>
          {label}
        </p>
        {hint && <p className="text-[10px] text-faint mt-0.5">{hint}</p>}
      </div>

      {/* Dropdown */}
      <select
        value={showForm ? CUSTOM_KEY : selectedKey}
        onChange={handleSelect}
        className="w-full bg-raised border border-hairline rounded px-2 py-2 text-primary text-sm focus:outline-none focus:border-muted"
      >
        <option value={NONE_KEY}>— kein Spezifikum —</option>

        {/* Predefined grouped by category */}
        {filterCategory ? (
          predefined.map(s => (
            <option key={s.name} value={s.name}>
              {s.modifier > 0 ? `+${s.modifier}` : s.modifier} {s.name}
            </option>
          ))
        ) : (
          TALENT_CATEGORIES.map(cat => {
            const inCat = predefined.filter(s => s.category === cat.key);
            if (!inCat.length) return null;
            return (
              <optgroup key={cat.key} label={CAT_LABEL[cat.key]}>
                {inCat.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.modifier > 0 ? `+${s.modifier}` : s.modifier} {s.name}
                  </option>
                ))}
              </optgroup>
            );
          })
        )}

        {/* Custom specs already created */}
        {filteredCustom.length > 0 && (
          <optgroup label="Eigene Spezifika (SL-genehmigt)">
            {filteredCustom.map(s => (
              <option key={s.name} value={s.name}>
                {s.modifier > 0 ? `+${s.modifier}` : s.modifier} {s.name} ✎
              </option>
            ))}
          </optgroup>
        )}

        <option value={CUSTOM_KEY}>✎ Neues Spezifikum erstellen (SL-Absprache)…</option>
      </select>

      {/* Selected spec preview */}
      {value && !showForm && (
        <div className="text-xs text-muted italic leading-relaxed">
          {value.description}
        </div>
      )}

      {/* Custom creation form */}
      {showForm && (
        <div className="space-y-2 border-t border-hairline pt-3">
          <p className="text-xs text-warn font-medium">Neues Spezifikum (in Absprache mit Spielleiter)</p>
          <input
            type="text"
            placeholder="Bezeichnung"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
          />
          <textarea
            placeholder="Beschreibung (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted resize-none"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-faint block mb-1">Kategorie</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as TalentCategory }))}
                disabled={!!filterCategory}
                className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-xs focus:outline-none disabled:opacity-50"
              >
                {TALENT_CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>{CAT_LABEL[cat.key]}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="text-[10px] text-faint block mb-1">Modifikator</label>
              <input
                type="number"
                value={form.modifier}
                onChange={e => setForm(f => ({ ...f, modifier: Number(e.target.value) }))}
                className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm font-mono focus:outline-none focus:border-muted"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-1.5 border border-hairline rounded text-xs text-muted hover:text-primary"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreateCustom}
              disabled={!form.name.trim()}
              className="flex-1 py-1.5 bg-paper text-bg rounded text-xs font-medium disabled:opacity-40"
            >
              Erstellen & auswählen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
