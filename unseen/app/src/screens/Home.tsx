import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Orb } from '../components/Orb';
import { Vellum } from '../components/ui';
import { useSettings, useUi } from '../store';
import { allStones, allWatch } from '../data/repos';
import { WEEKDAYS_LONG } from '../analytics';
import { localDate } from '../battle/useBattle';
import { getVerified } from '../engines/verses';
import type { Stone, WatchWindow } from '../types';

function hourLabel(h: number) {
  const ap = h >= 12 ? 'pm' : 'am';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ap}`;
}

const ICON = {
  armor: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>,
  watch: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>,
  stone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15l5-8 4 5 3-4 4 7z"/></svg>,
  word: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v13c-3-1-5-1-8 1-3-2-5-2-8-1z"/><path d="M12 7v12"/></svg>,
  write: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>,
};

export function Home() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const { setHidden } = useUi();

  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark = (settings?.theme ?? 'system') === 'dark' || ((settings?.theme ?? 'system') === 'system' && prefersDark);
  const toggleTheme = () => update({ theme: isDark ? 'light' : 'dark' });
  const [stones, setStones] = useState<Stone[]>([]);
  const [windows, setWindows] = useState<WatchWindow[]>([]);
  const [verseOfDay, setVerseOfDay] = useState<Awaited<ReturnType<typeof getVerified>>>(null);

  useEffect(() => {
    (async () => {
      setStones(await allStones()); setWindows(await allWatch());
      const pool = ['PHP.4.6', 'ISA.41.10', 'ROM.8.1', 'PSA.119.11', '1CO.10.13', 'MIC.7.8', 'PSA.34.18'];
      const date = new Date();
      const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
      setVerseOfDay(await getVerified(3034, [pool[day % pool.length]]).catch(() => null));
    })();
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const today = windows.find((w) => w.weekday === now.getDay());
  const month = now.toLocaleString('en-US', { month: 'long' });
  const fromMemory = stones.filter((s) => s.kind === 'from_memory' && s.date.startsWith(localDate().slice(0, 7))).length;

  // ── Contextual ribbon ────────────────────────────────────────────────────
  let ribbon: React.ReactNode = null;
  if (now.getHours() < 12) {
    ribbon = <Ribbon icon={ICON.armor} eyebrow="Morning Armor" title="Put on the armor" sub="Ephesians 6:13-18 · 60s" onClick={() => navigate('/morning-armor')} />;
  } else if (today) {
    ribbon = <Ribbon icon={ICON.watch} eyebrow="Tonight's watch" title={`${hourLabel(today.startHour)} – ${hourLabel(today.endHour)}`} sub={today.reason || `${WEEKDAYS_LONG[today.weekday]} nights are hardest`} onClick={() => navigate('/watch')} />;
  } else if (stones[0]) {
    const s = stones[0];
    ribbon = <Ribbon icon={ICON.stone} eyebrow="A stone from your journey" title={s.kind === 'from_memory' ? 'Won from memory' : s.kind === 'rose_again' ? 'You rose again' : 'You stood'} sub={new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} onClick={() => navigate(`/stones/${s.id}`)} />;
  } else if (verseOfDay) {
    ribbon = <Ribbon icon={ICON.word} eyebrow="A word for today" title={verseOfDay.reference} sub="Tap to read" onClick={() => navigate('/armory')} />;
  }

  return (
    <div className="screen has-nav" style={{ gap: 0 }}>
      {/* ── Top bar ──────────────────────────────────────── */}
      <div className="header-row" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>UNSEEN</div>
          <h1 className="title" style={{ fontSize: 26, lineHeight: '29px', fontWeight: 600 }}>{greeting}{settings?.firstName ? `,` : ''}</h1>
          {settings?.firstName && <h1 className="title" style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, color: 'var(--gold-hi)' }}>{settings.firstName}</h1>}
          <p style={{ margin: '5px 0 0', font: '400 13px/1 var(--sans)', color: 'var(--faint)', letterSpacing: '.3px' }}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn home-icon-btn" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
            )}
          </button>
          <button className="icon-btn home-icon-btn" aria-label="Hide" onClick={() => setHidden(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.4 5.1A9 9 0 0121 12a9 9 0 01-1.6 2.6M6.1 6.1A9 9 0 003 12a9 9 0 0010.9 5.3" /></svg>
          </button>
          <button className="icon-btn home-icon-btn" aria-label="Settings" onClick={() => navigate('/settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></svg>
          </button>
        </div>
      </div>

      {ribbon}

      {/* ── Hero: the Spirit orb is the speak button ─────── */}
      <div className="spacer" />
      <div style={{ display: 'grid', placeItems: 'center', gap: 20 }}>
        <Orb size={244} rings onTap={() => navigate('/cry-out?mode=voice')} label="Tap to speak" />
        <div style={{ textAlign: 'center', maxWidth: 296 }}>
          <p style={{ font: '500 24px/30px var(--serif)', margin: 0, color: 'var(--text)' }}>What are you facing right now?</p>
          <p className="small muted" style={{ margin: '9px 0 0', letterSpacing: '.2px' }}>Tap the light to speak it aloud.</p>
        </div>
      </div>
      <div className="spacer" />

      {/* ── Secondary action: type instead ───────────────── */}
      <button onClick={() => navigate('/cry-out?mode=text')} className="type-instead-btn" style={{
        width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        height: 56, borderRadius: 22,
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--surface-2) 100%)',
        color: 'var(--gold-hi)',
        border: '1.5px solid var(--gold-line)',
        boxShadow: '0 1px 3px rgba(10,40,70,.05), 0 8px 22px rgba(10,40,70,.08), inset 0 1px 0 rgba(255,255,255,.35)',
        font: '600 16px var(--sans)', letterSpacing: '.3px',
        marginBottom: 12, transition: 'transform .14s ease, box-shadow .18s ease',
      }}>
        <span style={{ display: 'inline-flex', opacity: .85 }}>{ICON.write}</span>
        Type it instead
      </button>

      {/* ── Footer strip ─────────────────────────────────── */}
      <div className="row" style={{ justifyContent: 'space-between', paddingTop: 2 }}>
        <span style={{ font: '400 12.5px/1 var(--sans)', color: 'var(--faint)', letterSpacing: '.3px' }}>
          <b style={{ color: 'var(--gold)', fontWeight: 700 }}>{stones.length}</b> stones
          <span style={{ margin: '0 6px', opacity: .5 }}>·</span>
          <b style={{ color: 'var(--gold)', fontWeight: 700 }}>{fromMemory}</b> from memory in {month}
        </span>
        <button className="icon-btn" style={{ color: 'var(--faint)', fontSize: 13.5, padding: '2px 4px' }} onClick={() => navigate('/rise')}>I fell</button>
      </div>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Ribbon({ icon, eyebrow, title, sub, onClick }: {
  icon: React.ReactNode; eyebrow: string; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="rise-in ribbon-card" style={{
      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
      background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
      border: '1px solid var(--gold-line)',
      borderRadius: 20, padding: '14px 16px 14px 14px',
      boxShadow: '0 1px 3px rgba(10,40,70,.05), 0 8px 22px rgba(10,40,70,.08), inset 0 1px 0 rgba(255,255,255,.35)',
      color: 'var(--text)', transition: 'transform .14s ease, box-shadow .18s ease',
    }}>
      <span style={{
        flexShrink: 0, width: 44, height: 44, borderRadius: 13,
        display: 'grid', placeItems: 'center',
        background: 'linear-gradient(145deg,rgba(0,168,225,.18),rgba(0,168,225,.08))',
        border: '1px solid var(--gold-line)', color: 'var(--gold-hi)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
      }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="eyebrow" style={{ display: 'block', marginBottom: 2 }}>{eyebrow}</span>
        <span style={{ display: 'block', font: '700 17.5px/21px var(--serif)', margin: '2px 0 3px' }}>{title}</span>
        <span style={{ display: 'block', font: '400 12.5px/1 var(--sans)', color: 'var(--faint)', letterSpacing: '.2px' }}>{sub}</span>
      </span>
      <span aria-hidden style={{ flexShrink: 0, color: 'var(--gold-hi)', display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </span>
    </button>
  );
}

