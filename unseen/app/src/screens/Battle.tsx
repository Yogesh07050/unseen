import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scene } from '../scene/Scene';
import { useBattle } from '../battle/useBattle';
import { useSettings, useUi } from '../store';
import { pickMime } from '../engines/audio';
import { api } from '../ai/api';
import { matchPhrase, norm } from '../engines/matcher';
import { VerseSkeleton } from '../components/ui';

type Mode = 'idle' | 'starting' | 'recording' | 'transcribing';

// ─── Audio constants ────────────────────────────────────────────────────────
const SILENCE_THRESHOLD = 0.06;  // 0–1 RMS level below which we count as silent
const SILENCE_WAIT_MS   = 1300;  // ms of silence before sending chunk to Whisper
const MIN_BLOB_BYTES    = 1500;  // ignore blobs smaller than this
const MATCH_THRESHOLD   = 0.55;  // fuzzy phrase match threshold (slightly lower for real-time)

// ─── Component ──────────────────────────────────────────────────────────────
export function Battle() {
  const navigate  = useNavigate();
  const { settings }   = useSettings();
  const { showToast }  = useUi();
  const { ctx, state, strike, cancel } = useBattle();
  const [, force]  = useState(0);
  const [introPlaying, setIntroPlaying] = useState(false); // Scene 1 cinematic intro
  const [mode, setMode]   = useState<Mode>('idle');
  const [heardText, setHeardText]   = useState('');

  // ── Audio refs ─────────────────────────────────────────────────────────
  const streamRef    = useRef<MediaStream | null>(null);
  const recRef       = useRef<MediaRecorder | null>(null);
  const acRef        = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const mimeRef      = useRef('audio/webm');
  const extRef       = useRef('webm');
  const busyRef      = useRef(false);          // processing a Whisper chunk
  const lastSpeechRef = useRef(Date.now());
  const levelIntervalRef = useRef<number | null>(null);

  // ── TTS refs ────────────────────────────────────────────────────────────
  const speechCacheRef = useRef(new Map<string, Blob>());
  const audioElRef     = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef    = useRef<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────
  const fullVerseText = ctx?.verse?.phrases.join(' ') ?? '';

  // Pre-fetch TTS for the whole verse so "Read it to me" is instant
  useEffect(() => {
    if (!fullVerseText) return;
    if (speechCacheRef.current.has(fullVerseText)) return;
    let alive = true;
    void api.speak(fullVerseText).then(b => { if (alive) speechCacheRef.current.set(fullVerseText, b); }).catch(() => {});
    return () => { alive = false; };
  }, [fullVerseText]);

  // Navigate to peace on climax — wait for the finale to play out (angel flies
  // away, then the devil dissolves completely) before moving on.
  useEffect(() => {
    if (state === 'climax') {
      stopRealtimeVoice();
      const delay = settings?.reduceMotion ? 1600 : 5000;
      const t = setTimeout(() => navigate('/peace', { replace: true }), delay);
      return () => clearTimeout(t);
    }
  }, [state, navigate, settings?.reduceMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopRealtimeVoice(); releaseAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Real-time Whisper helpers ──────────────────────────────────────────

  function startFreshRecorder() {
    if (!streamRef.current) return;
    const mime = pickMime();
    mimeRef.current = mime || 'audio/webm';
    extRef.current  = mimeRef.current.includes('mp4') ? 'mp4' : 'webm';
    const opts: MediaRecorderOptions = mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {};
    let r: MediaRecorder;
    try { r = new MediaRecorder(streamRef.current, opts); }
    catch { try { r = new MediaRecorder(streamRef.current, { mimeType: mime }); } catch { r = new MediaRecorder(streamRef.current); } }
    chunksRef.current = [];
    r.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    r.start(250);
    recRef.current = r;
  }

  // Stop recorder and collect all its chunks (returns them + clears buffer)
  function stopRecorderAndCollect(): Promise<Blob[]> {
    return new Promise(resolve => {
      const rec = recRef.current;
      const snap = [...chunksRef.current];
      chunksRef.current = [];
      if (!rec || rec.state !== 'recording') { resolve(snap); return; }
      rec.onstop = () => {
        // ondataavailable may still fire after stop — grab anything that landed
        const final = [...snap, ...chunksRef.current];
        chunksRef.current = [];
        resolve(final);
      };
      try { rec.requestData(); rec.stop(); } catch { resolve(snap); }
    });
  }

  async function startRealtimeVoice() {
    setMode('starting');
    setHeardText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Level meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ac = new AudioCtx() as AudioContext;
      await ac.resume();
      acRef.current = ac;
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      startFreshRecorder();
      lastSpeechRef.current = Date.now();
      busyRef.current = false;

      // Silence-detection + level loop
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let smoothed = 0;
      levelIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i];
        const raw = sum / buf.length / 255;
        smoothed = smoothed * 0.72 + raw * 0.28;
        const lvl = Math.min(1, smoothed * 2.6);

        if (lvl > SILENCE_THRESHOLD) {
          lastSpeechRef.current = Date.now();
        } else if (
          !busyRef.current &&
          chunksRef.current.length >= 3 &&
          Date.now() - lastSpeechRef.current > SILENCE_WAIT_MS
        ) {
          void processChunk();
        }
      }, 150);

      setMode('recording');
    } catch {
      setMode('idle');
      showToast('No microphone — tap each phrase to strike.');
    }
  }

  async function processChunk() {
    if (busyRef.current) return;
    busyRef.current = true;
    setMode('transcribing');

    // Grab the current recording as a complete file
    const chunks = await stopRecorderAndCollect();

    // Immediately restart for the next phrase (keeps mic live)
    startFreshRecorder();
    lastSpeechRef.current = Date.now();

    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: mimeRef.current });
      if (blob.size >= MIN_BLOB_BYTES) {
        try {
          const { text } = await api.transcribe(blob, extRef.current);
          const heard = text.trim();
          if (heard) {
            setHeardText(heard);
            await landStrikes(heard);
          }
        } catch { /* continue */ }
      }
    }

    busyRef.current = false;
    // Only go back to recording if we haven't reached climax
    if (useBattle.getState().state === 'fighting') setMode('recording');
  }

  // Match transcribed text against current + subsequent phrases and strike each match
  async function landStrikes(transcript: string): Promise<void> {
    const tokens = norm(transcript);
    let offset = 0;
    while (true) {
      const cur = useBattle.getState().ctx;
      if (!cur?.verse || useBattle.getState().state !== 'fighting') break;
      const phrase = cur.verse.phrases[cur.phraseIndex];
      if (!phrase) break;
      const res = matchPhrase(phrase, tokens, { phraseIndex: cur.phraseIndex, offset }, MATCH_THRESHOLD);
      if (!res.struck) break;
      offset = Math.min(tokens.length, offset + norm(phrase).length);
      strike();
      force(n => n + 1);
      await new Promise(r => setTimeout(r, 480));
    }
  }

  function stopRealtimeVoice() {
    if (levelIntervalRef.current) { clearInterval(levelIntervalRef.current); levelIntervalRef.current = null; }
    try { recRef.current?.stop(); } catch { }
    streamRef.current?.getTracks().forEach(t => t.stop());
    acRef.current?.close().catch(() => {});
    streamRef.current = null; recRef.current = null; acRef.current = null; analyserRef.current = null;
    busyRef.current = false;
    setMode('idle');
  }

  // ── TTS helpers ──────────────────────────────────────────────────────────

  function releaseAudio() {
    audioElRef.current?.pause();
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; }
    audioElRef.current = null;
  }

  // Read the whole verse aloud, start to finish
  function playVerse() {
    const v = useBattle.getState().ctx?.verse;
    if (!v) return;
    const fullText = v.phrases.join(' ');
    const cached = speechCacheRef.current.get(fullText);
    if (!cached) {
      setTtsLoading(true);
      void api.speak(fullText).then(b => {
        speechCacheRef.current.set(fullText, b);
        setTtsLoading(false);
        doPlay(b);
      }).catch(() => { setTtsLoading(false); showToast('Voice playback failed. Try again.'); });
      return;
    }
    doPlay(cached);
  }

  function doPlay(blob: Blob) {
    releaseAudio();
    // Pause mic while TTS plays so Whisper doesn't hear the playback
    if (recRef.current?.state === 'recording') { try { recRef.current.pause(); } catch { } }
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    const audio = new Audio(url);
    audioElRef.current = audio;
    audio.onended = audio.onerror = () => {
      releaseAudio();
      // Resume mic
      if (recRef.current?.state === 'paused') { try { recRef.current.resume(); lastSpeechRef.current = Date.now(); } catch { } }
    };
    void audio.play().catch(() => {
      releaseAudio();
      if (recRef.current?.state === 'paused') { try { recRef.current.resume(); } catch { } }
    });
  }

  // ── Tap-to-strike fallback ───────────────────────────────────────────────
  function tapStrike() {
    if (!ctx || state !== 'fighting') return;
    strike();
    force(n => n + 1);
  }

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!ctx) return null;
  if (!ctx.verse) return (
    <div className="screen">
      <button className="icon-btn" onClick={() => { cancel(); navigate('/', { replace: true }); }}>Leave battle</button>
      <VerseSkeleton lines={5} />
    </div>
  );

  const verse = ctx.verse;
  const total = verse.phrases.length;

  const statusLine =
    state === 'climax'        ? 'The scroll is nailed to the cross.' :
    mode  === 'starting'      ? 'Starting microphone…' :
    mode  === 'transcribing'  ? 'Hearing you…' :
    mode  === 'recording'     ? 'Whisper is listening — read the verse aloud' :
    ctx.phraseIndex === 0     ? 'Read it aloud, or tap each phrase' :
    ctx.phraseIndex === 1     ? 'First strike — keep reading' :
    ctx.phraseIndex === 2     ? 'Second strike — keep reading' :
    ctx.phraseIndex === 3     ? 'Third strike — keep reading' :
                                'Keep reading';

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)',
      paddingLeft: 18,
      paddingRight: 18,
      gap: 8,
      boxSizing: 'border-box',
    }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button className="icon-btn" onClick={() => { stopRealtimeVoice(); releaseAudio(); cancel(); navigate('/', { replace: true }); }}>
          ← Leave
        </button>
        <span className="tiny" style={{ color: 'var(--faint)', letterSpacing: '.4px' }}>{verse.reference}</span>
      </div>

      {/* ── Battle scene — fills the available space so there is no empty surround ───────── */}
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative' }}>
        <Scene
          archetype={ctx.archetype ?? 'shadow'}
          lie={ctx.discernment?.lie ?? ''}
          phraseIndex={ctx.phraseIndex}
          totalPhrases={total}
          state={state === 'climax' ? 'climax' : 'fighting'}
          allyAcks={ctx.allyAcks}
          symbolic={settings?.battleStyle === 'symbolic'}
          reduceMotion={settings?.reduceMotion}
          onIntroChange={setIntroPlaying}
          fill
        />
      </div>

      {/* ── Ally acknowledgement ───────────────────────────── */}
      {ctx.allyAcks > 0 && (
        <p className="small" style={{ textAlign: 'center', color: 'var(--spirit)', margin: 0, flexShrink: 0 }}>
          An ally is praying for you right now.
        </p>
      )}

      {/* ── Verse vellum ───────────────────────────────────── */}
      <div className="vellum" style={{ flexShrink: 0, font: '400 16px/1.42 var(--serif)', padding: '12px 14px 10px',
        opacity: introPlaying ? 0 : 1, pointerEvents: introPlaying ? 'none' : undefined, transition: 'opacity .6s ease' }}>
        {verse.phrases.map((p, i) => (
          <span
            key={i}
            onClick={() => { if (i === ctx.phraseIndex && state === 'fighting') tapStrike(); }}
            style={{
              borderBottom: i < ctx.phraseIndex ? '2px solid var(--illumination)' : 'none',
              background: i === ctx.phraseIndex && state === 'fighting' ? 'rgba(0,168,225,.20)' : 'transparent',
              cursor: i === ctx.phraseIndex && state === 'fighting' ? 'pointer' : 'default',
              borderRadius: 2,
            }}
          >{p}{i < verse.phrases.length - 1 ? ' ' : ''}</span>
        ))}
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-muted)', marginTop: 6 }}>
          {verse.reference}, Berean Standard Bible
        </div>
      </div>

      {/* ── Phrase progress dots + status ──────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        opacity: introPlaying ? 0 : 1, pointerEvents: introPlaying ? 'none' : undefined, transition: 'opacity .6s ease' }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {verse.phrases.map((_, i) => (
            <span key={i} style={{
              width: 9, height: 9, borderRadius: '50%', display: 'inline-block',
              background: i < ctx.phraseIndex ? 'var(--gold)' : 'var(--line-strong)',
              transition: 'background .2s',
            }} />
          ))}
        </div>
        <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>{statusLine}</p>
        {/* Heard transcript feedback */}
        {heardText && mode !== 'transcribing' && (
          <p className="tiny" style={{ margin: 0, color: 'var(--faint)', fontStyle: 'italic', textAlign: 'center' }}>
            Heard: "{heardText.slice(0, 60)}{heardText.length > 60 ? '…' : ''}"
          </p>
        )}
      </div>

      {/* ── Controls ───────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        opacity: introPlaying ? 0 : 1, pointerEvents: introPlaying ? 'none' : undefined, transition: 'opacity .6s ease' }}>
        {/* TTS: Read it to me */}
        {state === 'fighting' && mode !== 'transcribing' && (
          <button className="icon-btn" disabled={ttsLoading} onClick={playVerse}>
            {ttsLoading ? 'Preparing…' : 'Read it to me'}
          </button>
        )}

        {/* Voice controls */}
        {mode === 'idle' && state === 'fighting' && (
          <button className="icon-btn" style={{ color: 'var(--gold-hi)' }} onClick={() => void startRealtimeVoice()}>
            Read the verse aloud
          </button>
        )}
        {mode === 'starting' && (
          <button className="icon-btn" disabled>Starting microphone…</button>
        )}
        {mode === 'recording' && (
          <button className="icon-btn" style={{ color: 'var(--gold-hi)' }} onClick={stopRealtimeVoice}>
            Done reading
          </button>
        )}
        {mode === 'transcribing' && (
          <button className="icon-btn" disabled style={{ color: 'var(--spirit)' }}>Hearing…</button>
        )}

        {/* Tap-to-strike: always available while fighting */}
        {state === 'fighting' && (
          <button className="icon-btn" style={{ color: 'var(--gold-hi)' }} onClick={tapStrike}>
            Tap to strike
          </button>
        )}
      </div>
    </div>
  );
}
