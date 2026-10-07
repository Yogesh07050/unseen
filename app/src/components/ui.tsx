import type { ReactNode } from 'react';
import type { Passage, VerifiedVerse } from '../types';

export function Button({ children, variant = 'gold', onClick, disabled, type = 'button' }: {
  children: ReactNode; variant?: 'gold' | 'ghost' | 'quiet'; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const base: React.CSSProperties = {
    width: '100%', border: 0, borderRadius: 'var(--r-pill)', fontFamily: 'var(--sans)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: disabled ? 0.45 : 1, transition: 'transform .12s ease, box-shadow .2s ease',
    letterSpacing: '.2px',
  };
  const styles: Record<string, React.CSSProperties> = {
    gold: {
      ...base, height: 54,
      background: 'linear-gradient(180deg,#2BC2F0 0%,#00A8E1 52%,#0089C4 100%)',
      color: '#FFFFFF', fontWeight: 700, fontSize: 18,
      boxShadow: 'var(--shadow-gold), inset 0 1px 0 rgba(255,255,255,.4)',
    },
    ghost: {
      ...base, height: 50, background: 'var(--surface)', color: 'var(--text)',
      border: '1.5px solid var(--line-strong)', fontWeight: 600, fontSize: 17,
      boxShadow: 'var(--shadow-sm)',
    },
    quiet: { ...base, height: 40, background: 'transparent', color: 'var(--muted)', fontSize: 16, width: 'auto', fontWeight: 500 },
  };
  return <button type={type} style={styles[variant]} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Panel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-panel)', padding: '16px 17px', boxShadow: 'var(--shadow-sm)', ...style }}>{children}</div>;
}

export function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 15px', borderRadius: 'var(--r-chip)', fontSize: 15, fontWeight: 600,
      background: selected ? 'var(--gold-soft)' : 'var(--surface)',
      border: `1px solid ${selected ? 'var(--gold-line)' : 'var(--line-strong)'}`,
      color: selected ? 'var(--gold-hi)' : 'var(--text)',
      boxShadow: selected ? 'none' : 'var(--shadow-sm)',
      transition: 'background .15s, border-color .15s',
    }}>{label}</button>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button aria-pressed={on} onClick={() => onChange(!on)} style={{
      width: 48, height: 28, borderRadius: 14, border: 0, position: 'relative', flexShrink: 0,
      background: on ? 'var(--gold)' : 'var(--line-strong)', transition: 'background .2s',
      boxShadow: on ? 'inset 0 1px 2px rgba(0,0,0,.12)' : 'none',
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  );
}

// Reference, version and the copyright notice the version's licence requires
// (YouVersion terms: Bible text is always shown with its attribution).
export function VerseAttribution({ verse, size = 13.5, color = 'var(--ink-muted)' }: {
  verse: Pick<Passage, 'reference' | 'versionTitle' | 'copyright'>; size?: number; color?: string;
}) {
  return (
    <div style={{ fontFamily: 'var(--sans)', marginTop: 8, color }}>
      <div style={{ fontSize: size }}>{verse.reference} · {verse.versionTitle}</div>
      {verse.copyright && (
        <div style={{ fontSize: Math.max(10.5, size - 2.5), lineHeight: 1.3, marginTop: 3, opacity: 0.8 }}>{verse.copyright}</div>
      )}
    </div>
  );
}

export function Vellum({ verse, battle, children }: { verse?: VerifiedVerse; battle?: boolean; children?: ReactNode }) {
  return (
    <div className="vellum" style={{
      background: 'linear-gradient(168deg,var(--vellum) 0%,var(--vellum-2) 100%)',
      color: 'var(--ink)', borderRadius: 'var(--r-vellum)', padding: '18px 20px 15px',
      boxShadow: 'inset 0 0 0 1px var(--gold-line), inset 0 0 26px var(--gold-soft), var(--shadow-sm)',
      font: `400 ${battle ? '20px/30px' : '18.5px/27px'} var(--serif)`,
    }}>
      {verse ? (
        <>
          <div>{verse.text}</div>
          <VerseAttribution verse={verse} />
        </>
      ) : children}
    </div>
  );
}

export function VerseSkeleton({ lines = 4 }: { lines?: number }) {
  return <div className="vellum" role="status" aria-label="Loading verified Scripture" style={{ minHeight: 130 }}>
    <span className="sr-only">Loading verified Scripture…</span>
    {Array.from({ length: lines }, (_, i) => <div key={i} style={{ height: 12, width: `${i === lines - 1 ? 54 : 92 - (i % 2) * 8}%`, borderRadius: 8, marginBottom: 12, background: 'rgba(87,68,37,.13)', animation: 'skeleton 1.2s ease-in-out infinite' }} />)}
    <style>{`@keyframes skeleton{0%,100%{opacity:.45}50%{opacity:.9}}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`}</style>
  </div>;
}

// A quiet italic quote line with its reference (for non-vellum Scripture display).
export function QuoteLine({ text, reference }: { text: string; reference: string }) {
  return (
    <p className="quote">“{text}” <span className="ref">{reference}</span></p>
  );
}

import type { VoiceStatus } from '../engines/voiceStatus';

const VOICE_COLOR: Record<VoiceStatus, string> = {
  checking: 'var(--faint)', ready: '#6FBF73', recording: '#6FBF73',
  needs_permission: 'var(--gold)', transcribing: 'var(--gold)', no_speech: 'var(--gold)',
  unsupported: 'var(--faint)', server_off: 'var(--faint)', denied: 'var(--faint)',
  error: 'var(--ember)',
};

export function VoiceStatusPill({ status, reason }: { status: VoiceStatus; reason: string }) {
  const color = VOICE_COLOR[status];
  const pulse = status === 'recording' || status === 'transcribing' || status === 'checking';
  return (
    <div role="status" aria-live="polite" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'center',
      padding: '5px 12px', borderRadius: 'var(--r-pill)', background: 'var(--surface-2)',
      border: '1px solid var(--line-strong)', fontSize: 13.5, color: 'var(--muted)',
    }}>
      <span style={{
        width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: `0 0 8px ${color}`, animation: pulse ? 'vpulse 1.1s ease-in-out infinite' : 'none',
      }} />
      <span>{reason}</span>
      <style>{`@keyframes vpulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="header-row">
      <h1 className="title">{title}</h1>
      {right}
    </div>
  );
}
