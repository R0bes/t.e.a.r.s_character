import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { Tab3Attributes } from '../components/creation/Tab3Attributes';
import { Tab9Overview }   from '../components/creation/Tab9Overview';

// ── Mobile: 2 tabs ────────────────────────────────────────────────────────────
const MOBILE_TABS = [
  { label: 'Charakter' },
  { label: 'Übersicht' },
];

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
  const [mode, setMode]       = useState<'edit' | 'fix'>('edit');
  const toggleMode            = useCallback(() => setMode(m => m === 'edit' ? 'fix' : 'edit'), []);

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

          {/* Panel */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 min-w-0 overflow-y-auto">
              <Tab3Attributes charId={activeId} mode={mode} />
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
            {tab === 0 && <Tab3Attributes charId={activeId} mode={mode} />}
            {tab === 1 && <Tab9Overview charId={activeId} />}
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

      {/* ── Floating mode toggle — fixed, clears mobile footer ── */}
      <button
        onClick={toggleMode}
        className="fixed bottom-20 right-4 lg:bottom-4 z-50 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `1.5px solid ${mode === 'fix' ? '#22c55e60' : '#8C8F9960'}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          transition: 'border-color 0.3s ease',
        }}
        aria-label={mode === 'fix' ? 'Edit-Modus' : 'Fix-Modus'}
      >
        {mode === 'fix' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C8F99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        )}
      </button>
    </div>
  );
}
