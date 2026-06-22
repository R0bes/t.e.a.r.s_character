import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, Screen } from '../types/character';
import { freshAttributes } from '../data/attributes';
import { calcLE, calcGG } from '../rules/derivedValues';

interface ToastMessage {
  id: string;
  message: string;
  type: 'ok' | 'warn' | 'err';
}

interface AppState {
  characters: Character[];
  activeId: string | null;
  screen: Screen;
  creationTab: number;
  toasts: ToastMessage[];
}

interface AppActions {
  createCharacter: () => string;
  patchCharacter: (id: string, updater: (c: Character) => void) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => void;
  setActiveId: (id: string | null) => void;
  setScreen: (screen: Screen) => void;
  setCreationTab: (tab: number) => void;
  exportCharacter: (id: string) => void;
  importCharacter: (json: string) => boolean;
  showToast: (message: string, type?: 'ok' | 'warn' | 'err') => void;
  dismissToast: (id: string) => void;
  getActive: () => Character | undefined;
}

function freshCharacter(id: string): Character {
  const attrs = freshAttributes();
  return {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    info: { name: '', gender: '', age: '', height: '', weight: '', professionName: '' },
    profession: null,
    attributes: attrs,
    talents: {},
    customTalents: [],
    hobby1Name: '',
    hobby2Name: '',
    hobby1Talent: null,
    hobby2Talent: null,
    professionTalent: null,
    specProfession: null,
    specHobby1: null,
    specFreePositive: null,
    specFreeNegative: null,
    customSpecifications: [],
    specialAbilities: [],
    currentLE: (attrs.KK * 2 + attrs.AU) * 3,
    currentGG: (attrs.AU + attrs.IN + attrs.MB * 2) * 3,
    inventory: [],
    notes: [],
  };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const useStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      characters: [],
      activeId: null,
      screen: 'list',
      creationTab: 0,
      toasts: [],

      createCharacter: () => {
        const id = crypto.randomUUID();
        const char = freshCharacter(id);
        set(s => ({ characters: [...s.characters, char], activeId: id, screen: 'creation', creationTab: 0 }));
        return id;
      },

      patchCharacter: (id, updater) => {
        set(s => ({
          characters: s.characters.map(c => {
            if (c.id !== id) return c;
            const copy = deepClone(c);
            updater(copy);
            copy.updatedAt = Date.now();
            // keep currentLE/GG in sync with attributes if never manually changed
            copy.currentLE = calcLE(copy);
            copy.currentGG = calcGG(copy);
            return copy;
          }),
        }));
      },

      deleteCharacter: (id) => {
        set(s => {
          const characters = s.characters.filter(c => c.id !== id);
          const activeId = s.activeId === id ? (characters[0]?.id ?? null) : s.activeId;
          const screen: Screen = activeId === null ? 'list' : s.screen === 'creation' ? 'list' : s.screen;
          return { characters, activeId, screen };
        });
      },

      duplicateCharacter: (id) => {
        const original = get().characters.find(c => c.id === id);
        if (!original) return;
        const copy = deepClone(original);
        copy.id = crypto.randomUUID();
        copy.createdAt = Date.now();
        copy.updatedAt = Date.now();
        copy.info = { ...copy.info, name: copy.info.name + ' (Kopie)' };
        set(s => ({ characters: [...s.characters, copy] }));
      },

      setActiveId: (id) => set({ activeId: id }),

      setScreen: (screen) => set({ screen }),

      setCreationTab: (tab) => set({ creationTab: tab }),

      exportCharacter: (id) => {
        const char = get().characters.find(c => c.id === id);
        if (!char) return;
        const json = JSON.stringify(char, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tears_${char.info.name || 'charakter'}_${id.slice(0, 6)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        get().showToast('Charakter exportiert', 'ok');
      },

      importCharacter: (json) => {
        try {
          const char = JSON.parse(json) as Character;
          if (!char.id || !char.attributes) throw new Error('Ungültiges Format');
          char.id = crypto.randomUUID();
          char.createdAt = Date.now();
          char.updatedAt = Date.now();
          set(s => ({ characters: [...s.characters, char] }));
          get().showToast('Charakter importiert', 'ok');
          return true;
        } catch {
          get().showToast('Import fehlgeschlagen', 'err');
          return false;
        }
      },

      showToast: (message, type = 'ok') => {
        const id = crypto.randomUUID();
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => get().dismissToast(id), 3000);
      },

      dismissToast: (id) => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
      },

      getActive: () => {
        const { characters, activeId } = get();
        return characters.find(c => c.id === activeId);
      },
    }),
    {
      name: 'tears_v5',
      partialize: (s) => ({ characters: s.characters, activeId: s.activeId }),
    }
  )
);
