import { useStore } from './store/useStore';
import { CharacterListScreen } from './screens/CharacterListScreen';
import { CharacterCreationScreen } from './screens/CharacterCreationScreen';
import { CharacterSheetScreen } from './screens/CharacterSheetScreen';
import { PlayScreen } from './screens/PlayScreen';
import { BottomNav } from './components/ui/BottomNav';
import { ToastContainer } from './components/ui/Toast';

export default function App() {
  const screen = useStore(s => s.screen);

  return (
    <div className="h-full flex flex-col bg-bg text-primary font-sans">
      <div className="flex-1 overflow-hidden flex flex-col">
        {screen === 'list'     && <CharacterListScreen />}
        {screen === 'creation' && <CharacterCreationScreen />}
        {screen === 'sheet'    && <CharacterSheetScreen />}
        {screen === 'play'     && <PlayScreen />}
      </div>
      {screen !== 'creation' && <BottomNav />}
      <ToastContainer />
    </div>
  );
}
