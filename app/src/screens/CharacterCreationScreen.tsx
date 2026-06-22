import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { TabGrundinfo }   from '../components/creation/TabGrundinfo';
import { Tab3Attributes } from '../components/creation/Tab3Attributes';
import { Tab4Talents }    from '../components/creation/Tab4Talents';
import { Tab7FreeSpecs }  from '../components/creation/Tab7FreeSpecs';
import { Tab9Overview }   from '../components/creation/Tab9Overview';

// ── Mobile: 5 tabs ────────────────────────────────────────────────────────────
const MOBILE_TABS = [
  { label: 'Grundinfo' },
  { label: 'Attribute' },
  { label: 'Talente'   },
  { label: 'Spezifika' },
  { label: 'Übersicht' },
];

// ── Desktop: 4 always-visible panels (no overview) ───────────────────────────
const DESKTOP_PANELS = ['Grundinfo', 'Attribute', 'Talente', 'Spezifika'] as const;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return isDesktop;
}

function isTabComplete(
  tabIndex: number,
  char: ReturnType<typeof useStore.getState>['characters'][0],
): boolean {
  switch (tabIndex) {
    case 0: return !!char.info.name && !!char.profession;
    case 1: return Object.values(char.attributes).some(v => v > 8);
    default: return true;
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────
export function CharacterCreationScreen() {
  const activeId              = useStore(s => s.activeId);
  const char                  = useStore(s => s.characters.find(c => c.id === activeId));
  const tab                   = useStore(s => s.creationTab);
  const { setCreationTab, setScreen } = useStore();
  const isDesktop             = useIsDesktop();

  if (!char || !activeId) return null;

  // ── Mobile navigation ──────────────────────────────────────────────────────
  function handleNext() {
    if (tab < MOBILE_TABS.length - 1) setCreationTab(tab + 1);
    else setScreen('sheet');
  }

  function handleBack() {
    if (tab > 0) setCreationTab(tab - 1);
    else setScreen('list');
  }

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Desktop: 4 panels side by side ── */}
      {isDesktop && (
        <>
          {/* Header */}
          <header className="shrink-0 flex items-center gap-4 px-4 py-3 bg-surface border-b border-hairline">
            <button
              onClick={() => setScreen('list')}
              className="text-faint hover:text-muted transition-colors text-sm"
            >
              ← Liste
            </button>
            <span className="font-display text-base text-paper flex-1 truncate">
              {char.info.name || 'Neuer Charakter'}
            </span>
            <button
              onClick={() => setScreen('sheet')}
              className="text-xs text-muted hover:text-primary transition-colors border border-hairline rounded px-3 py-1.5"
            >
              Charakterbogen →
            </button>
          </header>

          {/* Panel column headers */}
          <div className="shrink-0 flex border-b border-hairline bg-surface/60">
            {DESKTOP_PANELS.map(label => (
              <div
                key={label}
                className="flex-1 px-3 py-1.5 text-[10px] text-faint font-medium tracking-widest uppercase text-center border-r border-hairline last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          {/* 4 panels */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 min-w-0 overflow-y-auto border-r border-hairline">
              <TabGrundinfo charId={activeId} />
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto border-r border-hairline">
              <Tab3Attributes charId={activeId} />
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto border-r border-hairline">
              <Tab4Talents charId={activeId} />
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto">
              <Tab7FreeSpecs charId={activeId} />
            </div>
          </div>
        </>
      )}

      {/* ── Mobile: single tab with progress + nav ── */}
      {!isDesktop && (
        <>
          {/* Header */}
          <header className="shrink-0 px-4 pt-4 pb-3 bg-surface border-b border-hairline">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setScreen('list')}
                className="text-faint hover:text-muted transition-colors text-sm shrink-0"
              >
                ← Liste
              </button>
              <span className="flex-1 font-display text-sm text-paper truncate">
                {char.info.name || 'Neuer Charakter'}
              </span>
              <span className="text-xs font-mono text-faint shrink-0">
                {tab + 1}/{MOBILE_TABS.length}
              </span>
            </div>

            {/* Progress segments */}
            <div className="flex gap-1">
              {MOBILE_TABS.map((t, i) => {
                const done    = isTabComplete(i, char);
                const active  = i === tab;
                const visited = i < tab;
                return (
                  <button
                    key={i}
                    onClick={() => setCreationTab(i)}
                    className="flex-1 flex flex-col items-center gap-0.5"
                    aria-label={`Tab ${i + 1}: ${t.label}`}
                  >
                    <div className={`h-1 w-full rounded-full transition-all ${
                      active            ? 'bg-paper'
                      : done && visited ? 'bg-paper/50'
                      : visited         ? 'bg-paper/30'
                      : 'bg-hairline'
                    }`} />
                    {active && (
                      <span className="text-[9px] text-paper font-medium tracking-wide leading-none mt-0.5">
                        {t.label.toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </header>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {tab === 0 && <TabGrundinfo charId={activeId} />}
            {tab === 1 && <Tab3Attributes charId={activeId} />}
            {tab === 2 && <Tab4Talents charId={activeId} />}
            {tab === 3 && <Tab7FreeSpecs charId={activeId} />}
            {tab === 4 && <Tab9Overview charId={activeId} />}
          </div>

          {/* Footer navigation */}
          <footer className="shrink-0 flex gap-2 px-4 py-3 border-t border-hairline bg-surface">
            <button
              onClick={handleBack}
              className="flex-1 py-2.5 border border-hairline rounded-lg text-sm text-muted hover:text-primary transition-colors"
            >
              {tab === 0 ? '← Liste' : '← Zurück'}
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 bg-paper text-bg rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {tab === MOBILE_TABS.length - 1 ? 'Abschließen ✓' : 'Weiter →'}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
