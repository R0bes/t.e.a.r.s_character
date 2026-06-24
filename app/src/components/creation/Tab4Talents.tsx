import { useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { TALENT_CATEGORIES } from '../../data/talents';
import { CatIcon } from '../ui/CatIcon';
import {
  talentAvailable, talentLeft, talentCanIncrease,
  talentFixedBonus, talentSpecBonusBreakdown, BASE_TALENT_PTS,
  varPtsLeft,
} from '../../rules/talentBudget';
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


// ── Small info popup ──────────────────────────────────────────────────────────
function InfoPop({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-4 h-4 rounded-full border border-hairline/60 text-[7px] text-faint flex items-center justify-center hover:text-muted hover:border-muted transition-colors leading-none"
      >i</button>
      {open && (
        <span
          className="absolute right-0 top-full mt-1.5 z-20 bg-raised border border-hairline rounded-lg px-2.5 py-2 text-[9px] font-mono text-primary shadow-xl min-w-[160px] leading-relaxed"
          onClick={() => setOpen(false)}
        >
          {children}
        </span>
      )}
    </span>
  );
}

// ── Custom Talent Form ────────────────────────────────────────────────────────
function CustomTalentForm({ catKey, charId, onClose }: {
  catKey: TalentCategory; charId: string; onClose: () => void;
}) {
  const patch = useStore(s => s.patchCharacter);
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const [name, setName]   = useState('');
  const [mode, setMode]   = useState<'normal' | 'combat'>('normal');
  const [attrs, setAttrs] = useState<[AttributeKey, AttributeKey, AttributeKey]>(['KK', 'GE', 'AU']);

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
function TalentTile({ charId, talentName, attrs, costMul, isCustom, catColor }: {
  charId: string;
  talentName: string;
  attrs: readonly AttributeKey[] | null;
  costMul: 1 | 2;
  isCustom: boolean;
  catColor: string;
}) {
  const char  = useStore(s => s.characters.find(c => c.id === charId));
  const patch = useStore(s => s.patchCharacter);

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
  const tileBg     = `${catColor}10`;
  const tileBorder = isSpecial ? `${catColor}60` : `${catColor}28`;
  const srcLabel   = isProfTal ? 'Beruf' : isHobby1 ? '1. Hobby' : isHobby2 ? '2. Hobby' : null;

  return (
    <div
      className="relative flex flex-col gap-1.5 px-2 py-1.5 rounded-lg border transition-colors overflow-hidden"
      style={{ backgroundColor: tileBg, borderColor: tileBorder }}
    >
      {/* Titel */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-base font-semibold leading-tight truncate" style={{ color: catColor }}>
          {talentName}
        </span>
        {isCustom && <span className="text-[7px] text-warn shrink-0">SL</span>}
      </div>

      {/* Attribute + Wert + Pfeile */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 pl-6">
          {!isCombat && attrs?.map((a, i) => {
            const meta = ATTR_MAP[a as AttributeKey];
            return <CatIcon key={i} src={meta?.icon ?? ''} size={24} />;
          })}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-2xl font-mono font-bold text-primary leading-none">{effective}</span>
          <div className="flex flex-col rounded border border-hairline overflow-hidden">
            <button
              onClick={() => patch(charId, c => { c.talents[talentName] = stored + 1; })}
              disabled={!canInc}
              className="w-7 h-5 flex items-center justify-center border-b border-hairline hover:opacity-80 disabled:opacity-20 transition-opacity"
            >
              <img src={isCombat ? '/icons/attr/arrow_up2.png' : '/icons/attr/arrow_up.png'} className="w-6 h-5 object-contain" />
            </button>
            <button
              onClick={() => patch(charId, c => { c.talents[talentName] = Math.max(0, stored - 1); })}
              disabled={!canDec}
              className="w-7 h-5 flex items-center justify-center hover:opacity-80 disabled:opacity-20 transition-opacity"
              style={{ transform: 'rotate(180deg)' }}
            >
              <img src={isCombat ? '/icons/attr/arrow_up2.png' : '/icons/attr/arrow_up.png'} className="w-6 h-5 object-contain" />
            </button>
          </div>
        </div>
      </div>

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

// ── Category header row ───────────────────────────────────────────────────────
function CategoryHeaderRow({ charId, catKey }: { charId: string; catKey: TalentCategory }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  if (!char) return null;

  const catMeta = TALENT_CATEGORIES.find(c => c.key === catKey)!;
  const available = talentAvailable(char, catKey);
  const left      = talentLeft(char, catKey);
  const { job: jobBonus } = talentSpecBonusBreakdown(char, catKey);

  // Spec names for the tooltip
  const specSources: string[] = [];
  const allSpecs = [char.specProfession, char.specFreePositive, char.specFreeNegative];
  for (const s of allSpecs) {
    if (s && s.category === catKey) {
      const sign = s.modifier > 0 ? '+' : '';
      specSources.push(`${sign}${s.modifier} (${s.name})`);
    }
  }

  const tooltipLines: ReactNode[] = [
    <span key="base">{BASE_TALENT_PTS} TP (Basis)</span>,
  ];
  if (jobBonus !== 0) {
    tooltipLines.push(<span key="job">{jobBonus > 0 ? '+' : ''}{jobBonus} TP (Beruf)</span>);
  }
  for (const src of specSources) {
    tooltipLines.push(<span key={src}>{src} TP (Spez)</span>);
  }
  tooltipLines.push(<span key="total" className="text-paper font-bold">= {available} TP</span>);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border mt-2 first:mt-0"
      style={{ backgroundColor: `${catMeta.color}18`, borderColor: `${catMeta.color}40` }}
    >
      <CatIcon src={catMeta.icon} size={28} />
      <div className="flex-1 min-w-0" />
      <div className="w-20 shrink-0">
        <TpBar left={left} total={available} color={catMeta.color} />
      </div>
      <span className={`font-mono text-sm font-bold shrink-0 ${
        left < 0 ? 'text-danger' : left === 0 ? 'text-success' : 'text-paper'
      }`}>
        {left}/{available}
      </span>
      <InfoPop>
        <div className="flex flex-col gap-0.5">
          {tooltipLines}
        </div>
      </InfoPop>
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

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab4Talents({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [openCustomForm, setOpenCustomForm] = useState<TalentCategory | null>(null);

  if (!char) return null;

  return (
    <div className="flex flex-col gap-1.5 p-4">
      {TALENT_CATEGORIES.map(cat => {
        const customInCat = char.customTalents.filter(t => t.category === cat.key);
        return (
          <div key={cat.key} className="contents">
            <CategoryHeaderRow charId={charId} catKey={cat.key} />

            {cat.talents.map(t => (
              <TalentTile key={t.name} charId={charId} talentName={t.name}
                attrs={t.attrs} costMul={t.costMultiplier} isCustom={false}
                catColor={cat.color} />
            ))}
            {customInCat.map(ct => (
              <TalentTile key={ct.name} charId={charId} talentName={ct.name}
                attrs={ct.attrs} costMul={ct.costMultiplier} isCustom
                catColor={cat.color} />
            ))}

            {openCustomForm === cat.key ? (
              <CustomTalentForm catKey={cat.key} charId={charId}
                onClose={() => setOpenCustomForm(null)} />
            ) : (
              <button
                onClick={() => setOpenCustomForm(cat.key)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors"
              >
                <CatIcon src={cat.icon} size={14} />
                <span className="text-xs">Talent anlegen</span>
              </button>
            )}
          </div>
        );
      })}

      <SpecialAbilitiesSection charId={charId} />
    </div>
  );
}
