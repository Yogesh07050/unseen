import { useEffect, useRef } from 'react';

export function Orb({ size = 250, listening = false, level = 0, onTap, label = 'Tap to cry out', rings = false }: {
  size?: number; listening?: boolean; level?: number; onTap?: () => void; label?: string;
  rings?: boolean;
}) {
  const holdTimer = useRef<number | null>(null);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const ringScale = 1 + Math.min(0.28, level * 0.6);
  const core = size * (rings ? 0.58 : 0.66);
  const dove = core * 0.56;

  return (
    <button
      aria-label={label}
      onClick={() => onTap?.()}
      style={{ position: 'relative', width: size, height: size, border: 0, background: 'transparent', display: 'grid', placeItems: 'center', cursor: onTap ? 'pointer' : 'default' }}
    >
      {/* Outer atmospheric breath — slow pulse */}
      <span aria-hidden className="orb-glow-outer" style={{
        position: 'absolute', width: size * 1.18, height: size * 1.18, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,168,225,.22) 0%, rgba(0,168,225,.06) 54%, transparent 74%)',
        filter: 'blur(10px)',
      }} />

      {/* Inner bright halo */}
      <span aria-hidden style={{
        position: 'absolute', width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,168,225,.42) 0%, rgba(0,168,225,.12) 46%, transparent 70%)',
        filter: 'blur(3px)',
      }} />

      {/* Decorative concentric rings (Home hero) */}
      {rings && (
        <>
          <span aria-hidden style={{ position: 'absolute', width: size * 0.99, height: size * 0.99, borderRadius: '50%', border: '1px solid rgba(0,168,225,.30)', opacity: .7 }} />
          <span aria-hidden style={{ position: 'absolute', width: core * 1.32, height: core * 1.32, borderRadius: '50%', border: '1px solid rgba(0,168,225,.46)' }} />
          <span aria-hidden style={{ position: 'absolute', width: core * 1.08, height: core * 1.08, borderRadius: '50%', border: '1px solid rgba(0,168,225,.26)', opacity: .6 }} />
          {/* Light motes */}
          <span aria-hidden className="orb-mote-1" style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: 'rgba(120,220,255,.9)', top: size * 0.13, left: size * 0.18 }} />
          <span aria-hidden className="orb-mote-2" style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: 'rgba(120,220,255,.7)', top: size * 0.17, right: size * 0.14 }} />
          <span aria-hidden className="orb-mote-3" style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: 'rgba(120,220,255,.6)', bottom: size * 0.21, left: size * 0.22 }} />
        </>
      )}

      {/* Pulsing listen rings */}
      {listening && (
        <>
          <span aria-hidden style={{ position: 'absolute', width: core * 1.22, height: core * 1.22, borderRadius: '50%', border: '1.5px solid rgba(0,168,225,.55)', transform: `scale(${ringScale})`, transition: 'transform .12s ease-out' }} />
          <span aria-hidden style={{ position: 'absolute', width: core * 1.5, height: core * 1.5, borderRadius: '50%', border: '1px solid rgba(0,168,225,.28)', transform: `scale(${ringScale})`, transition: 'transform .16s ease-out' }} />
        </>
      )}

      {/* The luminous sphere */}
      <span aria-hidden className={listening ? 'orb-core' : 'orb-core orb-float'} style={{
        position: 'relative', width: core, height: core, borderRadius: '50%',
        background: 'radial-gradient(circle at 36% 30%, #FFFFFF 0%, #EAFaFF 26%, #BFEBFF 52%, #6FD0F5 76%, #22B2E6 100%)',
        boxShadow: '0 16px 46px rgba(0,168,225,.42), 0 4px 14px rgba(0,168,225,.26), inset 0 2px 14px rgba(255,255,255,.95), inset 0 -12px 28px rgba(0,140,205,.32)',
        display: 'grid', placeItems: 'center',
      }}>
        {/* Primary specular highlight */}
        <span aria-hidden style={{ position: 'absolute', top: core * 0.11, left: core * 0.17, width: core * 0.35, height: core * 0.24, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.98), rgba(255,255,255,0))', filter: 'blur(3px)' }} />
        {/* Secondary soft sheen */}
        <span aria-hidden style={{ position: 'absolute', top: core * 0.55, right: core * 0.12, width: core * 0.18, height: core * 0.14, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.45), rgba(255,255,255,0))', filter: 'blur(4px)' }} />

        {/* Descending dove */}
        <svg width={dove} height={dove} viewBox="0 0 200 180" aria-hidden style={{ position: 'relative', filter: 'drop-shadow(0 1px 4px rgba(14,80,120,.45)) drop-shadow(0 0 8px rgba(190,235,255,.7))' }}>
          <defs>
            <linearGradient id="doveg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.6" stopColor="#EAF8FF" />
              <stop offset="1" stopColor="#8FD8F5" />
            </linearGradient>
          </defs>
          <g fill="url(#doveg)">
            <path d="M90,112 C74,100 56,82 28,56 C34,70 38,78 43,85 C38,86 34,85 29,83 C37,95 46,101 55,105 C50,107 46,108 41,108 C54,118 69,121 85,121 Z" />
            <path d="M90,112 C74,100 56,82 28,56 C34,70 38,78 43,85 C38,86 34,85 29,83 C37,95 46,101 55,105 C50,107 46,108 41,108 C54,118 69,121 85,121 Z" transform="translate(200,0) scale(-1,1)" />
            <path d="M93,98 L85,72 L100,81 L115,72 L107,98 Z" />
            <ellipse cx="100" cy="116" rx="13" ry="24" />
            <circle cx="100" cy="143" r="9.5" />
          </g>
          <path d="M96,151 L100,160 L104,151 Z" fill="#1E9AC8" />
        </svg>
      </span>

      <style>{`
        @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes orbGlowBreathe{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes moteDrift1{0%,100%{transform:translate(0,0);opacity:.25}40%{transform:translate(3px,-7px);opacity:.85}80%{transform:translate(-1px,-3px);opacity:.5}}
        @keyframes moteDrift2{0%,100%{transform:translate(0,0);opacity:.2}45%{transform:translate(-4px,-6px);opacity:.75}85%{transform:translate(1px,-2px);opacity:.4}}
        @keyframes moteDrift3{0%,100%{transform:translate(0,0);opacity:.15}50%{transform:translate(2px,-8px);opacity:.65}}
        .orb-float{animation:orbFloat 5.5s ease-in-out infinite}
        .orb-glow-outer{animation:orbGlowBreathe 4.2s ease-in-out infinite}
        .orb-mote-1{animation:moteDrift1 3.8s ease-in-out infinite}
        .orb-mote-2{animation:moteDrift2 4.6s ease-in-out 0.9s infinite}
        .orb-mote-3{animation:moteDrift3 5.2s ease-in-out 1.7s infinite}
        @media (prefers-reduced-motion: reduce){.orb-float,.orb-glow-outer,.orb-mote-1,.orb-mote-2,.orb-mote-3{animation:none}}
      `}</style>
    </button>
  );
}
