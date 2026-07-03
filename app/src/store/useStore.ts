import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, Screen } from '../types/character';
import { freshAttributes } from '../data/attributes';
import { calcLE, calcGG } from '../rules/derivedValues';
import { clampAllCategories } from '../rules/talentBudget';

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
    probeHistory: [],
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

      patchCharacter: (id, updater, _opts) => {
        set(s => ({
          characters: s.characters.map(c => {
            if (c.id !== id) return c;
            const prevLE = calcLE(c);
            const prevGG = calcGG(c);
            const copy = deepClone(c);
            updater(copy);
            // Only clamp when talent budget can have changed (profession, specs, hobby assignments)
            const budgetChanged =
              copy.profession      !== c.profession      ||
              copy.professionTalent !== c.professionTalent ||
              copy.hobby1Talent    !== c.hobby1Talent    ||
              copy.hobby2Talent    !== c.hobby2Talent    ||
              copy.specProfession?.name  !== c.specProfession?.name  ||
              copy.specHobby1?.name      !== c.specHobby1?.name      ||
              copy.specFreePositive?.name !== c.specFreePositive?.name ||
              copy.specFreeNegative?.name !== c.specFreeNegative?.name ||
              copy.customTalents.length  !== c.customTalents.length;
            if (budgetChanged) clampAllCategories(copy);
            copy.updatedAt = Date.now();
            // Sync LE/GG when attributes changed, but clamp rather than reset when manually adjusted
            const newLE = calcLE(copy);
            const newGG = calcGG(copy);
            copy.currentLE = copy.currentLE === prevLE ? newLE : Math.min(copy.currentLE, newLE);
            copy.currentGG = copy.currentGG === prevGG ? newGG : Math.min(copy.currentGG, newGG);
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
          const raw = JSON.parse(json) as Character;
          if (!raw.id || !raw.attributes) throw new Error('Ungültiges Format');
          // Migrate fields that may be missing in older exports
          const char: Character = {
            ...raw,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            inventory:          raw.inventory          ?? [],
            notes:              raw.notes              ?? [],
            customTalents:      raw.customTalents      ?? [],
            customSpecifications: raw.customSpecifications ?? [],
            specialAbilities:   raw.specialAbilities   ?? [],
            probeHistory:       raw.probeHistory       ?? [],
          };
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
