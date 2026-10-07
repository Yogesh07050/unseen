import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { useSettings, useUi } from './store';
import { retentionSweep } from './data/repos';
import { fragmentOk } from './engines/verify';
import { getPassage } from './engines/verses';
import { FIXED_FRAGMENTS } from './content/truthIndex';

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
import { Dev } from './screens/Dev';

const NAV_PATHS = ['/', '/stones', '/schemes', '/armory', '/allies', '/watch'];

export function App() {
  const location = useLocation();
  const { settings, loaded, load } = useSettings();
  const { toast, hidden, setHidden, setOnline } = useUi();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      await load();
      await retentionSweep();
      // Validate fixed Scripture fragments against the API; hide any that fail (done lazily in screens).
      void verifyFixedFragments();
      setBooted(true);
    })();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Ally page is public and needs no app shell, settings or lock.
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
        <Route path="/dev" element={<Dev />} />
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

async function verifyFixedFragments() {
  for (const key of Object.keys(FIXED_FRAGMENTS)) {
    const f = FIXED_FRAGMENTS[key];
    try {
      const p = await getPassage(3034, [f.usfm]);
      (FIXED_OK as Record<string, boolean>)[key] = fragmentOk(f.text, p.text);
    } catch {
      (FIXED_OK as Record<string, boolean>)[key] = false;
    }
  }
}
export const FIXED_OK: Record<string, boolean> = {};
