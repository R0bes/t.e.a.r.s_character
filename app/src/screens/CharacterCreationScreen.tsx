import { useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import { Tab3Attributes } from '../components/creation/Tab3Attributes';

export function CharacterCreationScreen() {
  const activeId              = useStore(s => s.activeId);
  const char                  = useStore(s => s.characters.find(c => c.id === activeId));
  const { setScreen }         = useStore();
  const [mode, setMode]       = useState<'edit' | 'fix'>('edit');
  const toggleMode            = useCallback(() => setMode(m => m === 'edit' ? 'fix' : 'edit'), []);

  if (!char || !activeId) return null;

  return (
    <div className="flex flex-col h-full bg-bg">

      {/* ── Sticky header ── */}
      <header className="shrink-0 sticky top-0 z-30 bg-surface border-b border-hairline px-3 py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen('list')}
            className="text-sm text-muted hover:text-primary transition-colors shrink-0 px-2 py-1 rounded border border-hairline hover:border-muted">
            ← Liste
          </button>
          <span className="flex-1 min-w-0 font-bold text-paper text-base text-center truncate">
            {char.info.name || 'Neuer Charakter'}
          </span>
          <button onClick={() => setScreen('sheet')}
            className="px-2 py-1 text-[10px] bg-paper text-bg font-bold rounded hover:opacity-90 transition-opacity shrink-0">
            Fertig →
          </button>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <Tab3Attributes charId={activeId} mode={mode} />
      </div>

      {/* ── Floating mode toggle ── */}
      <button
        onClick={toggleMode}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `1.5px solid ${mode === 'fix' ? '#3F6B3A60' : '#6B523360'}`,
          boxShadow: '0 2px 10px rgba(43,29,16,0.4)',
          transition: 'border-color 0.3s ease',
        }}
        aria-label={mode === 'fix' ? 'Edit-Modus' : 'Fix-Modus'}
      >
        {mode === 'fix' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3F6B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B5233" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        )}
      </button>
    </div>
  );
}
