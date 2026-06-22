import { useStore } from '../store/useStore';
import { ATTRIBUTES } from '../data/attributes';
import { PROFESSION_MAP } from '../data/professions';
import { TALENT_CATEGORIES } from '../data/talents';
import { ABILITY_MAP } from '../data/specialAbilities';
import { calcDerived, calcATN, calcPA, calcATD, calcINI } from '../rules/derivedValues';
import { SpiderChart } from '../components/ui/SpiderChart';
import type { SpiderAxis } from '../components/ui/SpiderChart';
import { AttributeChip } from '../components/ui/AttributeChip';

const DERIVED_LABELS: Record<string, string> = {
  ATN: 'Nahkampf', PA: 'Parade', ATD: 'Distanz', INI: 'Initiative', LE: 'Lebensenergie', GG: 'Geist. Gesundheit',
};

export function CharacterSheetScreen() {
  const activeId = useStore(s => s.activeId);
  const char = useStore(s => s.characters.find(c => c.id === activeId));
  const { setScreen, exportCharacter } = useStore();

  if (!char) return null;

  const prof = char.profession ? PROFESSION_MAP[char.profession] : null;
  const derived = calcDerived(char);

  // 10-axis radar: 6 primary attrs + 4 combat attrs, max=20
  const CHART_MAX = 20;
  const radarAxes: SpiderAxis[] = [
    // Primary attributes (clockwise from top)
    { key: 'KK',  value: char.attributes.KK,  maxValue: CHART_MAX, color: '#D1453B' },
    { key: 'GE',  value: char.attributes.GE,  maxValue: CHART_MAX, color: '#3E7FCE' },
    { key: 'AU',  value: char.attributes.AU,  maxValue: CHART_MAX, color: '#4FA968' },
    { key: 'CH',  value: char.attributes.CH,  maxValue: CHART_MAX, color: '#D45C95' },
    { key: 'IN',  value: char.attributes.IN,  maxValue: CHART_MAX, color: '#8C5FC4' },
    { key: 'MB',  value: char.attributes.MB,  maxValue: CHART_MAX, color: '#E08C3C' },
    // Combat attributes (derived, lower half)
    { key: 'ATN', value: calcATN(char), maxValue: CHART_MAX, color: '#D4724A' },
    { key: 'PA',  value: calcPA(char),  maxValue: CHART_MAX, color: '#5BA888' },
    { key: 'ATD', value: calcATD(char), maxValue: CHART_MAX, color: '#5AAACE' },
    { key: 'INI', value: calcINI(char), maxValue: CHART_MAX, color: '#C4A030' },
  ];

  const initials = char.info.name
    ? char.info.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const allSpecs = [
    char.specProfession && { ...char.specProfession, label: 'Beruf (Pflicht)' },
    char.specHobby1 && { ...char.specHobby1, label: 'Hobby 1' },
    char.specFreePositive && { ...char.specFreePositive, label: 'Positiv' },
    char.specFreeNegative && { ...char.specFreeNegative, label: 'Negativ' },
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <header className="shrink-0 bg-surface border-b border-hairline px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-raised border border-hairline flex items-center justify-center shrink-0">
            <span className="font-display text-xl text-paper">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl text-paper leading-tight truncate">{char.info.name || 'Unbenannt'}</h1>
            <p className="text-sm text-muted truncate">{char.info.professionName || prof?.label || '—'}</p>
            <div className="flex gap-2 text-xs text-faint mt-0.5">
              {char.info.age && <span>{char.info.age} J.</span>}
              {char.info.height && <span>{char.info.height} cm</span>}
              {char.info.gender && <span>{char.info.gender}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setScreen('creation')}
            className="flex-1 py-1.5 text-xs border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => exportCharacter(char.id)}
            className="py-1.5 px-3 text-xs border border-hairline rounded text-muted hover:text-primary hover:border-muted transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => setScreen('play')}
            className="flex-1 py-1.5 text-xs bg-paper text-bg font-medium rounded hover:opacity-90 transition-opacity"
          >
            Los geht's →
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">

        {/* 10-axis radar: 6 primary + 4 combat */}
        <div className="bg-surface border border-hairline rounded-lg p-6 flex justify-center">
          <SpiderChart
            axes={radarAxes}
            size={280}
            gridValues={[5, 10, 15, 20]}
            showGridLabels
            showAxisLabels
            chartId="sheet"
          />
        </div>

        {/* Attributes */}
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Attribute</p>
          <div className="space-y-2">
            {ATTRIBUTES.map(attr => {
              const val = char.attributes[attr.key];
              const pct = (val / 19) * 100;
              return (
                <div key={attr.key} className="flex items-center gap-3">
                  <span className="font-mono text-xs w-6" style={{ color: attr.color }}>{attr.key}</span>
                  <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: attr.color }}
                    />
                  </div>
                  <span className="font-mono text-sm text-primary w-5 text-right">{val}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Derived values */}
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Abgeleitete Werte</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(derived).map(([key, val]) => (
              <div key={key} className="bg-raised border border-hairline rounded p-2 text-center">
                <div className="font-mono text-xs text-muted">{key}</div>
                <div className="font-mono text-xl text-primary font-medium">{val}</div>
                <div className="text-[10px] text-faint">{DERIVED_LABELS[key]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Talents */}
        <div className="bg-surface border border-hairline rounded-lg p-3">
          <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Talente</p>
          {TALENT_CATEGORIES.map(cat => {
            const learned = cat.talents.filter(t => (char.talents[t.name] ?? 0) > 0);
            if (learned.length === 0) return null;
            return (
              <div key={cat.key} className="mb-3 last:mb-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium" style={{ color: cat.color }}>{cat.label}</span>
                </div>
                <div className="space-y-1 ml-3">
                  {learned.map(t => {
                    const val = char.talents[t.name] ?? 0;
                    return (
                      <div key={t.name} className="flex items-center gap-2">
                        <span className="text-sm text-primary flex-1">{t.name}</span>
                        {t.attrs && (
                          <div className="flex gap-0.5">
                            {t.attrs.map((a, i) => <AttributeChip key={i} attr={a} size="xs" />)}
                          </div>
                        )}
                        <span className="font-mono text-sm text-paper w-4 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Specifications */}
        {allSpecs.length > 0 && (
          <div className="bg-surface border border-hairline rounded-lg p-3">
            <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Spezifika</p>
            <div className="space-y-2">
              {allSpecs.map((s, i) => s && (
                <div key={i} className={`flex items-start gap-2 p-2 rounded border ${s.modifier > 0 ? 'border-danger/30 bg-danger/5' : 'border-success/30 bg-success/5'}`}>
                  <span className={`font-mono text-xs mt-0.5 shrink-0 ${s.modifier > 0 ? 'text-danger' : 'text-success'}`}>
                    {s.modifier > 0 ? `+${s.modifier}` : s.modifier}
                  </span>
                  <div>
                    <span className="text-sm text-primary">{s.name}</span>
                    <span className="text-xs text-faint ml-2">({s.label})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special abilities */}
        {char.specialAbilities.length > 0 && (
          <div className="bg-surface border border-hairline rounded-lg p-3">
            <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">Besondere Fähigkeiten</p>
            <div className="flex flex-wrap gap-2">
              {char.specialAbilities.map(id => (
                <span key={id} className="text-sm text-primary bg-raised px-2 py-1 rounded border border-hairline">
                  {ABILITY_MAP[id]?.name ?? id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
