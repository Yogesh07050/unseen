import { create } from 'zustand';
import type { Ally, Settings } from './types';
import { DEFAULT_SETTINGS, allAllies, getSettings, saveSettings } from './data/repos';

interface SettingsState {
  settings: Settings | null;
  allies: Ally[];
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  reloadAllies: () => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: null,
  allies: [],
  loaded: false,
  async load() {
    const settings = await getSettings();
    const allies = await allAllies();
    set({ settings, allies, loaded: true });
  },
  async update(patch) {
    const cur = get().settings ?? DEFAULT_SETTINGS;
    const next = { ...cur, ...patch };
    await saveSettings(next);
    set({ settings: next });
  },
  async reloadAllies() {
    set({ allies: await allAllies() });
  },
}));

interface UiState {
  online: boolean;
  hidden: boolean;
  toast: string | null;
  setOnline: (v: boolean) => void;
  setHidden: (v: boolean) => void;
  showToast: (m: string) => void;
}

let toastTimer: number | undefined;
export const useUi = create<UiState>((set) => ({
  online: navigator.onLine,
  hidden: false,
  toast: null,
  setOnline: (v) => set({ online: v }),
  setHidden: (v) => set({ hidden: v }),
  showToast: (m) => {
    set({ toast: m });
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 7000);
  },
}));
