import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TALENT_CATEGORIES } from '../../data/talents';
import { CatIcon } from '../ui/CatIcon';
import {
  talentAvailable, talentSpent, talentCanIncrease,
  talentFixedBonus, talentSpecBonusBreakdown,
  BASE_TALENT_PTS,
  varPtsLeft,
} from '../../rules/talentBudget';
import { calcSuccessProb } from '../../rules/checks';
import { SPECIAL_ABILITIES } from '../../data/specialAbilities';
import { VARIABLE_PTS } from '../../data/professions';
import { ATTR_MAP } from '../../data/attributes';
import type { AttributeKey, TalentCategory } from '../../types/character';

// ── Smooth TP health bar ─────────────────────────────────────────────────────
function TpBar({ left, total, color }: { left: number; total: number; color: string }) {
  const pct  = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const over = left < 0;
  return (
    <div className="h-2 w-full rounded-full overflow-hidden bg-raised">
      <div
        className="h-full rounded-full transition-all duration-200"
        style={{ width: `${pct}%`, backgroundColor: over ? '#D1453B' : color }}
      />
    </div>
  );
}

const ATTR_KEYS: AttributeKey[] = ['KK', 'GE', 'AU', 'CH', 'IN', 'MB'];


// ── Custom Talent Form ────────────────────────────────────────────────────────
function CustomTalentForm({ catKey: initialCatKey, charId, onClose }: {
  catKey?: TalentCategory | null; charId: string; onClose: () => void;
}) {
  const patch = useStore(s => s.patchCharacter);
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const [name, setName]   = useState('');
  const [mode, setMode]   = useState<'normal' | 'combat'>('normal');
  const [attrs, setAttrs] = useState<[AttributeKey, AttributeKey, AttributeKey]>(['KK', 'GE', 'AU']);
  const [catKey, setCatKey] = useState<TalentCategory>(initialCatKey ?? TALENT_CATEGORIES[0].key);

  const exists = !!char?.customTalents.find(t => t.name === name.trim());

  function save() {
    if (!name.trim() || exists) return;
    patch(charId, c => {
      c.customTalents.push({
        name: name.trim(), category: catKey,
        attrs: mode === 'normal' ? attrs : null,
        costMultiplier: mode === 'combat' ? 2 : 1,
      });
    });
    onClose();
  }

  function setAttr(i: 0 | 1 | 2, key: AttributeKey) {
    setAttrs(prev => {
      const n = [...prev] as [AttributeKey, AttributeKey, AttributeKey];
      n[i] = key;
      return n;
    });
  }

  return (
    <div className="bg-raised/40 rounded-lg px-3 py-3 space-y-2.5 border border-hairline/60">
      {!initialCatKey && (
        <div className="flex gap-1">
          {TALENT_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCatKey(cat.key)}
              className="flex-1 flex items-center justify-center py-1 rounded border transition-colors"
              style={{
                borderColor: catKey === cat.key ? `${cat.color}80` : '#2D303A',
                backgroundColor: catKey === cat.key ? `${cat.color}20` : 'transparent',
              }}
            >
              <CatIcon src={cat.icon} size={18} />
            </button>
          ))}
        </div>
      )}
      <input
        type="text" placeholder="Talentname" value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-bg border border-hairline rounded px-2 py-1.5 text-primary text-sm placeholder:text-faint focus:outline-none"
      />
      <div className="flex gap-2">
        {(['normal', 'combat'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
              mode === m
                ? m === 'combat' ? 'border-warn/50 text-warn bg-warn/5' : 'border-paper/50 text-paper bg-paper/5'
                : 'border-hairline text-faint hover:text-muted'
            }`}>
            {m === 'normal' ? '3 Attribute (×1)' : 'Kampftalent (×2)'}
          </button>
        ))}
      </div>
      {mode === 'normal' && (
        <div className="flex gap-1.5">
          {([0, 1, 2] as const).map(i => (
            <select key={i} value={attrs[i]} onChange={e => setAttr(i, e.target.value as AttributeKey)}
              className="flex-1 bg-bg border border-hairline rounded px-1 py-1 text-primary text-xs focus:outline-none">
              {ATTR_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          ))}
        </div>
      )}
      {exists && <p className="text-xs text-danger">Name bereits vergeben.</p>}
      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-1.5 border border-hairline rounded text-xs text-muted">
          Abbrechen
        </button>
        <button onClick={save} disabled={!name.trim() || exists}
          className="flex-1 py-1.5 bg-paper text-bg rounded text-xs font-medium disabled:opacity-40">
          Erstellen
        </button>
      </div>
    </div>
  );
}

function qualityRibbon(effective: number): { label: string; color: string } | null {
  if (effective === 0)  return null;
  if (effective <= 4)   return { label: 'Anfänger', color: '#E08C3C' };
  if (effective <= 9)   return { label: 'Geübt',    color: '#8C8F99' };
  return                       { label: 'Profi',    color: '#4FA968' };
}

// ── Talent row ────────────────────────────────────────────────────────────────
function TalentTile({ charId, talentName, attrs, costMul, isCustom, catColor, catIcon }: {
  charId: string;
  talentName: string;
  attrs: readonly AttributeKey[] | null;
  costMul: 1 | 2;
  isCustom: boolean;
  catColor: string;
  catIcon: string;
}) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);
  const [hoveredAttr, setHoveredAttr] = useState<number | null>(null);

  if (!char) return null;

  const stored     = char.talents[talentName] ?? 0;
  const fixedBonus = talentFixedBonus(char, talentName);
  const effective  = stored + fixedBonus;
  const isHobby1   = char.hobby1Talent === talentName;
  const isHobby2   = char.hobby2Talent === talentName;
  const isProfTal  = char.professionTalent === talentName;
  const isCombat   = costMul === 2;
  const canInc     = talentCanIncrease(char, talentName);
  const canDec     = stored > 0;
  const qual       = qualityRibbon(effective);

  const isSpecial  = isHobby1 || isHobby2 || isProfTal;
  const isEmpty    = effective === 0;
  const tileBg     = isEmpty ? `${catColor}06` : `${catColor}10`;
  const tileBorder = isSpecial ? `${catColor}60` : isEmpty ? `${catColor}18` : `${catColor}28`;
  const srcLabel   = isProfTal ? 'Beruf' : isHobby1 ? '1. Hobby' : isHobby2 ? '2. Hobby' : null;

  const prob = (!isCombat && attrs && attrs.length === 3)
    ? calcSuccessProb(attrs.map(a => char.attributes[a]), effective)
    : null;
  const probColor = prob === null ? catColor
    : prob >= 0.75 ? '#4FA968'
    : prob >= 0.5  ? '#C8A020'
    : '#C83030';

  const attrVals = attrs ? attrs.map(a => char.attributes[a]) : null;
  const deltaPlus  = (prob !== null && attrVals && canInc)
    ? calcSuccessProb(attrVals, effective + 1) - prob
    : null;
  const deltaMinus = (prob !== null && attrVals && canDec)
    ? prob - calcSuccessProb(attrVals, effective - 1)
    : null;

  return (
    <div
      className="relative flex flex-col gap-1.5 px-2 py-1.5 rounded-lg border transition-colors overflow-hidden"
      style={{ backgroundColor: tileBg, borderColor: tileBorder, opacity: isEmpty ? 0.55 : 1 }}
    >
      {/* Titel */}
      <div className="flex items-center gap-2 min-w-0">
        <CatIcon src={catIcon} size={22} className="shrink-0" />
        <span className="text-base font-semibold leading-tight truncate" style={{ color: catColor }}>
          {talentName}
        </span>
        {isCustom && <span className="text-[7px] text-warn shrink-0">SL</span>}
      </div>

      {/* Attribute + Wert + Pfeile */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isCombat && attrs?.map((a, i) => {
            const meta = ATTR_MAP[a as AttributeKey];
            return (
              <div key={i} className="relative"
                onMouseEnter={() => setHoveredAttr(i)}
                onMouseLeave={() => setHoveredAttr(null)}
              >
                <CatIcon src={meta?.icon ?? ''} size={24} />
                {hoveredAttr === i && (
                  <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none"
                    style={{ color: meta?.color }}>
                    {meta?.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-2xl font-mono font-bold text-primary leading-none">{effective}</span>
          <div className="flex flex-col gap-px">
            <div className="flex items-center gap-1">
              {deltaPlus !== null && (
                <span className="text-[8px] font-mono font-bold w-7 text-right leading-none" style={{ color: '#4FA968' }}>
                  +{Math.round(deltaPlus * 100)}%
                </span>
              )}
              <button
                onClick={() => patch(charId, c => { c.talents[talentName] = stored + 1; })}
                disabled={!canInc}
                className="w-7 h-5 flex items-center justify-center rounded border border-hairline hover:opacity-80 disabled:opacity-20 transition-opacity"
              >
                <img src={isCombat ? '/icons/attr/arrow_up2.png' : '/icons/attr/arrow_up.png'} className="w-6 h-5 object-contain" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              {deltaMinus !== null && (
                <span className="text-[8px] font-mono font-bold w-7 text-right leading-none" style={{ color: '#C83030' }}>
                  −{Math.round(deltaMinus * 100)}%
                </span>
              )}
              <button
                onClick={() => patch(charId, c => { c.talents[talentName] = Math.max(0, stored - 1); })}
                disabled={!canDec}
                className="w-7 h-5 flex items-center justify-center rounded border border-hairline hover:opacity-80 disabled:opacity-20 transition-opacity"
              >
                <img src={isCombat ? '/icons/attr/arrow_down2.png' : '/icons/attr/arrow_down.png'} className="w-6 h-5 object-contain" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success probability bar */}
      {prob !== null && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${probColor}22` }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${prob * 100}%`, backgroundColor: probColor }} />
          </div>
          <span className="text-[9px] font-mono font-bold shrink-0 w-7 text-right" style={{ color: probColor }}>
            {Math.round(prob * 100)}%
          </span>
        </div>
      )}

      {/* Source ribbon — bottom-left */}
      {srcLabel && (
        <span className="absolute pointer-events-none"
          style={{
            bottom: 8, left: -22, width: 80, textAlign: 'center',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 0', backgroundColor: `${catColor}CC`, color: '#fff',
            transform: 'rotate(45deg)', transformOrigin: 'center', whiteSpace: 'nowrap',
          }}
        >{srcLabel}</span>
      )}

      {/* Quality badge — top-right */}
      {qual && (
        <span
          className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide pointer-events-none"
          style={{ backgroundColor: `${qual.color}30`, color: qual.color }}
        >{qual.label}</span>
      )}
    </div>
  );
}


// ── Special abilities section ─────────────────────────────────────────────────
function SpecialAbilitiesSection({ charId }: { charId: string }) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);

  if (!char) return null;

  const left  = varPtsLeft(char);

  function toggle(id: string) {
    const ability = SPECIAL_ABILITIES.find(a => a.id === id)!;
    const has = char!.specialAbilities.includes(id);
    if (has) {
      patch(charId, c => { c.specialAbilities = c.specialAbilities.filter(x => x !== id); });
    } else if (left >= ability.cost) {
      patch(charId, c => { c.specialAbilities.push(id); });
    }
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mt-2 border-paper/20 bg-paper/5">
        <span className="text-base leading-none shrink-0">✨</span>
        <span className="text-xs font-bold tracking-wider uppercase flex-1 text-paper/70">
          Besondere Fähigkeiten
        </span>
        <div className="w-20 shrink-0">
          <TpBar left={left} total={VARIABLE_PTS} color="#E8E1CF" />
        </div>
        <span className={`font-mono text-sm font-bold shrink-0 ${left < 0 ? 'text-danger' : 'text-paper'}`}>
          {left}/{VARIABLE_PTS}
        </span>
      </div>

      {/* Ability rows */}
      {SPECIAL_ABILITIES.map(ability => {
        const active    = char.specialAbilities.includes(ability.id);
        const canAfford = left >= ability.cost;
        return (
          <button
            key={ability.id}
            onClick={() => toggle(ability.id)}
            disabled={!active && !canAfford}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg border text-left transition-colors ${
              active
                ? 'border-paper/40 bg-paper/10'
                : canAfford
                  ? 'border-hairline hover:bg-raised/30'
                  : 'border-hairline/30 opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="text-[10px] font-medium text-primary flex-1 min-w-0 truncate">{ability.name}</span>
            <span className="text-[8px] font-mono text-faint shrink-0">{ability.cost}P</span>
            {active && <span className="text-[9px] text-paper font-bold shrink-0">✓</span>}
          </button>
        );
      })}
    </>
  );
}

// ── Category TP summary tile with tooltip ────────────────────────────────────
function CatSummaryTile({ charId, cat, index, total, isActive, onClick }: {
  charId: string;
  cat: { key: TalentCategory; color: string; icon: string; label: string };
  index: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const [open, setOpen] = useState(false);

  if (!char) return null;

  const spent     = talentSpent(char, cat.key);
  const available = talentAvailable(char, cat.key);
  const over      = spent > available;
  const { job, spec } = talentSpecBonusBreakdown(char, cat.key);

  return (
    <button
      onClick={onClick}
      className="relative flex-1 flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg border transition-colors"
      style={{
        borderColor:     isActive ? `${cat.color}90` : `${cat.color}30`,
        backgroundColor: isActive ? `${cat.color}20` : `${cat.color}08`,
        boxShadow:       isActive ? `inset 0 -2px 0 ${cat.color}` : 'none',
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <CatIcon src={cat.icon} size={20} />
      <span
        className="text-[10px] font-mono font-bold leading-none"
        style={{ color: over ? '#C83030' : cat.color }}
      >
        {spent}/{available}
      </span>

      {open && (
        <div
          className="absolute top-full mt-2 z-40 w-36 rounded-lg border border-hairline bg-raised shadow-xl px-3 py-2.5 pointer-events-none"
          style={
            index === 0               ? { left: 0 } :
            index === total - 1       ? { right: 0 } :
                                        { left: '50%', transform: 'translateX(-50%)' }
          }
        >
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: cat.color }}>
            {cat.label}
          </p>
          <div className="space-y-1 text-[9px] font-mono">
            <div className="flex justify-between text-faint">
              <span>Basis</span>
              <span>{BASE_TALENT_PTS}</span>
            </div>
            {job !== 0 && (
              <div className="flex justify-between" style={{ color: job > 0 ? '#4FA968' : '#C83030' }}>
                <span>Beruf</span>
                <span>{job > 0 ? '+' : ''}{job}</span>
              </div>
            )}
            {spec !== 0 && (
              <div className="flex justify-between" style={{ color: spec > 0 ? '#4FA968' : '#C83030' }}>
                <span>Spezifikum</span>
                <span>{spec > 0 ? '+' : ''}{spec}</span>
              </div>
            )}
            <div className="border-t border-hairline pt-1 flex justify-between font-bold text-paper">
              <span>Gesamt</span>
              <span>{available}</span>
            </div>
            <div className="flex justify-between" style={{ color: over ? '#C83030' : '#4FA968' }}>
              <span>Verbraucht</span>
              <span>{spent}</span>
            </div>
            <div className="flex justify-between font-bold" style={{ color: over ? '#C83030' : cat.color }}>
              <span>Verbleibend</span>
              <span>{available - spent}</span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab4Talents({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [selectedCat, setSelectedCat] = useState<TalentCategory>(TALENT_CATEGORIES[0].key);
  const [showCustomForm, setShowCustomForm] = useState(false);

  if (!char) return null;

  const activeCat = TALENT_CATEGORIES.find(c => c.key === selectedCat)!;
  const customInCat = char.customTalents.filter(t => t.category === selectedCat);

  return (
    <div className="flex flex-col h-full">

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 px-4 pt-4 pb-2 shrink-0">
        {TALENT_CATEGORIES.map((cat, i) => (
          <CatSummaryTile
            key={cat.key}
            charId={charId}
            cat={cat}
            index={i}
            total={TALENT_CATEGORIES.length}
            isActive={selectedCat === cat.key}
            onClick={() => { setSelectedCat(cat.key); setShowCustomForm(false); }}
          />
        ))}
      </div>

      {/* ── Talent cards for selected category ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-1.5">
        {activeCat.talents.map(t => (
          <TalentTile key={t.name} charId={charId} talentName={t.name}
            attrs={t.attrs} costMul={t.costMultiplier} isCustom={false}
            catColor={activeCat.color} catIcon={activeCat.icon} />
        ))}
        {customInCat.map(ct => (
          <TalentTile key={ct.name} charId={charId} talentName={ct.name}
            attrs={ct.attrs} costMul={ct.costMultiplier} isCustom
            catColor={activeCat.color} catIcon={activeCat.icon} />
        ))}

        {showCustomForm ? (
          <CustomTalentForm catKey={selectedCat} charId={charId} onClose={() => setShowCustomForm(false)} />
        ) : (
          <button
            onClick={() => setShowCustomForm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors"
          >
            <span className="text-xs">+ Talent anlegen</span>
          </button>
        )}

        <SpecialAbilitiesSection charId={charId} />
      </div>
    </div>
  );
}
