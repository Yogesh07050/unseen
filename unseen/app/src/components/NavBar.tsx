import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Battle', icon: 'M12 3l7 7-7 7-7-7z' },
  { to: '/stones', label: 'Stones', icon: 'M4 14l4-6 4 4 4-7 4 9z' },
  { to: '/schemes', label: 'Schemes', icon: 'M4 18V6M9 18v-5M14 18V9M19 18v-8' },
  { to: '/armory', label: 'Armory', icon: 'M5 12h14M12 5v14' },
  { to: '/allies', label: 'Allies', icon: 'M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5m14 5c0-3-3-5-6-5' },
];

export function NavBar() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 460,
      height: 'calc(88px + env(safe-area-inset-bottom, 0px))',
      background: 'rgba(253,251,246,.93)',
      borderTop: '1px solid var(--line)',
      boxShadow: '0 -10px 28px rgba(42,34,20,.07)',
      display: 'flex', alignItems: 'flex-start', paddingTop: 11,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      backdropFilter: 'saturate(1.4) blur(14px)', WebkitBackdropFilter: 'saturate(1.4) blur(14px)', zIndex: 20,
    }}>
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} style={({ isActive }) => ({
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          textDecoration: 'none', color: isActive ? 'var(--gold-hi)' : 'var(--faint)',
          transition: 'color .18s ease',
        })}>
          {({ isActive }) => (
            <>
              <span style={{
                display: 'grid', placeItems: 'center', width: 44, height: 30, borderRadius: 14,
                background: isActive ? 'var(--gold-soft)' : 'transparent',
                boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,.7)' : 'none',
                transition: 'background .2s, box-shadow .2s',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.0 : 1.55} strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
              </span>
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, letterSpacing: '.25px', lineHeight: 1 }}>{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
