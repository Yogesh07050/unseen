import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { applyStatusBar, hideSplash, initNativeShell, minimizeApp } from './native';
import { useSettings, useUi } from './store';
import { invalidateCaches, purgeLegacyDemoRows, retentionSweep, saveSettings } from './data/repos';
import { flush, pull } from './data/sync';
import { recompute } from './battle/useBattle';
import { fragmentOk } from './engines/verify';
import { getPassage } from './engines/verses';
import { FIXED_FRAGMENTS, FIXED_OK } from './content/truthIndex';

import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { CryOut } from './screens/CryOut';
import { Discern } from './screens/Discern';
import { Battle } from './screens/Battle';
import { Peace } from './screens/Peace';
import { Rise } from './screens/Rise';
import { Harbor } from './screens/Harbor';
import { Stones } from './screens/Stones';
import { StoneDetail } from './screens/StoneDetail';
import { Schemes } from './screens/Schemes';
import { Watch } from './screens/Watch';
import { Allies } from './screens/Allies';
import { Armory } from './screens/Armory';
import { MorningArmor } from './screens/MorningArmor';
import { Reel } from './screens/Reel';
import { SettingsScreen } from './screens/Settings';
import { AllyPage } from './screens/AllyPage';

const NAV_PATHS = ['/', '/stones', '/schemes', '/armory', '/allies', '/watch'];

export function App() {
  const location = useLocation();
  const { settings, loaded, load } = useSettings();
  const { toast, hidden, setHidden, setOnline } = useUi();
  const [booted, setBooted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await load();
      await retentionSweep();
      if (await purgeLegacyDemoRows()) await recompute();
      // Validate fixed Scripture fragments against the API; hide any that fail (done lazily in screens).
      void verifyFixedFragments();
      // Bring this install's server copy in (a reinstall or second device sees its data),
      // then push anything still waiting in the outbox.
      await syncOnBoot();
      setBooted(true);
    })();
    const on = () => { setOnline(true); void flush(); void pull().then((r) => { if (r.changed) void recompute(); }); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Apply the chosen theme to <html>: 'system' leaves it to prefers-color-scheme.
  useEffect(() => {
    const root = document.documentElement;
    const theme = settings?.theme ?? 'system';
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [settings?.theme]);

  // ── Native shell (Android via Capacitor; all no-ops on the web) ──────────
  // Hardware Back: un-hide the privacy screen, go back in the app, or step out
  // of the app from Home/onboarding (never kill it mid-battle by accident).
  useEffect(() => initNativeShell({
    onBack: () => {
      if (hidden) { setHidden(false); return; }
      if (location.pathname === '/' || location.pathname === '/onboarding') { void minimizeApp(); return; }
      navigate(-1);
    },
    onOnline: setOnline,
  }), [hidden, location.pathname, navigate, setHidden, setOnline]);
  // Keep the splash up until the encrypted settings have loaded, then fade it.
  useEffect(() => { if (booted && loaded) void hideSplash(); }, [booted, loaded]);
  // Match the system status bar to the active theme.
  useEffect(() => {
    const theme = settings?.theme ?? 'system';
    const dark = theme === 'dark' || (theme === 'system' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    void applyStatusBar(dark);
  }, [settings?.theme]);

  // Ally page is public and needs no app shell or settings.
  if (location.pathname.startsWith('/p/')) {
    return (
      <div className="app">
        <Routes><Route path="/p/:token" element={<AllyPage />} /></Routes>
      </div>
    );
  }

  if (!booted || !loaded) {
    return <div className="app"><div className="screen center"><span className="wordmark">UNSEEN</span></div></div>;
  }

  const onboarded = !!settings?.onboardedAt;
  if (!onboarded && location.pathname !== '/onboarding') {
    return <div className="app"><Routes><Route path="*" element={<Navigate to="/onboarding" replace />} /></Routes></div>;
  }
  const showNav = NAV_PATHS.includes(location.pathname);

  if (hidden) {
    return (
      <div className="app" onClick={() => setHidden(false)}>
        <div className="screen center">
          <div className="vellum" style={{ maxWidth: 320 }}>
            <p style={{ margin: 0 }}>“I have hidden Your word in my heart that I might not sin against You.”</p>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 8 }}>Psalm 119:11</div>
          </div>
          <p className="tiny" style={{ marginTop: 16 }}>Tap to return</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Home />} />
        <Route path="/cry-out" element={<CryOut />} />
        <Route path="/discern" element={<Discern />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/peace" element={<Peace />} />
        <Route path="/rise" element={<Rise />} />
        <Route path="/harbor" element={<Harbor />} />
        <Route path="/stones" element={<Stones />} />
        <Route path="/stones/:id" element={<StoneDetail />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/allies" element={<Allies />} />
        <Route path="/armory" element={<Armory />} />
        <Route path="/morning-armor" element={<MorningArmor />} />
        <Route path="/reel" element={<Reel />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <NavBar />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#2A2620', color: '#FBF7EE', borderRadius: 14, padding: '11px 18px', zIndex: 50, maxWidth: 360, width: 'max-content', boxShadow: '0 10px 30px rgba(0,0,0,.28)' }}>
          <span className="small" role="status" aria-live="polite">{toast}</span>
        </div>
      )}
    </div>
  );
}

// First pull on boot. A server profile adopts a phone that has not onboarded
// (or whose settings are older); server rows merge by last write; derived
// records (clusters, watch windows) are rebuilt when battles changed.
async function syncOnBoot() {
  try {
    const r = await pull();
    const store = useSettings.getState();
    const local = store.settings;
    if (r.profile && (!local || !local.onboardedAt || (r.profile.updatedAt ?? 0) > (local.updatedAt ?? 0))) {
      const merged = { ...(local ?? {}), ...r.profile, id: 'me' as const };
      await saveSettings(merged, { sync: false });
      useSettings.setState({ settings: merged });
    }
    if (r.changed) {
      invalidateCaches();
      await recompute();
      await store.reloadAllies();
    }
  } catch { /* offline or no database: the phone's own store is the source */ }
  void flush();
}

async function verifyFixedFragments() {
  for (const key of Object.keys(FIXED_FRAGMENTS)) {
    const f = FIXED_FRAGMENTS[key];
    try {
      const p = await getPassage(3034, [f.usfm]);
      FIXED_OK[key] = fragmentOk(f.text, p.text);
    } catch {
      FIXED_OK[key] = false;
    }
  }
}
