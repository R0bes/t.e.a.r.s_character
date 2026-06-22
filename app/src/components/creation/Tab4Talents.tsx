import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TALENT_CATEGORIES } from '../../data/talents';
import {
  talentAvailable, talentSpent, talentLeft, talentCanIncrease,
  talentFixedBonus, talentJobPts, BASE_TALENT_PTS,
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
    <div className="mt-1.5 bg-raised/40 rounded-lg px-3 py-3 space-y-2.5 border border-hairline/60">
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

// ── Talent tile (2-per-row) ───────────────────────────────────────────────────
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
      className="flex flex-col gap-1.5 p-2 rounded-lg border transition-colors"
      style={{ backgroundColor: tileBg, borderColor: tileBorder }}
    >
      {/* Name + icon row */}
      <div className="flex items-start gap-1">
        <span className="text-[9px] leading-none shrink-0 mt-0.5">{catIcon}</span>
        <span className="text-[11px] font-medium text-primary leading-tight line-clamp-2 flex-1 min-w-0">
          {talentName}
        </span>
        {lvIcon && <span className={`text-[9px] shrink-0 leading-none ${lvIcon.cls}`}>{lvIcon.icon}</span>}
        {isCustom && <span className="text-[7px] text-warn shrink-0">SL</span>}
      </div>

      {/* Attr chips */}
      <div className="flex items-center gap-1 flex-wrap min-h-[11px]">
        {isCombat
          ? <span className="text-[8px] font-mono text-faint">×2</span>
          : attrs?.map((a, i) => (
              <span key={i} className="text-[8px] font-mono font-bold leading-none"
                style={{ color: ATTR_COLOR[a as AttributeKey] }}>{a}</span>
            ))
        }
        {isProfTal && <span className="text-[7px] font-mono text-paper/60 ml-auto">Beruf</span>}
        {isHobby1  && <span className="text-[7px] font-mono text-paper/60 ml-auto">H1</span>}
        {isHobby2  && <span className="text-[7px] font-mono text-paper/60 ml-auto">H2</span>}
      </div>

      {/* Stepper — shows effective total directly */}
      <div className="flex items-center justify-between mt-auto">
        <button
          onClick={() => patch(charId, c => { c.talents[talentName] = Math.max(0, stored - 1); })}
          disabled={!canDec}
          className="w-5 h-5 flex items-center justify-center rounded border border-hairline text-xs text-muted hover:text-primary disabled:opacity-25 transition-colors"
        >−</button>
        <span className="text-sm font-mono font-bold text-primary">{effective}</span>
        <button
          onClick={() => patch(charId, c => { c.talents[talentName] = stored + 1; })}
          disabled={!canInc}
          className="w-5 h-5 flex items-center justify-center rounded border border-hairline text-xs text-muted hover:text-primary disabled:opacity-25 transition-colors"
        >+</button>
      </div>
    </div>
  );
}

// ── Add-talent tile ───────────────────────────────────────────────────────────
function AddTalentTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg border border-dashed border-hairline text-faint hover:text-muted hover:border-muted transition-colors min-h-[60px]"
    >
      <span className="text-base leading-none">+</span>
      <span className="text-[8px] text-center leading-tight">Eigenes{'\n'}Talent</span>
    </button>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({ charId, catKey, isOpen, onOpen }: {
  charId: string; catKey: TalentCategory; isOpen: boolean; onOpen: () => void;
}) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [showCustomForm, setShowCustomForm] = useState(false);

  if (!char) return null;

  const catMeta     = TALENT_CATEGORIES.find(c => c.key === catKey)!;
  const available   = talentAvailable(char, catKey);
  const spent       = talentSpent(char, catKey);
  const left        = talentLeft(char, catKey);
  const jobBonus    = talentJobPts(char, catKey);
  const customInCat = char.customTalents.filter(t => t.category === catKey);

  const budgetLabel = jobBonus > 0
    ? `${BASE_TALENT_PTS}+${jobBonus}=${available}`
    : `${available}`;

  return (
    <div className="rounded-lg overflow-hidden border border-hairline">
      <button
        onClick={onOpen}
        className="w-full px-3 py-2.5 flex items-center gap-2 transition-colors hover:bg-white/5"
        style={{ backgroundColor: `${catMeta.color}18` }}
      >
        <div className="w-1.5 h-4 rounded-full shrink-0" style={{ backgroundColor: catMeta.color }} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: catMeta.color }}>
            {catMeta.label}
          </span>
          {jobBonus > 0 && (
            <span className="ml-1.5 text-[9px] text-faint">{budgetLabel}</span>
          )}
        </div>
        <span className={`font-mono text-sm font-bold ${
          left < 0 ? 'text-danger' : left === 0 ? 'text-success' : 'text-paper'
        }`}>
          {left}/{available}
        </span>
        <span className="text-faint text-xs ml-1 shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-hairline">
          <div className="px-3 py-1.5 bg-bg/50 border-b border-hairline">
            <PointsBar total={available} used={spent} color={catMeta.color} />
          </div>
          <div className="p-2 bg-bg/60">
            <div className="grid grid-cols-2 gap-1.5">
              {catMeta.talents.map(t => (
                <TalentTile key={t.name} charId={charId} talentName={t.name}
                  attrs={t.attrs} costMul={t.costMultiplier} isCustom={false}
                  catColor={catMeta.color} catIcon={catMeta.icon} />
              ))}
              {customInCat.map(ct => (
                <TalentTile key={ct.name} charId={charId} talentName={ct.name}
                  attrs={ct.attrs} costMul={ct.costMultiplier} isCustom
                  catColor={catMeta.color} catIcon={catMeta.icon} />
              ))}
              {!showCustomForm && (
                <AddTalentTile onClick={() => setShowCustomForm(true)} />
              )}
            </div>

            {showCustomForm && (
              <CustomTalentForm catKey={catKey} catLabel={catMeta.label} charId={charId}
                onClose={() => setShowCustomForm(false)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Special abilities section (fits accordion pattern) ────────────────────────
function SpecialAbilitiesSection({ charId, isOpen, onOpen }: {
  charId: string; isOpen: boolean; onOpen: () => void;
}) {
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
    <div className="rounded-lg overflow-hidden border border-hairline">
      <button
        onClick={onOpen}
        className="w-full px-3 py-2.5 flex items-center gap-2 transition-colors hover:bg-white/5 bg-paper/5"
      >
        <div className="w-1.5 h-4 rounded-full shrink-0 bg-paper/50" />
        <span className="flex-1 text-xs font-bold tracking-wider uppercase text-paper/70 text-left">
          Besondere Fähigkeiten
        </span>
        <span className={`font-mono text-sm font-bold ${left < 0 ? 'text-danger' : 'text-paper'}`}>
          {left}/{VARIABLE_PTS}
        </span>
        <span className="text-faint text-xs ml-1 shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-hairline">
          <div className="px-3 py-1.5 bg-bg/50 border-b border-hairline">
            <PointsBar total={VARIABLE_PTS} used={spent} color="#E8E1CF" />
          </div>
          <div className="p-2 bg-bg/60">
            <div className="grid grid-cols-2 gap-1.5">
              {SPECIAL_ABILITIES.map(ability => {
                const active    = char.specialAbilities.includes(ability.id);
                const canAfford = left >= ability.cost;
                return (
                  <button
                    key={ability.id}
                    onClick={() => toggle(ability.id)}
                    disabled={!active && !canAfford}
                    className={`flex flex-col gap-1.5 p-1.5 rounded-lg border text-left transition-colors min-h-[60px] ${
                      active
                        ? 'border-paper/40 bg-paper/10 text-primary'
                        : canAfford
                          ? 'border-hairline bg-bg hover:bg-raised/30 text-muted'
                          : 'border-hairline/30 bg-bg text-faint opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-tight line-clamp-2 flex-1">
                      {ability.name}
                    </span>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[8px] font-mono text-faint">{ability.cost}P</span>
                      {active && <span className="text-[9px] text-paper font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Tab4Talents({ charId }: { charId: string }) {
  const char = useStore(s => s.characters.find(c => c.id === charId));
  const [openCat, setOpenCat] = useState<TalentCategory | 'abilities'>(TALENT_CATEGORIES[0].key);

  if (!char) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {TALENT_CATEGORIES.map(cat => (
        <CategorySection
          key={cat.key}
          charId={charId}
          catKey={cat.key}
          isOpen={openCat === cat.key}
          onOpen={() => setOpenCat(cat.key)}
        />
      ))}
      <SpecialAbilitiesSection
        charId={charId}
        isOpen={openCat === 'abilities'}
        onOpen={() => setOpenCat('abilities')}
      />
    </div>
  );
}
