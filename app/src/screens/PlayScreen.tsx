import { useState } from 'react';
import { useStore } from '../store/useStore';
import { TALENT_CATEGORIES, TALENT_MAP } from '../data/talents';
import { ATTR_MAP } from '../data/attributes';
import { PROFESSION_MAP } from '../data/professions';
import { calcSuccessProb, resolveCheck, randomD20 } from '../rules/checks';
import { calcDerived, calcATN, calcPA, calcATD, calcINI, calcLE, calcGG } from '../rules/derivedValues';
import { talentFixedBonus } from '../rules/talentBudget';
import { SpiderChart } from '../components/ui/SpiderChart';
import type { SpiderAxis } from '../components/ui/SpiderChart';
import { CatIcon } from '../components/ui/CatIcon';
import type { AttributeKey, ProbeEntry } from '../types/character';
import { RADAR_AXES, COLOR_ZONES, RADAR_COLORS as C, probColor } from '../data/radarConfig';

type PlayTab = 'probe' | 'inventar' | 'notizen';

// ── Vital bar with +/- controls ───────────────────────────────────────────────
function VitalBar({ label, icon, color, current, max, onAdjust, onSet }: {
  label: string;
  icon: string;
  color: string;
  current: number;
  max: number;
  onAdjust: (delta: number) => void;
  onSet: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isLow = pct < 30;

  function commitEdit() {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n)) onSet(n);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 rounded-full overflow-hidden"
        style={{ width: 36, height: 36, boxShadow: `0 0 0 2px ${color}99, 0 0 12px 3px ${color}44` }}
      >
        <img src={icon} alt={label} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
          {editing ? (
            <input
              type="number"
              autoFocus
              value={inputVal}
              min={0}
              max={max}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
              className="font-mono text-sm font-bold bg-raised border border-hairline rounded px-1 w-16 text-right text-paper"
              style={{ borderColor: `${color}60` }}
            />
          ) : (
            <button
              onClick={() => { setInputVal(String(current)); setEditing(true); }}
              className="font-mono text-sm font-bold text-paper hover:opacity-70 transition-opacity"
              title="Wert direkt eingeben"
            >
              {current}
              <span className="text-faint font-normal text-xs"> / {max}</span>
            </button>
          )}
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-raised border border-hairline">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: color,
              boxShadow: isLow ? `0 0 10px ${color}` : `0 0 6px ${color}88`,
            }}
          />
        </div>
      </div>
      <button
        onClick={() => onAdjust(-1)}
        className="shrink-0 flex items-center justify-center rounded-lg border border-hairline text-muted hover:text-paper hover:border-muted transition-colors font-bold text-lg"
        style={{ width: 40, height: 40 }}
        aria-label={`${label} verringern`}
      >
        −
      </button>
      {current < max ? (
        <button
          onClick={() => onSet(max)}
          className="shrink-0 flex items-center justify-center rounded-lg border text-[10px] font-bold tracking-wide transition-colors"
          style={{ width: 40, height: 40, borderColor: `${color}60`, color, backgroundColor: `${color}10` }}
          aria-label={`${label} auf Maximum setzen`}
          title="Auf Max heilen"
        >
          MAX
        </button>
      ) : (
        <button
          onClick={() => onAdjust(+1)}
          className="shrink-0 flex items-center justify-center rounded-lg border text-sm font-bold transition-colors"
          style={{ width: 40, height: 40, borderColor: `${color}60`, color, backgroundColor: `${color}10` }}
          aria-label={`${label} erhöhen`}
        >
          +
        </button>
      )}
    </div>
  );
}

// ── Compact talent tile (name + %) ───────────────────────────────────────────
function TalentTile({ talentName, catColor, effective, pct, isCombat, onSelect }: {
  talentName: string;
  catColor: string;
  effective: number;
  pct: number | null;
  isCombat: boolean;
  onSelect: () => void;
}) {
  const vc = isCombat ? catColor : probColor(pct);
  return (
    <button
      onClick={onSelect}
      className="rounded-lg border p-2 flex flex-col gap-0.5 text-left hover:opacity-80 active:scale-95 transition-all"
      style={{
        borderColor: `${catColor}30`,
        backgroundColor: `${catColor}08`,
        opacity: effective === 0 ? 0.38 : 1,
      }}
    >
      <span className="text-[10px] leading-tight line-clamp-2" style={{ color: catColor }}>
        {talentName}
      </span>
      <span className="font-mono font-bold text-base leading-none" style={{ color: vc }}>
        {pct !== null ? `${pct}%` : `TP ${effective}`}
      </span>
    </button>
  );
}

// ── Probe tab ─────────────────────────────────────────────────────────────────
function ProbeTab({ charId }: { charId: string }) {
  const char           = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [rolls, setRolls]   = useState<(number | '')[]>(['', '', '']);
  const [result, setResult] = useState<ReturnType<typeof resolveCheck> | null>(null);

  if (!char) return null;

  const talentMeta   = selectedTalent ? TALENT_MAP[selectedTalent] : null;
  const stored       = selectedTalent ? (char.talents[selectedTalent] ?? 0) : 0;
  const fixedBonus   = selectedTalent ? talentFixedBonus(char, selectedTalent) : 0;
  const effective    = stored + fixedBonus;
  const isCombat     = talentMeta?.costMultiplier === 2;
  const attrVals     = talentMeta?.attrs
    ? talentMeta.attrs.map(a => char.attributes[a as AttributeKey])
    : [0, 0, 0];
  const prob = (!isCombat && talentMeta?.attrs && attrVals.length === 3)
    ? calcSuccessProb(attrVals, effective)
    : null;
  const probPct   = prob !== null ? Math.round(prob * 100) : null;
  const pColor    = probColor(probPct);

  function saveToHistory(r: ReturnType<typeof resolveCheck>, rollValues: number[]) {
    if (!selectedTalent) return;
    const entry: ProbeEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      talentName: selectedTalent,
      effective,
      attrValues: attrVals,
      rolls: rollValues,
      totalDiff: r.totalDiff,
      success: r.success,
      remaining: r.remaining,
    };
    patchCharacter(charId, c => {
      c.probeHistory = [entry, ...(c.probeHistory ?? [])].slice(0, 20);
    });
  }

  function rollAuto() {
    const r = [randomD20(), randomD20(), randomD20()];
    setRolls(r);
    if (talentMeta) {
      const res = resolveCheck(r, attrVals, effective);
      setResult(res);
      saveToHistory(res, r);
    }
  }

  function rollManual() {
    const r = rolls.map(v => (v === '' ? 0 : Number(v)));
    if (talentMeta) {
      const res = resolveCheck(r, attrVals, effective);
      setResult(res);
      saveToHistory(res, r);
    }
  }

  function deselect() {
    setSelectedTalent(null);
    setRolls(['', '', '']);
    setResult(null);
  }

  function selectTalent(name: string) {
    setSelectedTalent(name);
    setRolls(['', '', '']);
    setResult(null);
  }

  // Radar axes
  const derived = calcDerived(char);
  const attrValues: Record<string, number> = {
    KK: char.attributes.KK, GE: char.attributes.GE,
    AU: char.attributes.AU, CH: char.attributes.CH,
    IN: char.attributes.IN, MB: char.attributes.MB,
    ATN: calcATN(char), PA: calcPA(char),
    ATD: calcATD(char), INI: calcINI(char),
    LE: derived.LE, GG: derived.GG,
  };
  const radarAxes: SpiderAxis[] = RADAR_AXES.map(e => ({
    key: e.key,
    value: attrValues[e.key] ?? 0,
    maxValue: e.maxValue,
    color: e.color,
  }));

  if (!selectedTalent) {
    return (
      <div className="p-4 space-y-4">
        {/* Spider chart */}
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <SpiderChart
            axes={radarAxes}
            size={140}
            gridValues={[5, 10, 14, 18]}
            showGridLabels
            showValueLabels
            chartId="play"
            className="w-full aspect-square"
            colorZones={COLOR_ZONES}
          />
        </div>

        {/* Würfelhistorie */}
        {(char.probeHistory?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted">Verlauf</span>
              <button
                onClick={() => patchCharacter(charId, c => { c.probeHistory = []; })}
                className="text-[9px] text-faint hover:text-danger transition-colors"
              >
                Löschen
              </button>
            </div>
            <div className="space-y-1">
              {(char.probeHistory ?? []).map(e => {
                const ts = new Date(e.timestamp);
                const time = `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`;
                const col = e.success ? '#4FA968' : '#C83048';
                return (
                  <div key={e.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-raised text-[11px]">
                    <span className="font-bold shrink-0 w-3" style={{ color: col }}>{e.success ? '✓' : '✗'}</span>
                    <span className="flex-1 truncate text-paper">{e.talentName}</span>
                    <span className="font-mono shrink-0" style={{ color: col }}>
                      {e.success ? `+${e.remaining}` : `−${Math.abs(e.remaining)}`}
                    </span>
                    <span className="font-mono text-faint shrink-0">{time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Talent tile grid per category */}
        {TALENT_CATEGORIES.map(cat => (
          <div key={cat.key}>
            <div className="flex items-center gap-1.5 mb-2">
              <CatIcon src={cat.icon} size={13} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>
                {cat.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {cat.talents.map(t => {
                const s   = char.talents[t.name] ?? 0;
                const b   = talentFixedBonus(char, t.name);
                const eff = s + b;
                const cmbt = t.costMultiplier === 2;
                const av  = t.attrs ? (t.attrs as AttributeKey[]).map(a => char.attributes[a]) : null;
                const p   = (!cmbt && av && av.length === 3) ? calcSuccessProb(av, eff) : null;
                const pct = p !== null ? Math.round(p * 100) : null;
                return (
                  <TalentTile
                    key={t.name}
                    talentName={t.name}
                    catColor={cat.color}
                    effective={eff}
                    pct={pct}
                    isCombat={cmbt}
                    onSelect={() => selectTalent(t.name)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const catMeta = TALENT_CATEGORIES.find(cat =>
    cat.talents.some(t => t.name === selectedTalent)
  );

  return (
    <div className="p-4 space-y-4">
      {/* Back + talent header */}
      <div className="flex items-center gap-3">
        <button
          onClick={deselect}
          className="text-muted hover:text-primary transition-colors text-sm shrink-0"
        >
          ← Zurück
        </button>
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{
            borderColor: `${catMeta?.color ?? '#888'}40`,
            backgroundColor: `${catMeta?.color ?? '#888'}0D`,
          }}
        >
          {catMeta && <CatIcon src={catMeta.icon} size={16} />}
          <span className="flex-1 font-semibold text-paper truncate">{selectedTalent}</span>
          <span
            className="font-mono font-bold text-sm px-2 py-0.5 rounded"
            style={{ color: catMeta?.color ?? '#888', backgroundColor: `${catMeta?.color ?? '#888'}18` }}
          >
            TP {effective}
          </span>
        </div>
      </div>

      {/* Success probability */}
      {prob !== null && (
        <div className="rounded-xl border border-hairline bg-surface p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Erfolgswahrscheinlichkeit</span>
            <span className="font-mono font-bold text-lg" style={{ color: pColor }}>{probPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-raised">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(prob * 100).toFixed(1)}%`, backgroundColor: pColor, boxShadow: `0 0 6px ${pColor}88` }}
            />
          </div>
        </div>
      )}

      {/* Attribute display */}
      {talentMeta?.attrs && (
        <div className="grid grid-cols-3 gap-2">
          {(talentMeta.attrs as AttributeKey[]).map((a, i) => {
            const meta = ATTR_MAP[a];
            const val  = char.attributes[a];
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                style={{ borderColor: `${meta?.color ?? '#888'}40`, backgroundColor: `${meta?.color ?? '#888'}0D` }}
              >
                <div
                  className="rounded-full overflow-hidden shrink-0"
                  style={{ width: 24, height: 24, boxShadow: `0 0 0 1.5px ${meta?.color ?? '#888'}88` }}
                >
                  <img src={meta?.icon ?? ''} alt={a} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: meta?.color ?? '#888' }}>
                    {a}
                  </div>
                  <div className="font-mono font-bold text-paper leading-none">{val}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Roll inputs */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => {
            const attrKey = talentMeta?.attrs?.[i] as AttributeKey | undefined;
            const attrMeta = attrKey ? ATTR_MAP[attrKey] : null;
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="text-center text-[10px] text-muted font-mono">
                  {attrKey && attrMeta ? (
                    <span style={{ color: attrMeta.color }}>{attrKey} {char.attributes[attrKey]}</span>
                  ) : (
                    <span>Wurf {i + 1}</span>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rolls[i]}
                  onChange={e => {
                    const r = [...rolls];
                    r[i] = e.target.value === '' ? '' : Number(e.target.value);
                    setRolls(r);
                    setResult(null);
                  }}
                  placeholder="W20"
                  className="bg-raised border border-hairline rounded-lg px-2 py-3 text-paper text-center font-mono text-xl font-bold focus:outline-none focus:border-muted"
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={rollAuto}
            className="flex-1 py-3 bg-paper text-bg font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            🎲 Automatisch würfeln
          </button>
          <button
            onClick={rollManual}
            disabled={rolls.some(r => r === '')}
            className="flex-1 py-3 border border-hairline rounded-lg text-sm text-muted hover:text-primary disabled:opacity-30 transition-colors font-medium"
          >
            Auswerten
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className="rounded-xl border-2 p-5 text-center space-y-3"
          style={{
            borderColor: result.success ? '#4FA96880' : '#C8304880',
            backgroundColor: result.success ? '#4FA96810' : '#C8304810',
          }}
        >
          <div
            className="text-3xl font-bold tracking-widest"
            style={{ color: result.success ? '#4FA968' : '#C83048' }}
          >
            {result.success ? 'ERFOLG' : 'FEHLSCHLAG'}
          </div>
          <div className="text-sm text-muted">
            {result.success
              ? `Verbleibende Talentpunkte: ${result.remaining}`
              : `Fehlende Punkte: ${Math.abs(result.remaining)}`
            }
          </div>
          <div className="flex justify-center gap-4">
            {result.rolls.map((r, i) => {
              const attrKey = talentMeta?.attrs?.[i] as AttributeKey | undefined;
              const meta = attrKey ? ATTR_MAP[attrKey] : null;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-lg font-bold border-2"
                    style={{
                      borderColor: r.success ? '#4FA96880' : '#C8304880',
                      backgroundColor: r.success ? '#4FA96815' : '#C8304815',
                      color: r.success ? '#4FA968' : '#C83048',
                    }}
                  >
                    {r.roll}
                  </div>
                  {meta && (
                    <span className="text-[9px] font-mono" style={{ color: meta.color }}>{attrKey}</span>
                  )}
                  <span className="text-[9px] text-faint font-mono">
                    {r.diff > 0 ? `−${r.diff}` : '✓'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inventory tab ─────────────────────────────────────────────────────────────
function InventarTab({ charId }: { charId: string }) {
  const char           = useStore(s => s.characters.find(c => c.id === charId));
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
      {/* Add item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Gegenstand hinzufügen..."
          className="flex-1 bg-raised border border-hairline rounded-lg px-3 py-2 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted"
        />
        <button
          onClick={addItem}
          className="px-4 py-2 bg-paper text-bg rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
        >
          +
        </button>
      </div>

      {char.inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-faint">
          <span className="text-3xl mb-2">🎒</span>
          <p className="text-sm">Inventar leer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {char.inventory.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-surface border border-hairline rounded-xl px-4 py-2.5"
            >
              <span className="flex-1 text-sm text-primary font-medium">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateQty(item.id, -1)}
                  className="w-8 h-8 flex items-center justify-center border border-hairline rounded-lg text-muted hover:text-paper hover:border-muted transition-colors"
                >
                  −
                </button>
                <span className="font-mono text-sm text-paper w-6 text-center">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.id, +1)}
                  className="w-8 h-8 flex items-center justify-center border border-hairline rounded-lg text-muted hover:text-paper hover:border-muted transition-colors"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-1 w-7 h-7 flex items-center justify-center text-faint hover:text-danger transition-colors text-sm rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────
function NotizenTab({ charId }: { charId: string }) {
  const char           = useStore(s => s.characters.find(c => c.id === charId));
  const patchCharacter = useStore(s => s.patchCharacter);
  const [newText, setNewText]     = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText]   = useState('');

  if (!char) return null;

  function addNote() {
    if (!newText.trim()) return;
    patchCharacter(charId, c => {
      c.notes.push({ id: crypto.randomUUID(), text: newText.trim(), timestamp: Date.now() });
    });
    setNewText('');
  }

  function removeNote(id: string) {
    patchCharacter(charId, c => { c.notes = c.notes.filter(n => n.id !== id); });
  }

  function startEdit(id: string, text: string) {
    setEditingId(id);
    setEditText(text);
  }

  function saveEdit() {
    if (!editingId) return;
    patchCharacter(charId, c => {
      const note = c.notes.find(n => n.id === editingId);
      if (note) note.text = editText.trim();
    });
    setEditingId(null);
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col gap-2">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Neue Notiz eingeben..."
          rows={3}
          className="w-full bg-raised border border-hairline rounded-xl px-3 py-2.5 text-primary text-sm placeholder:text-faint focus:outline-none focus:border-muted resize-none"
        />
        <button
          onClick={addNote}
          disabled={!newText.trim()}
          className="self-end px-4 py-2 bg-paper text-bg rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Hinzufügen
        </button>
      </div>

      {char.notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-faint">
          <span className="text-3xl mb-2">📝</span>
          <p className="text-sm">Keine Notizen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...char.notes].reverse().map(note => (
            <div
              key={note.id}
              className="group relative bg-surface border border-hairline rounded-xl p-4"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full bg-raised border border-muted rounded-lg px-3 py-2 text-primary text-sm focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-muted hover:text-primary border border-hairline rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editText.trim()}
                      className="px-3 py-1.5 text-xs bg-paper text-bg rounded-lg font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className="text-sm text-primary whitespace-pre-wrap leading-relaxed cursor-text"
                    onClick={() => startEdit(note.id, note.text)}
                  >
                    {note.text}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-faint font-mono">
                      {new Date(note.timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <button
                      onClick={() => removeNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-faint hover:text-danger transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main PlayScreen ────────────────────────────────────────────────────────────
export function PlayScreen() {
  const activeId = useStore(s => s.activeId);
  const char     = useStore(s => s.characters.find(c => c.id === activeId));
  const patchCharacter = useStore(s => s.patchCharacter);
  const { setScreen } = useStore();
  const [activeTab, setActiveTab] = useState<PlayTab>('probe');

  if (!char || !activeId) return null;

  const prof   = char.profession ? PROFESSION_MAP[char.profession] : null;
  const maxLE  = calcLE(char);
  const maxGG  = calcGG(char);

  function adjustLE(delta: number) {
    patchCharacter(activeId!, c => {
      c.currentLE = Math.max(0, Math.min(maxLE, c.currentLE + delta));
    });
  }
  function setLE(value: number) {
    patchCharacter(activeId!, c => {
      c.currentLE = Math.max(0, Math.min(maxLE, value));
    });
  }
  function adjustGG(delta: number) {
    patchCharacter(activeId!, c => {
      c.currentGG = Math.max(0, Math.min(maxGG, c.currentGG + delta));
    });
  }
  function setGG(value: number) {
    patchCharacter(activeId!, c => {
      c.currentGG = Math.max(0, Math.min(maxGG, value));
    });
  }

  const TAB_LABELS: Record<PlayTab, string> = {
    probe:    'Probe',
    inventar: 'Inventar',
    notizen:  'Notizen',
  };

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Sticky header ── */}
      <header className="shrink-0 sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 border-b border-hairline bg-surface">
        <button
          onClick={() => setScreen('sheet')}
          className="text-muted hover:text-primary text-sm transition-colors shrink-0"
        >
          ← Dossier
        </button>
        <span className="flex-1 min-w-0 font-bold text-paper text-sm truncate">
          {char.info.name || 'Unbenannt'}
        </span>
        {prof && (
          <span className="text-[10px] font-mono shrink-0" style={{ color: prof.color }}>
            {prof.labelSingular}
          </span>
        )}
      </header>

      {/* ── Sticky vitals section ── */}
      <div className="shrink-0 sticky top-[41px] z-20 bg-surface border-b border-hairline px-4 pt-3 pb-3 space-y-3">
        <VitalBar
          label="LE"
          icon="/icons/attr/le.png"
          color={C.LE}
          current={char.currentLE}
          max={maxLE}
          onAdjust={adjustLE}
          onSet={setLE}
        />
        <VitalBar
          label="GG"
          icon="/icons/attr/gg.png"
          color={C.GG}
          current={char.currentGG}
          max={maxGG}
          onAdjust={adjustGG}
          onSet={setGG}
        />
      </div>

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-hairline bg-surface">
        {(['probe', 'inventar', 'notizen'] as PlayTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-sm font-medium transition-colors border-b-2"
            style={{
              borderBottomColor: activeTab === tab ? '#E8E0D0' : 'transparent',
              color: activeTab === tab ? '#E8E0D0' : '#6B6F7C',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'probe'    && <ProbeTab    charId={activeId} />}
        {activeTab === 'inventar' && <InventarTab charId={activeId} />}
        {activeTab === 'notizen'  && <NotizenTab  charId={activeId} />}
      </div>
    </div>
  );
}
