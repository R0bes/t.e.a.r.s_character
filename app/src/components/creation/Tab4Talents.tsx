import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TALENT_CATEGORIES } from '../../data/talents';
import { CatIcon } from '../ui/CatIcon';
import {
  talentAvailable, talentSpent, talentCanIncrease,
  talentFixedBonus, talentSpecBonusBreakdown,
  BASE_TALENT_PTS, varPtsLeft, getCategoryOf,
} from '../../rules/talentBudget';
import { calcSuccessProb } from '../../rules/checks';
import { SPECIAL_ABILITIES } from '../../data/specialAbilities';
import { VARIABLE_PTS } from '../../data/professions';
import { ATTR_MAP } from '../../data/attributes';
import type { AttributeKey, TalentCategory, Specification } from '../../types/character';
import { SPECIFICATIONS } from '../../data/specifications';
import { SpecTile, CustomSpecForm } from './Tab7FreeSpecs';

export type TabKey = TalentCategory | 'abilities';


const ATTR_KEYS: AttributeKey[] = ['KK', 'GE', 'AU', 'CH', 'IN', 'MB'];


// ── Custom Talent Form ────────────────────────────────────────────────────────
export function CustomTalentForm({ catKey: initialCatKey, charId, onClose }: {
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
                borderColor: catKey === cat.key ? `${cat.color}80` : '#B4A075',
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

export const QUALITY_TIERS = [
  { min: 10, label: 'Q3', color: '#8C6A1D' }, // Gold
  { min:  5, label: 'Q2', color: '#7A7568' }, // Silber
  { min:  1, label: 'Q1', color: '#8B4123' }, // Bronze
  { min:  0, label: 'Q0', color: '#9C8560' }, // Ungelernt
] as const;

function qualityLevel(effective: number): { label: string; color: string } {
  return QUALITY_TIERS.find(t => effective >= t.min)!;
}

// ── Talent row ────────────────────────────────────────────────────────────────
export function TalentTile({ charId, talentName, attrs, costMul, isCustom, catColor, mode }: {
  charId: string;
  talentName: string;
  attrs: readonly AttributeKey[] | null;
  costMul: 1 | 2;
  isCustom: boolean;
  catColor: string;
  mode: 'edit' | 'fix';
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
  const qual       = qualityLevel(effective);

  const isSpecial  = isHobby1 || isHobby2 || isProfTal;
  const isEmpty    = effective === 0;
  const tileBg     = isEmpty ? `${catColor}06` : `${catColor}10`;
  const tileBorder = isSpecial ? `${catColor}60` : isEmpty ? `${catColor}18` : `${catColor}28`;


  const attrVals = attrs ? attrs.map(a => char.attributes[a]) : null;
  const prob = (!isCombat && attrVals && attrVals.length === 3)
    ? calcSuccessProb(attrVals, effective)
    : null;
  const p1  = attrVals ? calcSuccessProb(attrVals, 1)  : null;
  const p5  = attrVals ? calcSuccessProb(attrVals, 5)  : null;
  const p10 = attrVals ? calcSuccessProb(attrVals, 10) : null;
  const Q = { q3: QUALITY_TIERS[0].color, q2: QUALITY_TIERS[1].color, q1: QUALITY_TIERS[2].color, q0: QUALITY_TIERS[3].color };

  const cat        = getCategoryOf(char, talentName);
  const maxTickTP  = cat ? Math.max(effective, talentAvailable(char, cat)) : 14;
  const tickProbs  = (attrVals && !isCombat)
    ? Array.from({ length: maxTickTP + 1 }, (_, tp) => calcSuccessProb(attrVals, tp))
    : null;


  return (
    <div
      className="relative flex flex-col rounded-lg border transition-colors overflow-hidden"
      style={{ backgroundColor: tileBg, borderColor: tileBorder, opacity: isEmpty && mode !== 'fix' ? 0.55 : 1 }}
      draggable={mode === 'edit'}
      onDragStart={e => {
        if (mode !== 'edit') return;
        e.dataTransfer.setData('application/x-tears-talent', talentName);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {/* Invisible left-third tap zone → decrement */}
      <button
        onClick={() => patch(charId, c => { c.talents[talentName] = Math.max(0, stored - 1); })}
        disabled={!canDec || mode === 'fix'}
        aria-label="Reduzieren"
        className="absolute inset-y-0 left-0 w-1/3 bg-transparent border-0 outline-none z-10"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />
      {/* Invisible right-third tap zone → increment */}
      <button
        onClick={() => patch(charId, c => { c.talents[talentName] = stored + 1; })}
        disabled={!canInc || mode === 'fix'}
        aria-label="Erhöhen"
        className="absolute inset-y-0 right-0 w-1/3 bg-transparent border-0 outline-none z-10"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />
      {/* Left edge: red gradient, visible only in top ~30% */}
      <div className="absolute inset-y-0 left-0 w-[5%] pointer-events-none"
        style={{
          background: `linear-gradient(to right, rgba(239,68,68,${canDec ? 0.4 : 0.07}), transparent)`,
          WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 50%)',
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 50%)',
          opacity: mode === 'fix' ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Right edge: green gradient, visible only in top ~30% */}
      <div className="absolute inset-y-0 right-0 w-[5%] pointer-events-none"
        style={{
          background: `linear-gradient(to left, rgba(34,197,94,${canInc ? 0.4 : 0.07}), transparent)`,
          WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 50%)',
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 50%)',
          opacity: mode === 'fix' ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Top-left corner stripe(s) — dec indicator */}
      {isCombat ? <>
        <div className="absolute pointer-events-none" style={{ top: 1, left: -11, width: 30, height: 3, borderRadius: 2, transform: 'rotate(-45deg)', transformOrigin: 'center', backgroundColor: `rgba(239,68,68,${canDec ? 0.75 : 0.18})`, zIndex: 2, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.3s ease' }} />
        <div className="absolute pointer-events-none" style={{ top: 6, left: -6,  width: 30, height: 3, borderRadius: 2, transform: 'rotate(-45deg)', transformOrigin: 'center', backgroundColor: `rgba(239,68,68,${canDec ? 0.75 : 0.18})`, zIndex: 2, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.3s ease' }} />
      </> : (
        <div className="absolute pointer-events-none" style={{ top: 3, left: -9,  width: 30, height: 3, borderRadius: 2, transform: 'rotate(-45deg)', transformOrigin: 'center', backgroundColor: `rgba(239,68,68,${canDec ? 0.75 : 0.18})`, zIndex: 2, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.3s ease' }} />
      )}
      {/* Top-right corner stripe(s) — inc indicator */}
      {isCombat ? <>
        <div className="absolute pointer-events-none" style={{ top: 1, right: -11, width: 30, height: 3, borderRadius: 2, transform: 'rotate(45deg)', transformOrigin: 'center', backgroundColor: `rgba(34,197,94,${canInc ? 0.75 : 0.18})`, zIndex: 2, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.3s ease' }} />
        <div className="absolute pointer-events-none" style={{ top: 6, right: -6,  width: 30, height: 3, borderRadius: 2, transform: 'rotate(45deg)', transformOrigin: 'center', backgroundColor: `rgba(34,197,94,${canInc ? 0.75 : 0.18})`, zIndex: 2, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.3s ease' }} />
      </> : (
        <div className="absolute pointer-events-none" style={{ top: 3, right: -9,  width: 30, height: 3, borderRadius: 2, transform: 'rotate(45deg)', transformOrigin: 'center', backgroundColor: `rgba(34,197,94,${canInc ? 0.75 : 0.18})`, zIndex: 2, opacity: mode === 'fix' ? 0 : 1, transition: 'opacity 0.3s ease' }} />
      )}

      {/* Content row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Talent name */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
          <span className="text-sm font-semibold leading-tight truncate" style={{ color: catColor }}>
            {talentName}
          </span>
          {isCustom && <span className="text-[7px] text-warn shrink-0">SL</span>}
        </div>

        {/* Right side: badge (fix) + attr icons (edit) — wrapped so parent gap doesn't misalign combat vs non-combat */}
        <div className="flex items-center shrink-0">
          {/* Fix-mode quality badge */}
          <div style={{
            overflow: 'hidden',
            maxWidth: mode === 'fix' ? 100 : 0,
            opacity: mode === 'fix' ? 1 : 0,
            transition: 'max-width 0.35s ease, opacity 0.3s ease',
            flexShrink: 0,
          }}>
            <div className="flex items-center justify-center px-2 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: qual.color, boxShadow: `0 1px 4px rgba(43,29,16,0.35)` }}>
              <span className="text-[10px] font-mono font-bold leading-none" style={{ color: '#fff' }}>
                {prob !== null
                  ? `${Math.round(prob * 100)}%`
                  : `${effective}`}
              </span>
            </div>
          </div>

          {/* Attr icons — non-combat only */}
          {!isCombat && attrs && (
            <div className="flex items-center gap-0.5"
              style={{
                maxWidth: mode === 'fix' ? 0 : 60,
                opacity: mode === 'fix' ? 0 : 1,
                overflow: 'hidden',
                transition: 'max-width 0.3s ease, opacity 0.25s ease',
              }}
            >
              {attrs.map((a, i) => {
                const meta = ATTR_MAP[a as AttributeKey];
                return (
                  <div key={i} className="relative"
                    onMouseEnter={() => setHoveredAttr(i)}
                    onMouseLeave={() => setHoveredAttr(null)}
                  >
                    <CatIcon src={meta?.icon ?? ''} size={18} />
                    {hoveredAttr === i && (
                      <span className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-raised border border-hairline text-[9px] font-mono whitespace-nowrap shadow-xl pointer-events-none"
                        style={{ color: meta?.color }}>
                        {meta?.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — fades into tile via mask-image, collapses in fix mode */}
      {prob !== null && p1 !== null && p5 !== null && p10 !== null && tickProbs && (
        <div style={{
          maxHeight: mode === 'fix' ? 0 : 32,
          opacity: mode === 'fix' ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
        }}>
        <div className="relative overflow-hidden" style={{
          height: 32,
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 50%)',
          maskImage: 'linear-gradient(to bottom, transparent, black 50%)',
        }}>
          {/* Color zones */}
          <div className="absolute inset-0 flex">
            <div style={{ width: `${p1  * 100}%`,          backgroundColor: `${Q.q0}28` }} />
            <div style={{ width: `${(p5  - p1)  * 100}%`, backgroundColor: `${Q.q1}30` }} />
            <div style={{ width: `${(p10 - p5)  * 100}%`, backgroundColor: `${Q.q2}30` }} />
            <div style={{ flex: 1,                         backgroundColor: `${Q.q3}30` }} />
          </div>
          {/* Ticks + labels */}
          {tickProbs.map((p, tp) => {
            if (tp === effective) return null;
            const tickColor = QUALITY_TIERS.find(t => tp >= t.min)!.color;
            return (
              <div key={tp} className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${p * 100}%`, transform: 'translateX(-50%)' }}
              >
                <span style={{ fontSize: 5, lineHeight: 1, color: `${tickColor}cc`, whiteSpace: 'nowrap', marginBottom: 2 }}>
                  {Math.round(p * 100)}%
                </span>
                <div style={{ width: 1, height: 8, backgroundColor: `${tickColor}88` }} />
              </div>
            );
          })}
          {/* Badge thumb */}
          <div className="absolute" style={{
            left: `${prob * 100}%`,
            bottom: 3,
            transform: 'translateX(-50%)',
            zIndex: 5,
            transition: 'left 0.2s',
          }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: qual.color,
                boxShadow: `0 1px 4px rgba(43,29,16,0.4), 0 0 0 1.5px ${qual.color}88`,
              }}>
              <span className="text-[6px] font-mono font-bold leading-none" style={{ color: '#fff' }}>
                {effective}
              </span>
            </div>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}


// ── Special abilities section ─────────────────────────────────────────────────
const ABILITY_COLOR = '#8C6A1D';

export function SpecialAbilitiesSection({ charId }: { charId: string }) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);

  if (!char) return null;

  const left = varPtsLeft(char);

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
      {SPECIAL_ABILITIES.map(ability => {
        const active    = char.specialAbilities.includes(ability.id);
        const canAfford = left >= ability.cost;
        return (
          <button
            key={ability.id}
            onClick={() => toggle(ability.id)}
            disabled={!active && !canAfford}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
              active
                ? 'bg-paper/10'
                : canAfford
                  ? 'border-hairline hover:bg-raised/30'
                  : 'border-hairline/30 opacity-40 cursor-not-allowed'
            }`}
            style={{ borderColor: active ? `${ABILITY_COLOR}60` : undefined }}
          >
            <span className="text-sm font-medium text-primary flex-1 min-w-0 truncate">{ability.name}</span>
            <span className="text-[9px] font-mono shrink-0" style={{ color: ABILITY_COLOR }}>{ability.cost}P</span>
            {active && <span className="text-[10px] font-bold shrink-0" style={{ color: ABILITY_COLOR }}>✓</span>}
          </button>
        );
      })}
    </>
  );
}

// ── Abilities tab button ──────────────────────────────────────────────────────
export function AbilityTab({ charId, isActive, onClick }: {
  charId: string; isActive: boolean; onClick: () => void;
}) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [open, setOpen] = useState(false);
  if (!char) return null;

  const left  = varPtsLeft(char);
  const spent = VARIABLE_PTS - left;
  const over  = left < 0;

  return (
    <button
      onClick={onClick}
      className="relative flex-1 flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg border transition-colors"
      style={{
        borderColor:     isActive ? `${ABILITY_COLOR}90` : `${ABILITY_COLOR}30`,
        backgroundColor: isActive ? `${ABILITY_COLOR}20` : `${ABILITY_COLOR}08`,
        boxShadow:       isActive ? `inset 0 -2px 0 ${ABILITY_COLOR}` : 'none',
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="text-base leading-none">✨</span>
      <span className="text-[10px] font-mono font-bold leading-none" style={{ color: over ? '#8B2E22' : ABILITY_COLOR }}>
        {spent}/{VARIABLE_PTS}
      </span>

      {open && (
        <div className="absolute top-full mt-2 z-40 w-36 rounded-lg border border-hairline bg-raised shadow-xl px-3 py-2.5 pointer-events-none"
          style={{ right: 0 }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: ABILITY_COLOR }}>
            Bes. Fähigkeiten
          </p>
          <div className="space-y-1 text-[9px] font-mono">
            <div className="flex justify-between font-bold text-paper">
              <span>Gesamt</span><span>{VARIABLE_PTS}</span>
            </div>
            <div className="flex justify-between" style={{ color: over ? '#8B2E22' : '#3F6B3A' }}>
              <span>Verbraucht</span><span>{spent}</span>
            </div>
            <div className="flex justify-between font-bold" style={{ color: over ? '#8B2E22' : ABILITY_COLOR }}>
              <span>Verbleibend</span><span>{left}</span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

// ── Category TP summary tile with tooltip ────────────────────────────────────
export function CatSummaryTile({ charId, cat, index, total, isActive, onClick, mode }: {
  charId: string;
  cat: { key: TalentCategory; color: string; icon: string; label: string };
  index: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
  mode: 'edit' | 'fix';
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
      className="relative flex-1 flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg border transition-colors"
      style={(() => {
        const hasTP = mode === 'fix' && available - spent > 0;
        return {
          borderColor:     hasTP ? '#8B2E2260' : isActive ? `${cat.color}90` : `${cat.color}30`,
          backgroundColor: isActive ? `${cat.color}20` : `${cat.color}08`,
          boxShadow:       hasTP ? '0 0 8px #8B2E2230' : isActive ? `inset 0 -2px 0 ${cat.color}` : 'none',
        };
      })()}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <CatIcon src={cat.icon} size={20} />
      {mode === 'fix' ? (
        available - spent > 0 && (
          <span className="text-[10px] font-mono font-bold leading-none" style={{ color: cat.color }}>
            {available - spent} TP
          </span>
        )
      ) : (
        <span
          className="text-[10px] font-mono font-bold leading-none"
          style={{ color: over ? '#8B2E22' : cat.color }}
        >
          {spent}/{available}
        </span>
      )}

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
              <div className="flex justify-between" style={{ color: job > 0 ? '#3F6B3A' : '#8B2E22' }}>
                <span>Beruf</span>
                <span>{job > 0 ? '+' : ''}{job}</span>
              </div>
            )}
            {spec !== 0 && (
              <div className="flex justify-between" style={{ color: spec > 0 ? '#3F6B3A' : '#8B2E22' }}>
                <span>Spezifikum</span>
                <span>{spec > 0 ? '+' : ''}{spec}</span>
              </div>
            )}
            <div className="border-t border-hairline pt-1 flex justify-between font-bold text-paper">
              <span>Gesamt</span>
              <span>{available}</span>
            </div>
            <div className="flex justify-between" style={{ color: over ? '#8B2E22' : '#3F6B3A' }}>
              <span>Verbraucht</span>
              <span>{spent}</span>
            </div>
            <div className="flex justify-between font-bold" style={{ color: over ? '#8B2E22' : cat.color }}>
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
export function Tab4Talents({ charId, mode }: { charId: string; mode: 'edit' | 'fix' }) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);
  const [selectedTab, setSelectedTab] = useState<TabKey>(TALENT_CATEGORIES[0].key);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showSpecForm, setShowSpecForm]     = useState(false);

  if (!char) return null;

  const isAbilities = selectedTab === 'abilities';
  const activeCat   = isAbilities ? null : TALENT_CATEGORIES.find(c => c.key === selectedTab)!;

  const assignedTalentNames = new Set(
    [char.professionTalent, char.hobby1Talent, char.hobby2Talent].filter(Boolean) as string[]
  );
  const assignedSpecNames = new Set(
    [char.specProfession?.name, char.specFreePositive?.name, char.specFreeNegative?.name, char.specHobby1?.name].filter(Boolean) as string[]
  );

  const customInCat = activeCat
    ? char.customTalents.filter(t => t.category === selectedTab && !assignedTalentNames.has(t.name))
    : [];

  const visibleSpecs: Specification[] = isAbilities ? [] : [
    ...SPECIFICATIONS.filter(s => s.category === (selectedTab as TalentCategory) && !assignedSpecNames.has(s.name)),
    ...char.customSpecifications.filter(s => s.category === (selectedTab as TalentCategory) && !assignedSpecNames.has(s.name)),
  ];

  function selectedAsSpec(name: string): 'frei +' | 'frei −' | null {
    if (char!.specFreePositive?.name === name)  return 'frei +';
    if (char!.specFreeNegative?.name === name)  return 'frei −';
    return null;
  }

  function reservedAsSpec(name: string): 'beruf' | 'hobby' | null {
    if (char!.specProfession?.name === name) return 'beruf';
    if (char!.specHobby1?.name === name)     return 'hobby';
    return null;
  }

  function toggleSpec(spec: Specification) {
    const isMalus = spec.modifier > 0;
    const alreadySelected = !!selectedAsSpec(spec.name);
    patch(charId, c => {
      if (isMalus) {
        c.specFreeNegative = alreadySelected ? null : spec;
      } else {
        c.specFreePositive = alreadySelected ? null : spec;
      }
    });
  }

  return (
    <div className="relative flex flex-col h-full">

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 px-4 pt-4 pb-2 shrink-0">
        {TALENT_CATEGORIES.map((cat, i) => (
          <CatSummaryTile
            key={cat.key}
            charId={charId}
            cat={cat}
            index={i}
            total={TALENT_CATEGORIES.length + 1}
            isActive={selectedTab === cat.key}
            onClick={() => { setSelectedTab(cat.key); setShowCustomForm(false); }}
            mode={mode}
          />
        ))}
        <AbilityTab
          charId={charId}
          isActive={isAbilities}
          onClick={() => { setSelectedTab('abilities'); setShowCustomForm(false); }}
        />
      </div>

      {/* ── Content for selected tab ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isAbilities ? (
          <div className="flex flex-col gap-1.5">
            <SpecialAbilitiesSection charId={charId} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {activeCat!.talents.filter(t => !assignedTalentNames.has(t.name)).map(t => (
              <TalentTile key={t.name} charId={charId} talentName={t.name}
                attrs={t.attrs} costMul={t.costMultiplier} isCustom={false}
                catColor={activeCat!.color} mode={mode} />
            ))}
            {customInCat.map(ct => (
              <TalentTile key={ct.name} charId={charId} talentName={ct.name}
                attrs={ct.attrs} costMul={ct.costMultiplier} isCustom
                catColor={activeCat!.color} mode={mode} />
            ))}

            {showCustomForm ? (
              <div className="col-span-2">
                <CustomTalentForm catKey={selectedTab as TalentCategory} charId={charId} onClose={() => setShowCustomForm(false)} />
              </div>
            ) : (
              <button
                onClick={() => setShowCustomForm(true)}
                className="relative flex items-center justify-center rounded-lg border border-dashed transition-colors hover:opacity-80"
                style={{ borderColor: `${activeCat!.color}40`, backgroundColor: `${activeCat!.color}06`, minHeight: 40 }}
              >
                <span className="text-xl leading-none" style={{ color: `${activeCat!.color}60` }}>+</span>
              </button>
            )}

            {/* ── Spezifika for this category ── */}
            {visibleSpecs.length > 0 && (
              <>
                <div className="col-span-2 flex items-center gap-2 mt-1">
                  <div className="flex-1 h-px" style={{ backgroundColor: `${activeCat!.color}30` }} />
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: `${activeCat!.color}80` }}>Spezifika</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: `${activeCat!.color}30` }} />
                </div>
                {visibleSpecs.map(spec => (
                  <SpecTile
                    key={spec.name}
                    spec={spec}
                    selectedAs={selectedAsSpec(spec.name)}
                    reservedAs={reservedAsSpec(spec.name)}
                    onToggle={() => toggleSpec(spec)}
                    showIcon={false}
                    mode={mode}
                  />
                ))}
                {showSpecForm ? (
                  <div className="col-span-2">
                    <CustomSpecForm charId={charId} onClose={() => setShowSpecForm(false)} />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSpecForm(true)}
                    className="relative flex items-center justify-center rounded-lg border border-dashed transition-colors hover:opacity-80"
                    style={{ borderColor: `${activeCat!.color}40`, backgroundColor: `${activeCat!.color}06`, minHeight: 40 }}
                  >
                    <span className="text-xl leading-none" style={{ color: `${activeCat!.color}60` }}>+</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
