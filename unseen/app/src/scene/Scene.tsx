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

// Character pose library — M (boy, centre), D (devil, left), A (angel, right).
const ART = {
  // Boy (M)
  mFear:      '/art/m-fear.svg',        // afraid (scenes 1–2)
  mGetScroll: '/art/m-get-scroll.svg',  // reaching for the scroll (scene 3a)
  mReadScroll:'/art/m-read-scroll.svg', // reading the scroll (scene 3b)
  mReady:     '/art/m-ready.svg',       // armed & squared up (scene 3c + between strikes)
  mPunch:     '/art/m-punch.svg',       // throwing a punch (on each strike)
  mVictory:   '/art/m-victory.svg',     // hands raised in victory (finale)
  // Devil (D)
  dEarSecret: '/art/d-ear-secret.svg',  // whispering in the ear (scene 1)
  dConfused:  '/art/d-confused.svg',    // rattled (scenes 2–3, between strikes)
  dHit:       '/art/d-hit.svg',         // getting beaten on a strike (fight)
  dDefeated:  '/art/d-defeated.svg',    // defeated (finale)
  // Angel (A)
  aFly:       '/art/a-fly.svg',         // flying in / offering the scroll (scenes 2–3a)
  aWatch:     '/art/a-watch.svg',       // after handing over the scroll (scene 3b, fight)
  aBye:       '/art/a-bye.svg',         // waving goodbye (finale)
  // FX
  punchFx:    '/art/punch-effect.svg',
};

// Environment particles — oppression flecks (dark/red) and hope sparkles (light).
const ENV_MOTES = [
  { left: '16%', top: '38%', s: 4, red: true,  delay: 0,   dur: 5.5 },
  { left: '30%', top: '30%', s: 3, red: false, delay: 1.2, dur: 6.4 },
  { left: '68%', top: '34%', s: 4, red: true,  delay: 0.6, dur: 5.0 },
  { left: '82%', top: '44%', s: 3, red: false, delay: 2.0, dur: 6.8 },
  { left: '48%', top: '26%', s: 3, red: true,  delay: 1.6, dur: 5.8 },
  { left: '10%', top: '52%', s: 3, red: false, delay: 2.6, dur: 6.0 },
];
const ENV_SPARKS = [
  { left: '20%', top: '30%', s: 5, delay: 0,   dur: 4.2 },
  { left: '34%', top: '20%', s: 4, delay: 0.8, dur: 4.8 },
  { left: '50%', top: '26%', s: 6, delay: 1.5, dur: 3.9 },
  { left: '64%', top: '18%', s: 4, delay: 0.5, dur: 4.6 },
  { left: '78%', top: '30%', s: 5, delay: 2.0, dur: 4.3 },
  { left: '44%', top: '40%', s: 3, delay: 2.6, dur: 5.0 },
  { left: '88%', top: '44%', s: 4, delay: 1.1, dur: 4.4 },
];


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
  // Cinematic intro phase (while fighting & phraseIndex === 0):
  //   0 S1 establish            1 S1 D notices + edges in
  //   2 S1 whispers in the ear  3 S1 D pulls back, satisfied
  //   4 S2 angel flies in       5 S3 M reaches for the scroll
  //   6 S3 M reads the scroll   7 S3 M squares up → tap game begins
  const [ip, setIp] = useState(0);
  const prev = useRef(phraseIndex);
  const vfx = ARCH_VFX[archetype] ?? ARCH_VFX.shadow;
  const burn = totalPhrases ? Math.min(1, phraseIndex / totalPhrases) : 0;

  const atStart = state === 'fighting' && phraseIndex === 0;

  useEffect(() => {
    if (reduceMotion) { setIntroDone(true); return; }
    if (atStart) {
      setIntroDone(false);
      setIp(0);
      const timers = [
        setTimeout(() => setIp(1), 1000), // S1: D notices, edges in
        setTimeout(() => setIp(2), 2000), // S1: whispers in the ear
        setTimeout(() => setIp(3), 3600), // S1: pulls back, satisfied
        setTimeout(() => setIp(4), 4400), // S2: angel flies in
        setTimeout(() => setIp(5), 5800), // S3: M reaches for the scroll
        setTimeout(() => setIp(6), 7000), // S3: M reads the scroll
        setTimeout(() => setIp(7), 8600), // S3: M squares up
        setTimeout(() => setIntroDone(true), 9800), // → tap game
      ];
      return () => timers.forEach(clearTimeout);
    }
    setIntroDone(true);
  }, [atStart, reduceMotion]);

  // Let the parent (Battle) hide its controls while the cinematic intro plays.
  const introActive = !reduceMotion && atStart && !introDone;
  useEffect(() => {
    onIntroChange?.(introActive);
  }, [introActive, onIntroChange]);

  // --- Story beats ---
  const isClimax = state === 'climax';
  const isPeace = state === 'peace' || state === 'fleeing';
  const finale = isClimax || isPeace;              // victory: devil defeated → dissolves, angel waves off
  const sc1 = introActive && ip <= 3;              // Scene 1 — fear + whisper (no angel yet)
  const sceneFight = state === 'fighting' && phraseIndex > 0; // tap game — one punch per phrase

  const showAngel = !sc1;                           // angel is on stage from Scene 2 onward
  // The boxing poses (ready / punch) already face LEFT toward the devil — no flip needed.

  // Finale choreography (on the last punch / climax):
  //   0 defeated devil + angel still present   1 angel flies away
  //   2 devil dissolves completely             3 devil gone → Battle navigates on
  const [fp, setFp] = useState(0);
  useEffect(() => {
    if (!isClimax) return;              // fight: fp stays 0 (unused); peace: handled by isPeace
    if (reduceMotion) { setFp(3); return; }
    setFp(0);
    const timers = [
      setTimeout(() => setFp(1), 700),  // angel begins flying away
      setTimeout(() => setFp(2), 3000), // angel gone → devil starts to dissolve
      setTimeout(() => setFp(3), 4600), // devil fully dissolved
    ];
    return () => timers.forEach(clearTimeout);
  }, [isClimax, reduceMotion]);

  // Trigger approach entrance on first render.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // On the peace page, force the compositor to drop any stale backing store left
  // behind by the devil's dissolve on the previous screen (otherwise a ghost of
  // his last frame can linger in the GPU layer).
  const rootRef = useRef<HTMLDivElement>(null);

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

  // Pose for the tap game / finale branch (the cinematic intro picks its own inline).
  const mSrc =
    finale ? ART.mVictory :
    punching ? ART.mPunch :              // on each strike
    ART.mReady;                          // armed & ready between strikes

  const dSrc =
    finale ? ART.dDefeated :
    flash ? ART.dHit :                   // getting beaten on a strike
    ART.dConfused;                       // rattled between strikes

  const aSrc = finale ? ART.aBye : ART.aWatch; // fight: watching; finale: waving off

  // Every character is sized by HEIGHT (not width) so M, D and A stand the same
  // height, and they share one baseline (GROUND) so the composition sits centred.
  const CH = 34;                 // character height, % of the scene
  const GROUND = '30%';          // feet baseline — raised so the cast sits at the visual centre
  const D_LEFT = '4%', M_LEFT = '40%', A_LEFT = '61%'; // evenly spaced: devil · boy · angel

  // Environment light level: 0 = dark & oppressive, 1 = full hopeful light.
  // The story drives it; CSS transitions make the shift feel like the world changing.
  const light =
    isPeace ? 1 :
    isClimax ? (fp >= 2 ? 0.95 : 0.2) :                 // victory: darkness breaks as the devil dissolves
    sceneFight ? Math.min(0.24, 0.05 + burn * 0.2) :    // fight: tension slowly lifting with progress
    0;                                                   // fear / control: full dark
  const victoryBreak = isClimax && fp >= 2;              // the instant the darkness shatters
  const grown = isPeace || (isClimax && fp >= 2);        // boy grows once the darkness breaks

  return (
    <div ref={rootRef} style={{
      position: 'relative', width: '100%',
      aspectRatio: fill ? 'auto' : '390 / 440',
      height: fill ? '100%' : undefined,
      borderRadius: 16, overflow: 'hidden',
      background: '#0B0614',
      border: '1px solid var(--line)',
    }}>

      {/* ── ENVIRONMENT (reacts to the story) ─────────────────────────────── */}
      {/* Oppressive night sky — the base world */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(125% 100% at 50% 20%, #2C1A42 0%, #1A1030 48%, #0B0614 100%)',
      }} />
      {/* Pressure: a dark-red glow welling from below + crushing dark edges — fades as light grows */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 1 - light, transition: 'opacity 1.6s ease',
        background: [
          'radial-gradient(85% 60% at 50% 112%, rgba(156,22,56,.5), transparent 60%)',
          'radial-gradient(140% 125% at 50% 32%, transparent 52%, rgba(5,2,12,.9) 100%)',
        ].join(','),
      }} />
      {/* Hopeful dawn sky — rises in as the boy overcomes */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: light, transition: 'opacity 1.8s ease',
        background: 'linear-gradient(180deg, #A9D2FF 0%, #D6EAFF 28%, #FBF1DC 56%, #FFE3B3 80%, #FFD38C 100%)',
      }} />
      {/* Soft clouds (only in the light) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', filter: 'blur(3px)',
        opacity: light, transition: 'opacity 1.8s ease',
        background: [
          'radial-gradient(38% 20% at 22% 26%, rgba(255,255,255,.8), transparent 70%)',
          'radial-gradient(32% 17% at 80% 22%, rgba(255,255,255,.72), transparent 70%)',
          'radial-gradient(46% 22% at 55% 14%, rgba(255,255,255,.6), transparent 72%)',
        ].join(','),
      }} />
      {/* Light breaking from above — god-rays (victory & peace) */}
      <div aria-hidden className={reduceMotion ? '' : 'env-rays'} style={{
        position: 'absolute', inset: '-20% 0 0 0', pointerEvents: 'none',
        opacity: light * 0.75, transition: 'opacity 1.8s ease',
        background: 'repeating-conic-gradient(from 0deg at 50% -8%, rgba(255,247,219,0) 0deg, rgba(255,247,219,.16) 2.2deg, rgba(255,247,219,0) 5deg, rgba(255,247,219,0) 9deg)',
        WebkitMaskImage: 'radial-gradient(90% 85% at 50% 0%, #000 10%, transparent 78%)',
        maskImage: 'radial-gradient(90% 85% at 50% 0%, #000 10%, transparent 78%)',
      }} />

      {/* Character spotlight — keeps the cast prominent. Cool while oppressed, warm in victory. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.9 - light * 0.5, transition: 'opacity 1.4s ease',
        background: 'radial-gradient(52% 46% at 50% 52%, rgba(176,166,214,.22), transparent 70%)',
      }} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: light, transition: 'opacity 1.6s ease',
        background: 'radial-gradient(60% 54% at 50% 50%, rgba(255,244,206,.5), transparent 72%)',
      }} />

      {/* Oppression motes — dark/red flecks drifting in the fear & fight (fade with light) */}
      {!reduceMotion && light < 0.6 && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 1 - light, transition: 'opacity 1.2s ease' }}>
          {ENV_MOTES.map((p, i) => (
            <span key={i} style={{
              position: 'absolute', left: p.left, top: p.top, width: p.s, height: p.s, borderRadius: '50%',
              background: p.red ? 'rgba(210,70,90,.55)' : 'rgba(150,130,190,.4)',
              boxShadow: p.red ? '0 0 6px rgba(210,70,90,.5)' : 'none',
              animation: `moteRise ${p.dur}s ${p.delay}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Sparkles of light — rise once hope returns (victory & peace) */}
      {!reduceMotion && light > 0.35 && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: light, transition: 'opacity 1.6s ease' }}>
          {ENV_SPARKS.map((p, i) => (
            <span key={i} style={{
              position: 'absolute', left: p.left, top: p.top, width: p.s, height: p.s,
              background: 'radial-gradient(circle, #FFF8E6 35%, rgba(255,230,160,.6) 60%, transparent)',
              borderRadius: '50%', boxShadow: '0 0 6px rgba(255,236,180,.9)',
              animation: `sparkFloat ${p.dur}s ${p.delay}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Victory burst — a single wave of light when the darkness shatters */}
      {victoryBreak && !reduceMotion && (
        <div aria-hidden style={{
          position: 'absolute', left: '50%', top: '46%', width: '40%', aspectRatio: '1',
          transform: 'translate(-50%,-50%)', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,251,235,.95), rgba(255,235,180,.5) 35%, transparent 70%)',
          animation: 'victoryBurst 1.8s ease-out both',
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
      ) : introActive ? (
        /* ── CINEMATIC INTRO (Scenes 1–3) ─────────────────────────────────
           ip 0–3  Scene 1: D whispers the lie in M's ear, M afraid
           ip 4    Scene 2: A flies in
           ip 5    Scene 3: M reaches for the scroll
           ip 6    Scene 3: M opens the scroll → the tap game begins
           Each character is a nested div (outer = staged movement, inner =
           looping motion) so poses/positions cross-fade without a jump. */
        <>
          {/* DEVIL (D) — whispers (ip 0–3), then stands rattled (ip 4–6) */}
          <div style={{
            position: 'absolute', left: D_LEFT, bottom: GROUND, height: `${CH}%`, width: 'auto',
            transformOrigin: '50% 100%',
            opacity: mounted ? 1 : 0,
            transform: !mounted ? 'translateY(26%)'
              : ip === 1 ? 'translate(12%, 0) rotate(1deg)'
              : ip === 2 ? 'translate(32%, 0) rotate(5deg)'   // lean to M's ear
              : ip === 3 ? 'translate(18%, 0) rotate(2deg)'   // pull back
              : 'translate(0, 0) rotate(0deg)',               // ip 0 and ip ≥ 4: at rest
            transition: 'transform .9s cubic-bezier(.3,.9,.4,1), opacity .6s ease',
            pointerEvents: 'none',
          }}>
            <img src={ip <= 3 ? ART.dEarSecret : ART.dConfused} alt="" aria-hidden style={{
              height: '100%', width: 'auto', display: 'block', transformOrigin: '60% 70%',
              filter: 'none',
              animation: reduceMotion ? 'none'
                : ip === 0 ? 'dIdleSway 3.2s ease-in-out infinite'
                : ip === 1 ? 'dBounce .6s ease-out'
                : ip === 2 ? 'dWhisper 1.1s ease-in-out infinite'
                : 'none',
            }} />
          </div>

          {/* Whisper wisps */}
          {(ip === 2 || ip === 3) && !reduceMotion && (
            <div aria-hidden style={{ position: 'absolute', left: '40%', top: '46%', pointerEvents: 'none' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  position: 'absolute', left: i * 9, top: -i * 5,
                  width: 6 + i * 2, height: 6 + i * 2, borderRadius: '50%',
                  border: '1.5px solid rgba(150,140,180,.5)',
                  animation: `whisperFloat 1.7s ${i * 0.32}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          )}

          {/* BOY (M) — afraid → reaches for the scroll → opens it */}
          <div style={{
            position: 'absolute', left: M_LEFT, bottom: GROUND, height: `${CH}%`, width: 'auto',
            transformOrigin: '50% 100%',
            opacity: mounted ? 1 : 0,
            transform: !mounted ? 'translateY(26%)'
              : (ip === 2 || ip === 3) ? 'translateX(6%) rotate(1.5deg)' // lean from the whisper
              : 'translateX(0) rotate(0deg)',
            transition: 'transform .7s cubic-bezier(.3,.9,.4,1), opacity .6s ease',
            pointerEvents: 'none',
          }}>
            <img src={ip <= 4 ? ART.mFear : ip === 5 ? ART.mGetScroll : ip === 6 ? ART.mReadScroll : ART.mReady} alt="" aria-hidden style={{
              height: '100%', width: 'auto', display: 'block', transformOrigin: '50% 100%',
              filter: 'none',
              animation: (reduceMotion || ip > 3) ? 'none'
                : ip >= 2 ? 's1TrembleHard .3s ease-in-out infinite'
                : 's1Tremble .5s ease-in-out infinite',
            }} />
          </div>

          {/* ANGEL (A) — flies in at Scene 2, hovers while the scroll changes hands */}
          {ip >= 4 && (
            <div style={{
              position: 'absolute', left: A_LEFT, bottom: GROUND, height: `${CH}%`, width: 'auto',
              transformOrigin: '50% 100%', pointerEvents: 'none',
            }}>
              <img src={ip <= 5 ? ART.aFly : ART.aWatch} alt="" aria-hidden style={{
                height: '100%', width: 'auto', display: 'block',
                filter: 'none',
                animation: reduceMotion ? 'none'
                  : ip === 4 ? 'aFlyIn .9s ease-out both'
                  : 'aHover 3s ease-in-out infinite',
              }} />
            </div>
          )}
        </>
      ) : (
        /* ── TAP GAME + FINALE ─────────────────────────────────────────────
           Fight: M punches D once per phrase, A watches.
           Finale (sequenced on the last punch): D stays defeated while A waves
           and flies away, THEN D dissolves completely, THEN Battle moves on.
           Every character stays the same height (CH). */
        <>
          {/* DEVIL (D) — defeated, then melts into nothing once the angel has gone (fp ≥ 2).
              The blur makes the fade read as a soft dissolution (and hides SVG rasterisation).
              Unmounts the instant he's fully dissolved (fp ≥ 3) so no faded GPU
              layer lingers, and never renders on the peace page. */}
          {!isPeace && !(isClimax && fp >= 3) && (
          <img src={dSrc} alt="" aria-hidden style={{
            position: 'absolute',
            left: D_LEFT,
            bottom: GROUND,
            height: `${CH}%`,
            width: 'auto',
            transformOrigin: '50% 100%',
            opacity: isClimax ? (fp >= 2 ? 0 : 0.92) : 1, // defeated → dissolves → gone
            filter: 'none',
            animation: reduceMotion ? 'none' : flash ? 'dHit .5s ease-out' : 'none',
            transition: 'opacity 1.2s ease',
            pointerEvents: 'none',
          }} />
          )}

          {/* BOY (M) — victorious; grows UPWARD (feet fixed) once the darkness breaks */}
          <img src={mSrc} alt="" aria-hidden style={{
            position: 'absolute',
            left: punching ? '32%' : M_LEFT,
            bottom: GROUND,
            height: `${grown ? CH + 16 : CH}%`,       // grows taller — strength
            width: 'auto',
            transformOrigin: '50% 100%',               // anchored at the feet → growth goes up
            filter: 'none',
            animation: reduceMotion ? 'none' : finale ? 'mPopIn .6s ease-out both' : 'none',
            transition: 'left .25s ease, height .9s cubic-bezier(.2,.9,.3,1), filter .8s ease',
            pointerEvents: 'none',
          }} />

          {/* ANGEL (A) — watches in the fight; in the finale waves, then flies away (fp ≥ 1).
              Gone from the peace page (already departed). */}
          {showAngel && !isPeace && (
            <img src={aSrc} alt="" aria-hidden style={{
              position: 'absolute',
              left: A_LEFT,
              bottom: GROUND,
              height: `${CH}%`,
              width: 'auto',
              filter: 'none',
              animation: reduceMotion ? 'none'
                : (isClimax && fp >= 1) ? 'angelWaveOff 2.4s ease-in both'
                : 'aHover 3s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}

          {/* Punch impact graphic — lands between M and D on each strike */}
          {flash && sceneFight && !reduceMotion && (
            <img key={`pfx-${impact}`} src={ART.punchFx} alt="" aria-hidden style={{
              position: 'absolute', left: '16%', top: '42%', width: '28%',
              animation: 'punchFxAnim .55s ease-out both',
              zIndex: 4, pointerEvents: 'none',
            }} />
          )}
        </>
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

      {/* Edge vignette — frames & darkens the oppressive world, lifts away in the light */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
        boxShadow: `inset 0 0 70px rgba(8,4,16,${(0.55 + burn * 0.15) * (1 - light)})`,
        transition: 'box-shadow 1.4s ease',
      }} />

      <style>{`
        @keyframes strikeFlash   { 0%{opacity:0} 20%{opacity:1} 100%{opacity:0} }
        @keyframes allyIn        { from{opacity:0;transform:scale(.3)} to{opacity:1;transform:scale(1)} }
        @keyframes allyPulse     { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.7} }
        @keyframes impactBloom   { 0%{opacity:0;transform:translate(-50%,-50%) scale(.12)} 30%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)} }
        @keyframes impactBloom2  { 0%{opacity:0;transform:translate(-50%,-50%) scale(.25)} 35%{opacity:.8} 100%{opacity:0;transform:translate(-50%,-50%) scale(2.5)} }
        @keyframes edgeFlare     { 0%{opacity:0} 25%{opacity:1} 100%{opacity:0} }
        @keyframes mPopIn        { 0%{opacity:.2;transform:scale(.92)} 60%{opacity:1;transform:scale(1.02)} 100%{transform:scale(1)} }
        @keyframes dHit          { 0%{transform:translate(0,0) rotate(0)} 22%{transform:translate(-11%,2%) rotate(-9deg)} 60%{transform:translate(5%,-1%) rotate(4deg)} 100%{transform:translate(0,0) rotate(0)} }
        @keyframes aFlyIn        { 0%{opacity:0;transform:translateX(55%) translateY(-18%) scale(.7)} 100%{opacity:1;transform:translateX(0) translateY(0) scale(1)} }
        @keyframes aHover        { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5%)} }
        @keyframes angelWaveOff  { 0%{opacity:1;transform:translate(0,0) rotate(0)} 20%{transform:translate(0,-3%) rotate(-5deg)} 40%{transform:translate(0,0) rotate(5deg)} 60%{opacity:1;transform:translate(8%,-5%) rotate(0)} 100%{opacity:0;transform:translate(50%,-45%) scale(.55)} }
        @keyframes punchFxAnim   { 0%{opacity:0;transform:scale(.3) rotate(-14deg)} 30%{opacity:1;transform:scale(1.1) rotate(5deg)} 100%{opacity:0;transform:scale(1.35) rotate(10deg)} }
        /* Scene 1 — fear & temptation */
        @keyframes s1Tremble     { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-1.5px)} 50%{transform:translateX(1px)} 75%{transform:translateX(-1px)} }
        @keyframes s1TrembleHard { 0%,100%{transform:translateX(0) rotate(0)} 20%{transform:translateX(-2.5px) rotate(-.6deg)} 45%{transform:translateX(2px) rotate(.5deg)} 70%{transform:translateX(-2px) rotate(-.4deg)} }
        @keyframes dIdleSway     { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-3%) rotate(2deg)} }
        @keyframes dBounce       { 0%{transform:translateY(0) scale(1)} 35%{transform:translateY(-7%) scale(1.03)} 70%{transform:translateY(0) scale(1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes dWhisper      { 0%,100%{transform:translate(0,0) rotate(0)} 50%{transform:translate(1.5%,-1%) rotate(1.5deg)} }
        @keyframes whisperFloat  { 0%{opacity:0;transform:translate(0,0) scale(.6)} 30%{opacity:.7} 100%{opacity:0;transform:translate(14px,-16px) scale(1.1)} }
        /* Environment */
        @keyframes moteRise      { 0%,100%{transform:translate(0,0);opacity:.2} 50%{transform:translate(-4px,-14px);opacity:.8} }
        @keyframes sparkFloat    { 0%{transform:translate(0,6px) scale(.5);opacity:0} 35%{opacity:1} 100%{transform:translate(2px,-20px) scale(1);opacity:0} }
        @keyframes victoryBurst  { 0%{opacity:0;transform:translate(-50%,-50%) scale(.2)} 25%{opacity:1} 100%{opacity:0;transform:translate(-50%,-50%) scale(3.4)} }
        @keyframes envRays       { 0%{transform:rotate(-2deg)} 100%{transform:rotate(2deg)} }
        .env-rays                { transform-origin:50% 0%; animation:envRays 9s ease-in-out infinite alternate }
        @media (prefers-reduced-motion: reduce) { .env-rays{animation:none} }
      `}</style>
    </div>
  );
}
