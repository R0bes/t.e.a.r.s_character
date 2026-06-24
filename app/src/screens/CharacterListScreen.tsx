import { useStore } from '../store/useStore';
import type { Character } from '../types/character';
import { PROFESSION_MAP } from '../data/professions';
import { ATTRIBUTES } from '../data/attributes';

function CharacterCard({ char, index }: { char: Character; index: number }) {
  const { setActiveId, setScreen, deleteCharacter, duplicateCharacter, exportCharacter } = useStore();
  const prof = char.profession ? PROFESSION_MAP[char.profession] : null;

  const catColor = char.profession ? getCategoryColor(char.profession) : '#5A5D66';

  function open() {
    setActiveId(char.id);
    setScreen('sheet');
  }

  return (
    <div
      className="relative bg-surface border border-hairline rounded-lg overflow-hidden cursor-pointer hover:border-muted transition-colors"
      onClick={open}
    >
      {/* Category color stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: catColor }} />

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-faint">#{String(index + 1).padStart(3, '0')}</span>
              <span className="font-display text-lg text-primary truncate">
                {char.info.name || 'Unbenannt'}
              </span>
            </div>
            <div className="text-xs text-muted mt-0.5">
              {char.info.professionName || prof?.label || '—'}
            </div>
          </div>
          {/* Attribute preview dots */}
          <div className="flex gap-1 shrink-0 mt-1">
            {ATTRIBUTES.map(attr => (
              <div
                key={attr.key}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: attr.color }}
                title={`${attr.key}: ${char.attributes[attr.key]}`}
              />
            ))}
          </div>
        </div>

        {/* Actions row */}
        <div
          className="flex gap-2 mt-2 pt-2 border-t border-hairline"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setActiveId(char.id); setScreen('creation'); }}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => duplicateCharacter(char.id)}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Duplizieren
          </button>
          <button
            onClick={() => exportCharacter(char.id)}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => {
              if (confirm(`"${char.info.name || 'Unbenannt'}" wirklich löschen?`)) {
                deleteCharacter(char.id);
              }
            }}
            className="text-xs text-danger hover:opacity-80 transition-opacity ml-auto"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

function getCategoryColor(prof: string): string {
  const map: Record<string, string> = {
    koerperlich: '#D05020', handwerklich: '#C89A10', kundenkontakt: '#189898',
    kreativ: '#CC2888', denkend: '#1E58C8', militaerisch: '#608030',
    medizinisch: '#208838', arbeitslos: '#7030B0',
  };
  return map[prof] ?? '#5A5D66';
}

export function CharacterListScreen() {
  const { characters, createCharacter, importCharacter } = useStore();

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      importCharacter(text);
    };
    input.click();
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <header className="shrink-0 px-4 pt-safe-top pt-4 pb-3 flex items-center justify-between border-b border-hairline">
        <h1 className="font-display text-2xl font-semibold text-paper tracking-wide">T.E.A.R.S.</h1>
        <button
          onClick={handleImport}
          className="text-xs text-muted hover:text-primary transition-colors px-2 py-1 border border-hairline rounded"
        >
          Import
        </button>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
            <div className="text-6xl opacity-20">📁</div>
            <div>
              <p className="text-primary font-medium">Keine Akten vorhanden</p>
              <p className="text-muted text-sm mt-1">Erstelle deinen ersten Charakter</p>
            </div>
          </div>
        ) : (
          characters.map((char, i) => (
            <CharacterCard key={char.id} char={char} index={i} />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={createCharacter}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-paper text-bg font-bold text-2xl shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform z-40"
        aria-label="Neue Akte"
      >
        +
      </button>
    </div>
  );
}
