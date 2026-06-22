import { useStore } from '../../store/useStore';
import type { Screen } from '../../types/character';

interface NavItem {
  screen: Screen;
  label: string;
  icon: string;
  requiresActive: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { screen: 'list',   label: 'Charaktere',  icon: '📁', requiresActive: false },
  { screen: 'sheet',  label: 'Charakterbogen', icon: '📄', requiresActive: true },
  { screen: 'play',   label: 'Spielmodus',  icon: '🎲', requiresActive: true },
];

export function BottomNav() {
  const { screen, activeId, setScreen } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-hairline bg-surface"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV_ITEMS.map(item => {
        const active = screen === item.screen;
        const disabled = item.requiresActive && !activeId;
        return (
          <button
            key={item.screen}
            onClick={() => !disabled && setScreen(item.screen)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-sans transition-colors
              ${active ? 'text-paper' : 'text-faint'}
              ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:text-muted'}
            `}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
