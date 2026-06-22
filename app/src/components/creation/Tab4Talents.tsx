import { useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { TALENT_CATEGORIES } from '../../data/talents';
import {
  talentAvailable, talentSpent, talentLeft, talentCanIncrease,
  talentFixedBonus, talentSpecBonusBreakdown, BASE_TALENT_PTS,
  varPtsLeft, varPtsSpent,
} from '../../rules/talentBudget';
import { SPECIAL_ABILITIES } from '../../data/specialAbilities';
import { VARIABLE_PTS } from '../../data/professions';
import type { AttributeKey, TalentCategory } from '../../types/character';
import { PointsBar } from '../ui/PointsBar';

const ATTR_KEYS: AttributeKey[] = ['KK', 'GE', 'AU', 'CH', 'IN', 'MB'];

const ATTR_COLOR: Record<AttributeKey, string> = {
  KK: '#D1453B', GE: '#3E7FCE', AU: '#4FA968',
  CH: '#D45C95', IN: '#8C5FC4', MB: '#E08C3C',
};

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
function CustomTalentForm({ catKey, catLabel, charId, onClose }: {
  catKey: TalentCategory; catLabel: string; charId: string; onClose: () => void;
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
      <p className="text-[10px] text-warn font-medium">Neues Talent — {catLabel} (SL-Absprache)</p>
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
      {mode === 'normal' ? (
        <div className="flex gap-1.5">
          {([0, 1, 2] as const).map(i => (
            <select key={i} value={attrs[i]} onChange={e => setAttr(i, e.target.value as AttributeKey)}
              className="flex-1 bg-bg border border-hairline rounded px-1 py-1 text-primary text-xs focus:outline-none">
              {ATTR_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-faint italic">
          Bezieht sich auf Kampfattribute — keine Primärattributbindung.
        </p>
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

function levelIcon(effective: number): { icon: string; cls: string } | null {
  if (effective === 0)  return null;
  if (effective <= 4)   return { icon: '◦', cls: 'text-warn'    };
  if (effective <= 9)   return { icon: '◆', cls: 'text-muted'   };
  return                       { icon: '★', cls: 'text-success'  };
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
  const lvIcon     = levelIcon(effective);

  const isSpecial  = isHobby1 || isHobby2 || isProfTal;
  const tileBg     = `${catColor}10`;
  const tileBorder = isSpecial ? `${catColor}60` : `${catColor}28`;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors"
      style={{ backgroundColor: tileBg, borderColor: tileBorder }}
    >
      <span className="text-[10px] leading-none shrink-0">{catIcon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-primary leading-tight truncate flex-1 min-w-0">
            {talentName}
          </span>
          {isCustom  && <span className="text-[7px] text-warn shrink-0">SL</span>}
          {lvIcon    && <span className={`text-[9px] shrink-0 leading-none ${lvIcon.cls}`}>{lvIcon.icon}</span>}
          {isProfTal && <span className="text-[7px] font-mono text-paper/50 shrink-0">Beruf</span>}
          {isHobby1  && <span className="text-[7px] font-mono text-paper/50 shrink-0">H1</span>}
          {isHobby2  && <span className="text-[7px] font-mono text-paper/50 shrink-0">H2</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isCombat
            ? <span className="text-[8px] font-mono text-faint">×2</span>
            : attrs?.map((a, i) => (
                <span key={i} className="text-[8px] font-mono font-bold leading-none"
                  style={{ color: ATTR_COLOR[a as AttributeKey] }}>{a}</span>
              ))
          }
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => patch(charId, c => { c.talents[talentName] = Math.max(0, stored - 1); })}
          disabled={!canDec}
          className="w-6 h-6 flex items-center justify-center rounded border border-hairline text-xs text-muted hover:text-primary disabled:opacity-25 transition-colors"
        >−</button>
        <span className="text-sm font-mono font-bold text-primary w-6 text-center">{effective}</span>
        <button
          onClick={() => patch(charId, c => { c.talents[talentName] = stored + 1; })}
          disabled={!canInc}
          className="w-6 h-6 flex items-center justify-center rounded border border-hairline text-xs text-muted hover:text-primary disabled:opacity-25 transition-colors"
        >+</button>
      </div>
    </div>
  );
}

// ── Category header row ───────────────────────────────────────────────────────
function CategoryHeaderRow({ charId, catKey }: { charId: string; catKey: TalentCategory }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  if (!char) return null;

  const catMeta = TALENT_CATEGORIES.find(c => c.key === catKey)!;
  const available = talentAvailable(char, catKey);
  const spent     = talentSpent(char, catKey);
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
      <span className="text-base leading-none shrink-0">{catMeta.icon}</span>
      <span className="text-xs font-bold tracking-wider uppercase flex-1 min-w-0 truncate" style={{ color: catMeta.color }}>
        {catMeta.label}
      </span>
      <div className="w-16 shrink-0">
        <PointsBar total={available} used={spent} color={catMeta.color} />
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
  const spent = varPtsSpent(char);

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
        <div className="w-16 shrink-0">
          <PointsBar total={VARIABLE_PTS} used={spent} color="#E8E1CF" />
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
                catColor={cat.color} catIcon={cat.icon} />
            ))}
            {customInCat.map(ct => (
              <TalentTile key={ct.name} charId={charId} talentName={ct.name}
                attrs={ct.attrs} costMul={ct.costMultiplier} isCustom
                catColor={cat.color} catIcon={cat.icon} />
            ))}

            {openCustomForm === cat.key ? (
              <CustomTalentForm catKey={cat.key} catLabel={cat.label} charId={charId}
                onClose={() => setOpenCustomForm(null)} />
            ) : (
              <button
                onClick={() => setOpenCustomForm(cat.key)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors"
              >
                <span className="text-sm leading-none">+</span>
                <span className="text-xs">Eigenes Talent ({cat.label})</span>
              </button>
            )}
          </div>
        );
      })}

      <SpecialAbilitiesSection charId={charId} />
    </div>
  );
}
