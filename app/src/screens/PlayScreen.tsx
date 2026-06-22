import { useState } from 'react';
import { useStore } from '../store/useStore';
import { TALENT_CATEGORIES, TALENT_MAP } from '../data/talents';
import type { AttributeKey } from '../types/character';
import { resolveCheck, randomD20 } from '../rules/checks';
import { calcLE, calcGG } from '../rules/derivedValues';
import { AttributeChip } from '../components/ui/AttributeChip';

type PlayTab = 'probe' | 'inventar' | 'notizen';

function HealthSection({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);

  if (!char) return null;
  const maxLE = calcLE(char);
  const maxGG = calcGG(char);
  const le = char.currentLE;
  const gg = char.currentGG;

  function adjustLE(delta: number) {
    patchCharacter(charId, c => { c.currentLE = Math.max(0, Math.min(maxLE, c.currentLE + delta)); });
  }
  function adjustGG(delta: number) {
    patchCharacter(charId, c => { c.currentGG = Math.max(0, Math.min(maxGG, c.currentGG + delta)); });
  }

  return (
    <div className="px-4 pt-3 pb-3 bg-surface border-b border-hairline space-y-3">
      {/* LE */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-danger font-medium w-6">LE</span>
        <div className="flex-1 h-2 bg-raised rounded-full overflow-hidden">
          <div className="h-full bg-danger rounded-full transition-all" style={{ width: `${(le / maxLE) * 100}%` }} />
        </div>
        <span className="font-mono text-sm text-primary w-12 text-right">{le}/{maxLE}</span>
        <button onClick={() => adjustLE(-1)} className="w-6 h-6 text-xs border border-hairline rounded text-muted hover:text-danger">−</button>
        <button onClick={() => adjustLE(+1)} className="w-6 h-6 text-xs border border-hairline rounded text-muted hover:text-success">+</button>
      </div>
      {/* GG */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-in font-medium w-6">GG</span>
        <div className="flex-1 h-2 bg-raised rounded-full overflow-hidden">
          <div className="h-full bg-in rounded-full transition-all" style={{ width: `${(gg / maxGG) * 100}%` }} />
        </div>
        <span className="font-mono text-sm text-primary w-12 text-right">{gg}/{maxGG}</span>
        <button onClick={() => adjustGG(-1)} className="w-6 h-6 text-xs border border-hairline rounded text-muted hover:text-danger">−</button>
        <button onClick={() => adjustGG(+1)} className="w-6 h-6 text-xs border border-hairline rounded text-muted hover:text-success">+</button>
      </div>
    </div>
  );
}

// ── Talent Check ───────────────────────────────────────────────────────────────
function TalentCheckTab({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [selectedTalent, setSelectedTalent] = useState('');
  const [rolls, setRolls] = useState<(number | '')[]>(['', '', '']);
  const [result, setResult] = useState<ReturnType<typeof resolveCheck> | null>(null);

  if (!char) return null;

  const talentMeta = selectedTalent ? TALENT_MAP[selectedTalent] : null;
  const talentValue = selectedTalent ? (char.talents[selectedTalent] ?? 0) : 0;
  const attrValues = talentMeta?.attrs
    ? talentMeta.attrs.map(a => char.attributes[a as AttributeKey])
    : [0, 0, 0];

  function rollAuto() {
    const r = [randomD20(), randomD20(), randomD20()];
    setRolls(r);
    if (talentMeta) {
      setResult(resolveCheck(r, attrValues, talentValue));
    }
  }

  function rollManual() {
    const r = rolls.map(v => Number(v) || 0);
    if (talentMeta) {
      setResult(resolveCheck(r, attrValues, talentValue));
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Talent select */}
      <div className="space-y-1">
        <label className="text-xs text-muted">Talent auswählen</label>
        <select
          value={selectedTalent}
          onChange={e => { setSelectedTalent(e.target.value); setResult(null); setRolls(['', '', '']); }}
          className="w-full bg-raised border border-hairline rounded px-2 py-2 text-primary text-sm"
        >
          <option value="">— Talent wählen —</option>
          {TALENT_CATEGORIES.map(cat => (
            <optgroup key={cat.key} label={cat.label}>
              {cat.talents.filter(t => (char.talents[t.name] ?? 0) > 0).map(t => (
                <option key={t.name} value={t.name}>{t.name} ({char.talents[t.name]})</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Talent info */}
      {talentMeta && (
        <div className="bg-surface border border-hairline rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">{selectedTalent}</span>
            <span className="font-mono text-xs text-paper bg-paper/10 px-1.5 rounded">TW: {talentValue}</span>
          </div>
          {talentMeta.attrs && (
            <div className="flex gap-2 items-center">
              {talentMeta.attrs.map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <AttributeChip attr={a} size="sm" />
                  <span className="font-mono text-xs text-muted">{char.attributes[a as AttributeKey]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roll inputs */}
      {talentMeta && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-xs text-muted text-center">
                  Wurf {i + 1} ({talentMeta.attrs?.[i] ?? '—'}: {attrValues[i]})
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rolls[i]}
                  onChange={e => {
                    const r = [...rolls]; r[i] = e.target.value === '' ? '' : Number(e.target.value);
                    setRolls(r); setResult(null);
                  }}
                  placeholder="1-20"
                  className="bg-raised border border-hairline rounded px-2 py-2 text-primary text-center font-mono text-lg focus:outline-none focus:border-muted"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={rollAuto}
              className="flex-1 py-2.5 bg-paper text-bg font-medium rounded text-sm hover:opacity-90"
            >
              🎲 Automatisch würfeln
            </button>
            <button
              onClick={rollManual}
              disabled={rolls.some(r => r === '')}
              className="flex-1 py-2.5 border border-hairline rounded text-sm text-muted hover:text-primary disabled:opacity-30"
            >
              Auswerten
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 border-2 text-center ${result.success ? 'border-success bg-success/10' : 'border-danger bg-danger/10'}`}>
          <div className={`font-display text-3xl font-bold tracking-widest ${result.success ? 'text-success' : 'text-danger'}`}>
            {result.success ? 'ERFOLG' : 'FEHLSCHLAG'}
          </div>
          <div className="text-sm text-muted mt-2">
            {result.success
              ? `Verbleibende Talentpunkte: ${result.remaining}`
              : `Fehlende Punkte: ${Math.abs(result.remaining)}`
            }
          </div>
          <div className="flex justify-center gap-3 mt-3">
            {result.rolls.map((r, i) => (
              <div key={i} className="text-center">
                <div className={`font-mono text-lg ${r.success ? 'text-success' : 'text-danger'}`}>{r.roll}</div>
                <div className="text-xs text-faint">{r.diff > 0 ? `−${r.diff}` : '✓'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────
function InventoryTab({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);
  const [newName, setNewName] = useState('');

  if (!char) return null;

  function addItem() {
    if (!newName.trim()) return;
    patchCharacter(charId, c => {
      c.inventory.push({ id: crypto.randomUUID(), name: newName.trim(), qty: 1 });
    });
    setNewName('');
  }

  function updateQty(id: string, delta: number) {
    patchCharacter(charId, c => {
      const item = c.inventory.find(i => i.id === id);
      if (item) item.qty = Math.max(0, item.qty + delta);
    });
  }

  function removeItem(id: string) {
    patchCharacter(charId, c => { c.inventory = c.inventory.filter(i => i.id !== id); });
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Gegenstand hinzufügen..."
          className="flex-1 bg-raised border border-hairline rounded px-3 py-2 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
        />
        <button onClick={addItem} className="px-3 py-2 bg-paper text-bg rounded text-sm font-medium hover:opacity-90">+</button>
      </div>
      {char.inventory.length === 0 ? (
        <p className="text-faint text-sm text-center py-8">Kein Inventar vorhanden</p>
      ) : (
        <div className="space-y-2">
          {char.inventory.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-surface border border-hairline rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-primary">{item.name}</span>
              <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 text-xs border border-hairline rounded text-muted hover:text-danger">−</button>
              <span className="font-mono text-sm w-4 text-center">{item.qty}</span>
              <button onClick={() => updateQty(item.id, +1)} className="w-6 h-6 text-xs border border-hairline rounded text-muted hover:text-success">+</button>
              <button onClick={() => removeItem(item.id)} className="text-faint hover:text-danger text-xs ml-1">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function NotesTab({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);
  const [newText, setNewText] = useState('');

  if (!char) return null;

  function addNote() {
    if (!newText.trim()) return;
    patchCharacter(charId, c => {
      c.notes.push({ id: crypto.randomUUID(), text: newText.trim(), timestamp: Date.now() });
    });
    setNewText('');
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col gap-2">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Neue Notiz..."
          rows={3}
          className="w-full bg-raised border border-hairline rounded px-3 py-2 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted resize-none"
        />
        <button onClick={addNote} className="self-end px-4 py-1.5 bg-paper text-bg rounded text-sm font-medium hover:opacity-90">
          Hinzufügen
        </button>
      </div>
      <div className="space-y-2">
        {[...char.notes].reverse().map(note => (
          <div key={note.id} className="bg-surface border border-hairline rounded-lg p-3">
            <p className="text-sm text-primary whitespace-pre-wrap">{note.text}</p>
            <p className="text-xs text-faint mt-1">{new Date(note.timestamp).toLocaleString('de-DE')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main PlayScreen ────────────────────────────────────────────────────────────
export function PlayScreen() {
  const activeId = useStore(s => s.activeId);
  const char = useStore(s => s.characters.find(c => c.id === activeId));
  const { setScreen } = useStore();
  const [activeTab, setActiveTab] = useState<PlayTab>('probe');

  if (!char || !activeId) return null;

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-hairline bg-surface">
        <button onClick={() => setScreen('sheet')} className="text-muted hover:text-primary text-sm">←</button>
        <span className="font-display text-base text-paper flex-1 truncate">{char.info.name}</span>
      </header>

      {/* Health bars */}
      <HealthSection charId={activeId} />

      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-hairline bg-surface">
        {(['probe', 'inventar', 'notizen'] as PlayTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm capitalize transition-colors border-b-2 ${
              activeTab === tab ? 'border-paper text-primary' : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {tab === 'probe' ? 'Probe' : tab === 'inventar' ? 'Inventar' : 'Notizen'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'probe' && <TalentCheckTab charId={activeId} />}
        {activeTab === 'inventar' && <InventoryTab charId={activeId} />}
        {activeTab === 'notizen' && <NotesTab charId={activeId} />}
      </div>
    </div>
  );
}
