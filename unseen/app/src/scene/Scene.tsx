import { useEffect, useRef, useState } from 'react';
import type { ArchetypeId } from '../types';

type SceneState = 'arriving' | 'fighting' | 'climax' | 'fleeing' | 'peace';

// Per-archetype atmosphere: accent color and particle style (ambient only — the
// characters below are the fixed M/D/A cast of the cinematic story).
const ARCH_VFX: Record<ArchetypeId, { accent: string; glow: string; particles: 'embers' | 'wisps' | 'glints' | 'mist' | 'chains' | 'none' }> = {
  ember:     { accent: '#E8592F', glow: 'rgba(232,89,47,.55)',  particles: 'embers' },
  whisperer: { accent: '#9B8FD4', glow: 'rgba(155,143,212,.45)', particles: 'wisps' },
  serpent:   { accent: '#4CAF82', glow: 'rgba(76,175,130,.40)', particles: 'glints' },
  fog:       { accent: '#7BB4CC', glow: 'rgba(123,180,204,.40)', particles: 'mist' },
  accuser:   { accent: '#B070C8', glow: 'rgba(176,112,200,.50)', particles: 'wisps' },
  mirror:    { accent: '#6BC8C8', glow: 'rgba(107,200,200,.45)', particles: 'glints' },
  chain:     { accent: '#C87030', glow: 'rgba(200,112,48,.45)',  particles: 'chains' },
  mask:      { accent: '#C8C890', glow: 'rgba(200,200,144,.40)', particles: 'glints' },
  crown:     { accent: '#C8A020', glow: 'rgba(200,160,32,.50)',  particles: 'embers' },
  shadow:    { accent: '#8890B8', glow: 'rgba(136,144,184,.35)', particles: 'none' },
};

// Character pose library — M (boy, center), D (devil, left), A (angel, right).
const ART = {
  mScared:   '/art/m-scared.svg',
  mScroll:   '/art/m-scroll.svg',
  mStance:   '/art/m-stance.svg',
  mPunch:    '/art/m-punch.svg',
  mVictory:  '/art/m-victory.svg',
  mGrateful: '/art/m-grateful.svg',
  dTaunting: '/art/d-taunting.svg',
  dConfused: '/art/d-confused.svg',
  dHit:      '/art/d-hit.svg',
  dDefeated: '/art/d-defeated.svg',
  aScroll:   '/art/a-scroll.svg',
  aWatching: '/art/a-watching.svg',
  aFlyAway:  '/art/a-flying-away.svg',
  punchFx:   '/art/punch-effect.svg',
};

const EMBER_POS = [
  { left: '14%', bottom: '22%', size: 4,  delay: 0,    dur: 2.8 },
  { left: '22%', bottom: '15%', size: 3,  delay: 0.7,  dur: 3.4 },
  { left: '30%', bottom: '28%', size: 5,  delay: 1.4,  dur: 2.5 },
  { left: '18%', bottom: '35%', size: 3,  delay: 2.0,  dur: 3.1 },
  { left: '10%', bottom: '40%', size: 4,  delay: 0.4,  dur: 3.7 },
];
const WISP_POS = [
  { left: '8%',  top: '38%', w: 36, h: 12, delay: 0,   dur: 5.2 },
  { left: '20%', top: '50%', w: 24, h: 8,  delay: 1.8, dur: 4.6 },
  { left: '5%',  top: '58%', w: 28, h: 10, delay: 3.0, dur: 5.8 },
];
const GLINT_POS = [
  { left: '12%', top: '30%', delay: 0,    dur: 2.1 },
  { left: '28%', top: '44%', delay: 0.9,  dur: 1.8 },
  { left: '18%', top: '60%', delay: 1.7,  dur: 2.4 },
  { left: '35%', top: '35%', delay: 0.4,  dur: 2.0 },
];
const MIST_POS = [
  { left: '6%',  top: '50%', w: 50, delay: 0,   dur: 6 },
  { left: '20%', top: '35%', w: 34, delay: 2.4, dur: 7 },
  { left: '15%', top: '65%', w: 42, delay: 1.2, dur: 5.5 },
];
const CHAIN_POS = [
  { left: '8%',  top: '40%', delay: 0,   dur: 2.2 },
  { left: '22%', top: '52%', delay: 1.1, dur: 2.8 },
  { left: '16%', top: '30%', delay: 0.6, dur: 2.5 },
];

function Particles({ archetype, reduceMotion }: { archetype: ArchetypeId; reduceMotion?: boolean }) {
  const vfx = ARCH_VFX[archetype] ?? ARCH_VFX.shadow;
  if (reduceMotion || vfx.particles === 'none') return null;

  if (vfx.particles === 'embers') return (
    <>
      {EMBER_POS.map((p, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: p.left, bottom: p.bottom, width: p.size, height: p.size,
          borderRadius: '50%', background: vfx.accent,
          boxShadow: `0 0 ${p.size * 2}px ${vfx.accent}`,
          animation: `emberFloat ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );

  if (vfx.particles === 'wisps') return (
    <>
      {WISP_POS.map((p, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: p.left, top: p.top, width: p.w, height: p.h,
          borderRadius: '50%', background: `radial-gradient(ellipse, ${vfx.accent}60, transparent)`,
          animation: `wispDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );

  if (vfx.particles === 'glints') return (
    <>
      {GLINT_POS.map((p, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: p.left, top: p.top, width: 5, height: 5,
          clipPath: 'polygon(50% 0%,55% 45%,100% 50%,55% 55%,50% 100%,45% 55%,0% 50%,45% 45%)',
          background: vfx.accent, opacity: 0.7,
          animation: `glintPulse ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );

  if (vfx.particles === 'mist') return (
    <>
      {MIST_POS.map((p, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: p.left, top: p.top, width: p.w, height: 18,
          borderRadius: 12, background: `linear-gradient(90deg, transparent, ${vfx.accent}40, transparent)`,
          animation: `mistDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );

  if (vfx.particles === 'chains') return (
    <>
      {CHAIN_POS.map((p, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: p.left, top: p.top, width: 16, height: 10,
          border: `2px solid ${vfx.accent}80`, borderRadius: 4,
          animation: `chainPulse ${p.dur}s ${p.delay}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );

  return null;
}

export function Scene({ archetype, lie, phraseIndex, totalPhrases, state, allyAcks, symbolic, reduceMotion, fill, onIntroChange }: {
  archetype: ArchetypeId; lie: string; phraseIndex: number; totalPhrases: number;
  state: SceneState; allyAcks: number; symbolic?: boolean; reduceMotion?: boolean;
  /** When true the scene fills its parent container rather than keeping a fixed aspect ratio */
  fill?: boolean;
  /** Fires true while the Scene 1 intro is playing, false once it hands off to Scene 2 */
  onIntroChange?: (playing: boolean) => void;
}) {
  const [flash, setFlash] = useState(false);
  const [impact, setImpact] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [punching, setPunching] = useState(false);
  // The battle machine never emits 'arriving', so the opening "problem poster"
  // plays as a cinematic intro before the angel arrives with the scroll.
  // introDone flips once that beat is over.
  const [introDone, setIntroDone] = useState(!!reduceMotion);
  // Scene 1 choreography phase:
  //   0 establish (M already trembling)   1 D notices + small approach
  //   2 D leans to M's ear and whispers   3 D pulls back, satisfied
  //   4 dramatic pause → Scene 2
  const [s1, setS1] = useState(0);
  const prev = useRef(phraseIndex);
  const vfx = ARCH_VFX[archetype] ?? ARCH_VFX.shadow;
  const burn = totalPhrases ? Math.min(1, phraseIndex / totalPhrases) : 0;

  const atStart = state === 'fighting' && phraseIndex === 0;

  useEffect(() => {
    if (reduceMotion) { setIntroDone(true); return; }
    if (atStart) {
      setIntroDone(false);
      setS1(0);
      const timers = [
        setTimeout(() => setS1(1), 1200), // D notices, starts to approach
        setTimeout(() => setS1(2), 2400), // D leans in and whispers
        setTimeout(() => setS1(3), 4200), // D pulls back, satisfied
        setTimeout(() => setS1(4), 5200), // dramatic pause
        setTimeout(() => setIntroDone(true), 6000), // → Scene 2
      ];
      return () => timers.forEach(clearTimeout);
    }
    setIntroDone(true);
  }, [atStart, reduceMotion]);

  // Let the parent (Battle) hide its controls while the Scene 1 intro plays.
  const introPlaying = !reduceMotion && atStart && !introDone;
  useEffect(() => {
    onIntroChange?.(introPlaying);
  }, [introPlaying, onIntroChange]);

  // --- Story beats, driven by the battle state machine + phraseIndex ---
  // Scene 1: M scared, D taunting (the problem) — intro, or an 'arriving' state
  // Scene 2: A flies in, hands the scroll (fighting & phraseIndex === 0)
  // Scene 3: M strikes D once per phrase (fighting & phraseIndex > 0)
  // Scene 4: victory pose, D defeated, A proud (climax)
  // Scene 5: M grateful, A waves and flies away (fleeing / peace)
  const isClimax = state === 'climax';
  const isPeace = state === 'peace' || state === 'fleeing';
  const scene1 = state === 'arriving' || (atStart && !introDone);
  const scene2 = atStart && introDone;
  const sceneFight = state === 'fighting' && phraseIndex > 0;
  const scene4 = isClimax;
  const scene5 = isPeace;

  const showAngel = !scene1; // angel enters with the scroll in scene 2 and stays
  const dDown = scene4 || scene5; // devil defeated on the ground
  const mFlipped = sceneFight; // boy turns to face the devil (left) while striking

  // Trigger approach entrance on first render.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phraseIndex > prev.current) {
      setImpact((v) => v + 1);
      setFlash(true);
      setPunching(true);
      if (navigator.vibrate) navigator.vibrate([25, 0, 15]);
      const t1 = setTimeout(() => setFlash(false), 700);
      const t2 = setTimeout(() => setPunching(false), 480);
      prev.current = phraseIndex;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prev.current = phraseIndex;
  }, [phraseIndex]);

  // Which pose each character wears this frame.
  const mSrc =
    scene1 ? ART.mScared :
    scene2 ? ART.mScroll :
    scene4 ? ART.mVictory :
    scene5 ? ART.mGrateful :
    punching ? ART.mPunch : ART.mStance;

  const dSrc =
    dDown ? ART.dDefeated :
    flash ? ART.dHit :
    scene1 ? ART.dTaunting :
    ART.dConfused; // rattled once the scroll appears and through the fight

  const aSrc =
    scene5 ? ART.aFlyAway :
    scene2 ? ART.aScroll :
    ART.aWatching;

  const sceneOverlayColor = `radial-gradient(ellipse 80% 60% at 25% 80%, ${vfx.glow}, transparent 68%)`;

  return (
    <div style={{
      position: 'relative', width: '100%',
      aspectRatio: fill ? 'auto' : '390 / 440',
      height: fill ? '100%' : undefined,
      borderRadius: 16, overflow: 'hidden',
      background: 'radial-gradient(140% 110% at 50% -5%, #2A2260 0%, #1A1650 35%, #0C0E29 100%)',
      border: '1px solid var(--line)',
      isolation: 'isolate',
    }}>

      {/* Deep atmospheric stars */}
      <div aria-hidden className={reduceMotion ? '' : 'battle-stars'} style={{
        position: 'absolute', inset: 0, opacity: 0.7,
        backgroundImage: [
          'radial-gradient(1.5px 1.5px at 15% 18%, #EDEBFF 50%, transparent)',
          'radial-gradient(1px 1px   at 70% 12%, #EDEBFF 50%, transparent)',
          'radial-gradient(1px 1px   at 38% 55%, #CFCBF5 50%, transparent)',
          'radial-gradient(1.5px 1.5px at 82% 48%, #EDEBFF 50%, transparent)',
          'radial-gradient(1px 1px   at 55% 28%, #E5E2FF 50%, transparent)',
          'radial-gradient(1px 1px   at 25% 72%, #CFCBF5 50%, transparent)',
          'radial-gradient(1.5px 1.5px at 90% 78%, #EDEBFF 50%, transparent)',
        ].join(','),
      }} />

      {/* Hills of fire — the chariots of fire scene (2 Kings 6:17) */}
      <img src="/art/hills-of-fire.svg" alt="" aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        opacity: isPeace ? 0.18 : 0.28,
        filter: isPeace ? 'saturate(0.4) brightness(1.2)' : 'none',
        transition: 'opacity 1.8s ease, filter 1.8s ease',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }} />

      {/* Archetype atmospheric tint (calms once the devil is down) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: sceneOverlayColor,
        opacity: dDown ? 0 : flash ? 0.7 : 0.45,
        transition: 'opacity .6s ease',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }} />

      {/* Archetype ambient particles (fade out in peace) */}
      {!dDown && <Particles archetype={archetype} reduceMotion={reduceMotion} />}

      {/* Peace golden haze */}
      {isPeace && !reduceMotion && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,220,143,.22) 0%, transparent 60%)',
          animation: 'peaceSettle 2.2s ease both',
          pointerEvents: 'none',
        }} />
      )}

      {symbolic ? (
        /* Symbolic mode: an abstract growing orb of light instead of the cast */
        <div aria-hidden style={{
          position: 'absolute', left: `${40 - burn * 6}%`, top: `${38 - burn * 8}%`,
          width: `${22 + burn * 46}%`, aspectRatio: '1', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,245,215,.9), rgba(255,231,166,.35) 45%, rgba(255,207,100,0))',
          filter: `blur(${2 + burn * 6}px)`,
          opacity: 0.7 + burn * 0.3,
          transition: 'all .6s ease',
          pointerEvents: 'none',
        }} />
      ) : scene1 ? (
        /* ── SCENE 1 — Fear & Temptation ──────────────────────────────────
           Only M (scared, center) and D (taunting, left). D notices M, edges
           closer, leans to his ear and whispers; M trembles harder. No angel,
           no scroll, no impact. Outer <div> carries the staged movement (phase
           transitions), the inner <img> carries the looping tremble/sway. */
        <>
          {/* DEVIL (D) — left, facing M. Phases: 0 at rest · 1 notices+edges in · 2 leans to ear · 3 pulls back */}
          <div style={{
            position: 'absolute', left: '1%', bottom: '5%', width: '38%',
            transformOrigin: '65% 100%',
            opacity: mounted ? 1 : 0,
            transform: !mounted
              ? 'translateY(30%)'
              : s1 >= 3 ? 'translate(6%, 0) scale(1.05) rotate(0deg)'
              : s1 === 2 ? 'translate(10%, 0) scale(1.18) rotate(3deg)' // rise up to M's ear
              : s1 === 1 ? 'translate(4%, 0) scale(1.02) rotate(1deg)'
              : 'translate(0, 0) scale(1) rotate(0deg)',
            transition: 'transform .9s cubic-bezier(.3,.9,.4,1), opacity .6s ease',
            pointerEvents: 'none',
          }}>
            <img src={ART.dTaunting} alt="" aria-hidden style={{
              width: '100%', display: 'block', transformOrigin: '60% 70%',
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.5))',
              animation: reduceMotion ? 'none'
                : s1 === 0 ? 'dIdleSway 3.2s ease-in-out infinite'
                : s1 === 1 ? 'dBounce .6s ease-out'
                : s1 === 2 ? 'dWhisper 1.1s ease-in-out infinite'
                : 'none',
            }} />
          </div>

          {/* Whisper wisps — faint breath drifting from D's mouth toward M's ear */}
          {(s1 === 2 || s1 === 3) && !reduceMotion && (
            <div aria-hidden style={{ position: 'absolute', left: '26%', top: '34%', pointerEvents: 'none' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  position: 'absolute', left: i * 9, top: -i * 5,
                  width: 6 + i * 2, height: 6 + i * 2, borderRadius: '50%',
                  border: '1.5px solid rgba(214,206,255,.55)',
                  animation: `whisperFloat 1.7s ${i * 0.32}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          )}

          {/* BOY (M) — center, afraid. Leans slightly away once the whisper starts; the inner img trembles (harder from phase 2). */}
          <div style={{
            position: 'absolute', left: '30%', bottom: '5%', width: '40%',
            transformOrigin: '50% 100%',
            opacity: mounted ? 1 : 0,
            transform: !mounted ? 'translateY(30%)' : s1 >= 2 ? 'translateX(3%) rotate(1deg)' : 'translateX(0) rotate(0deg)',
            transition: 'transform .7s cubic-bezier(.3,.9,.4,1), opacity .6s ease',
            pointerEvents: 'none',
          }}>
            <img src={ART.mScared} alt="" aria-hidden style={{
              width: '100%', display: 'block', transformOrigin: '50% 100%',
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.4))',
              animation: reduceMotion ? 'none'
                : s1 >= 2 ? 's1TrembleHard .3s ease-in-out infinite'
                : 's1Tremble .5s ease-in-out infinite',
            }} />
          </div>
        </>
      ) : (
        <>
          {/* DEVIL (D) — left. Confused through the fight, then collapses. */}
          <img
            src={dSrc} alt="" aria-hidden
            style={{
              position: 'absolute',
              left: '1%',
              bottom: dDown ? '3%' : '5%',
              width: dDown ? '34%' : '40%',
              transformOrigin: '50% 100%',
              opacity: dDown ? 0.9 : 1 - burn * 0.12,
              filter: dDown
                ? 'brightness(0.55) saturate(0.6) drop-shadow(0 4px 10px rgba(0,0,0,.5))'
                : flash
                ? `drop-shadow(0 0 18px ${vfx.accent}CC) drop-shadow(0 6px 14px rgba(0,0,0,.5))`
                : 'drop-shadow(0 6px 14px rgba(0,0,0,.45))',
              animation: reduceMotion ? 'none'
                : flash ? 'dHit .5s ease-out'
                : 'none',
              transition: 'left .7s cubic-bezier(.2,.9,.4,1), bottom .5s ease, width .5s ease, opacity .6s ease, filter .4s ease',
              pointerEvents: 'none',
            }}
          />

          {/* BOY (M) — center. Reads scroll → strikes → victorious → grateful. */}
          <img
            src={mSrc} alt="" aria-hidden
            style={{
              position: 'absolute',
              left: punching ? '24%' : scene2 ? '31%' : '30%',
              bottom: '5%',
              width: punching ? '50%' : '42%',
              transform: `scaleX(${mFlipped ? -1 : 1})`,
              transformOrigin: '50% 100%',
              filter: scene4
                ? 'drop-shadow(0 0 26px rgba(255,228,143,.85)) drop-shadow(0 6px 16px rgba(0,0,0,.4))'
                : 'drop-shadow(0 6px 16px rgba(0,0,0,.4))',
              animation: reduceMotion ? 'none'
                : scene4 ? 'mVictoryPop .6s ease-out both'
                : 'none',
              transition: 'left .25s ease, width .25s ease, filter .5s ease',
              pointerEvents: 'none',
            }}
          />

          {/* ANGEL (A) — right. Flies in with the scroll, watches, then departs. */}
          {showAngel && (
            <img
              src={aSrc} alt="" aria-hidden
              style={{
                position: 'absolute',
                right: scene5 ? '-45%' : '1%',
                bottom: scene2 ? '9%' : scene5 ? '32%' : '5%',
                width: '38%',
                filter: 'drop-shadow(0 0 20px rgba(200,222,255,.4)) drop-shadow(0 6px 14px rgba(0,0,0,.3))',
                animation: reduceMotion ? 'none'
                  : scene2 ? 'aFlyIn .8s ease-out both'
                  : scene5 ? 'aFlyAway 1.9s ease-in both'
                  : 'none',
                transition: 'right 1.6s ease, bottom 1.6s ease',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Punch impact graphic — lands between M and D on each strike */}
          {flash && sceneFight && !reduceMotion && (
            <img
              key={`pfx-${impact}`} src={ART.punchFx} alt="" aria-hidden
              style={{
                position: 'absolute', left: '4%', top: '40%', width: '34%',
                animation: 'punchFxAnim .55s ease-out both',
                zIndex: 4, pointerEvents: 'none',
              }}
            />
          )}
        </>
      )}

      {/* Climax: full scene golden blaze */}
      {isClimax && !reduceMotion && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 35%, rgba(255,240,200,.6), transparent 70%)',
          animation: 'climaxBlaze 1.6s ease-out both',
          pointerEvents: 'none',
        }} />
      )}

      {/* Strike impact effects (shared VFX, every phrase) */}
      {flash && !reduceMotion && (
        <>
          {/* Central bloom */}
          <div key={`bloom-${impact}`} aria-hidden style={{
            position: 'absolute', left: '42%', top: '46%', width: '30%', aspectRatio: '1',
            borderRadius: '50%', transform: 'translate(-50%,-50%)',
            background: 'radial-gradient(circle, rgba(255,252,226,.98), rgba(255,215,100,.65) 22%, rgba(255,207,104,0) 70%)',
            animation: 'impactBloom .65s ease-out both',
            pointerEvents: 'none',
          }} />
          {/* Secondary ring bloom */}
          <div aria-hidden style={{
            position: 'absolute', left: '42%', top: '46%', width: '48%', aspectRatio: '1',
            borderRadius: '50%', transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, transparent 35%, ${vfx.accent}40 55%, transparent 72%)`,
            animation: 'impactBloom2 .65s .08s ease-out both',
            pointerEvents: 'none',
          }} />
          {/* Spirit sweep across scene */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(108deg, transparent 28%, rgba(191,233,255,.72) 50%, rgba(255,222,153,.38) 57%, transparent 76%)',
            animation: 'strikeFlash .65s ease-out both',
            pointerEvents: 'none',
          }} />
          {/* Edge flare */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            boxShadow: `inset 0 0 40px ${vfx.accent}55`,
            animation: 'edgeFlare .55s ease-out both',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Ally lights beside the boy */}
      {Array.from({ length: Math.min(3, allyAcks) }).map((_, i) => (
        <span key={i} aria-hidden style={{
          position: 'absolute', right: `${22 + i * 9}%`, bottom: `${52 + i * 7}%`,
          width: 16, height: 16, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(191,233,255,1) 20%, rgba(191,233,255,0))',
          boxShadow: '0 0 10px rgba(191,233,255,.8)',
          animation: `allyIn .7s ${i * 0.18}s ease both, allyPulse 2.5s ${0.7 + i * 0.18}s ease-in-out infinite`,
        }} />
      ))}

      {/* Battle vignette overlay (deepens with burn) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
        boxShadow: `inset 0 0 ${30 + burn * 40}px rgba(12,14,41,${0.3 + burn * 0.25})`,
        transition: 'box-shadow 1s ease',
      }} />

      <style>{`
        @keyframes strikeFlash   { 0%{opacity:0} 20%{opacity:1} 100%{opacity:0} }
        @keyframes allyIn        { from{opacity:0;transform:scale(.3)} to{opacity:1;transform:scale(1)} }
        @keyframes allyPulse     { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.7} }
        @keyframes impactBloom   { 0%{opacity:0;transform:translate(-50%,-50%) scale(.12)} 30%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)} }
        @keyframes impactBloom2  { 0%{opacity:0;transform:translate(-50%,-50%) scale(.25)} 35%{opacity:.8} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.5)} }
        @keyframes edgeFlare     { 0%{opacity:0} 25%{opacity:1} 100%{opacity:0} }
        @keyframes mVictoryPop   { 0%{transform:scaleX(1) translateY(6%) scale(.92)} 55%{transform:scaleX(1) translateY(-2%) scale(1.05)} 100%{transform:scaleX(1) translateY(0) scale(1)} }
        @keyframes dHit          { 0%{transform:translate(0,0) rotate(0)} 22%{transform:translate(-11%,2%) rotate(-9deg)} 60%{transform:translate(5%,-1%) rotate(4deg)} 100%{transform:translate(0,0) rotate(0)} }
        @keyframes aFlyIn        { 0%{opacity:0;transform:translateX(45%) translateY(-18%) scale(.7)} 100%{opacity:1;transform:translateX(0) translateY(0) scale(1)} }
        @keyframes aFlyAway      { 0%{opacity:1;transform:translateX(0) translateY(0) scale(1)} 100%{opacity:0;transform:translateX(55%) translateY(-45%) scale(.55)} }
        @keyframes punchFxAnim   { 0%{opacity:0;transform:scale(.3) rotate(-14deg)} 30%{opacity:1;transform:scale(1.1) rotate(5deg)} 100%{opacity:0;transform:scale(1.35) rotate(10deg)} }
        /* Scene 1 — fear & temptation */
        @keyframes s1Tremble     { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-1.5px)} 50%{transform:translateX(1px)} 75%{transform:translateX(-1px)} }
        @keyframes s1TrembleHard { 0%,100%{transform:translateX(0) rotate(0)} 20%{transform:translateX(-2.5px) rotate(-.6deg)} 45%{transform:translateX(2px) rotate(.5deg)} 70%{transform:translateX(-2px) rotate(-.4deg)} }
        @keyframes dIdleSway     { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-3%) rotate(2deg)} }
        @keyframes dBounce       { 0%{transform:translateY(0) scale(1)} 35%{transform:translateY(-7%) scale(1.03)} 70%{transform:translateY(0) scale(1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes dWhisper      { 0%,100%{transform:translate(0,0) rotate(0)} 50%{transform:translate(1.5%,-1%) rotate(1.5deg)} }
        @keyframes whisperFloat  { 0%{opacity:0;transform:translate(0,0) scale(.6)} 30%{opacity:.7} 100%{opacity:0;transform:translate(14px,-16px) scale(1.1)} }
        @keyframes climaxBlaze   { 0%{opacity:0} 25%{opacity:1} 100%{opacity:0} }
        @keyframes peaceSettle   { 0%{opacity:0;transform:translateY(-12%)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes emberFloat    { 0%,100%{transform:translateY(0) scale(1);opacity:.7} 50%{transform:translateY(-18px) scale(.7);opacity:1} }
        @keyframes wispDrift     { 0%,100%{transform:translateX(0) scaleX(1);opacity:.35} 50%{transform:translateX(14px) scaleX(1.3);opacity:.65} }
        @keyframes glintPulse    { 0%,100%{transform:scale(.5) rotate(0deg);opacity:.2} 50%{transform:scale(1.2) rotate(45deg);opacity:.85} }
        @keyframes mistDrift     { 0%,100%{transform:translateX(0);opacity:.25} 50%{transform:translateX(20px);opacity:.5} }
        @keyframes chainPulse    { 0%,100%{transform:translateY(0) rotate(0deg);opacity:.35} 50%{transform:translateY(-5px) rotate(8deg);opacity:.7} }
        @keyframes battleStars   { 0%,100%{opacity:.4;transform:translateY(0)} 50%{opacity:.85;transform:translateY(-4px)} }
        .battle-stars            { animation:battleStars 5.5s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .battle-stars{animation:none} }
      `}</style>
    </div>
  );
}
