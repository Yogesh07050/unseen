import { create } from 'zustand';
import type { Ally, Settings } from './types';
import { DEFAULT_SETTINGS, allAllies, getSettings, saveSettings } from './data/repos';
import { api, ApiError } from './ai/api';
import { clearCachedPersonalData } from './data/db';
import { resetKeyCache } from './data/crypto';
import { clearSession, getCachedUser, getToken, setSession, type AuthUser } from './data/auth';
import { flush, resetSyncCursor } from './data/sync';

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

// ---- the signed-in account ----
interface AuthState {
  user: AuthUser | null;
  ready: boolean;              // the stored session has been checked once
  load: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// A new sign-in starts from a clean local store: the account's history is pulled
// from the server on the next boot, so one device never shows another person's data.
async function beginSession(token: string, user: AuthUser) {
  setSession(token, user);
  await clearCachedPersonalData();
  resetKeyCache();
  resetSyncCursor();
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  async load() {
    const token = getToken();
    if (!token) { set({ user: null, ready: true }); return; }
    try {
      const user = await api.authMe();
      setSession(token, user);
      set({ user, ready: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { clearSession(); set({ user: null, ready: true }); return; }
      // Offline or server down: trust the cached session until the server says otherwise.
      set({ user: getCachedUser(), ready: true });
    }
  },
  async login(username, password) {
    await flush().catch(() => undefined);           // push anything this device recorded before signing in
    const r = await api.authLogin(username.trim().toLowerCase(), password);
    await beginSession(r.token, r.user);
    set({ user: r.user });
  },
  async register(username, password) {
    await flush().catch(() => undefined);
    const r = await api.authRegister(username.trim().toLowerCase(), password);
    await beginSession(r.token, r.user);
    set({ user: r.user });
  },
  async logout() {
    await api.authLogout().catch(() => undefined);
    clearSession();
    await clearCachedPersonalData();
    resetKeyCache();
    resetSyncCursor();
    set({ user: null });
  },
}));
