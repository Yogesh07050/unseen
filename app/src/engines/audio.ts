// Microphone capture for Whisper speech-to-text (§6.1, OpenAI Whisper path).
// Records audio and exposes a live input level for the orb animation.

export interface Recording { blob: Blob; mimeType: string; ext: string; durationMs: number }

export interface Recorder {
  level: () => number;             // 0..1 smoothed input level
  stop: () => Promise<Recording>;  // finalises and returns the recorded audio
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  onSilence: (ms: number, cb: () => void) => void;
}

const MIME_EXT: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg',
};

export function pickMime(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return '';
  if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
  for (const t of types) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

export function voiceCaptureSupported(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

function extFor(mime: string): string {
  const base = mime.split(';')[0];
  return MIME_EXT[base] ?? 'webm';
}

export async function startRecording(): Promise<Recorder> {
  if (!voiceCaptureSupported()) throw new Error('unsupported');

  // Whisper resamples to 16 kHz mono internally; matching that reduces upload size
  // and gives the codec the least possible work to do.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 16000,
    },
  });
  const mime = pickMime();
  // 32 kbps mono opus is ample for speech; keeps payloads small for Whisper.
  const recOpts: MediaRecorderOptions = mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 };
  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream, recOpts);
  } catch {
    // Some browsers reject the bitrate hint; fall back to defaults.
    try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
    catch (error) { stream.getTracks().forEach((t) => t.stop()); throw error; }
  }
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const startedAt = Date.now();
  try { rec.start(250); }
  catch {
    try { rec.start(); }
    catch (error) { stream.getTracks().forEach((t) => t.stop()); throw error; }
  }

  // Level metering via WebAudio. Resume the context — some browsers start it suspended,
  // which would freeze the orb and make voice look broken.
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  let ac: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  try {
    if (AudioContextCtor) {
      ac = new AudioContextCtor();
      await ac.resume();
      const source = ac.createMediaStreamSource(stream);
      analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
    }
  } catch { /* recording works without the optional level meter */ }
  const buf = new Uint8Array(analyser?.frequencyBinCount ?? 0);
  let smoothed = 0;

  // Silence detection.
  let silenceCb: (() => void) | null = null;
  let silenceMs = 0;
  let paused = false;
  let lastLoud = Date.now();
  const silenceTimer = window.setInterval(() => {
    if (paused || !analyser) return;
    if (level() > 0.06) lastLoud = Date.now();
    else if (silenceCb && Date.now() - lastLoud > silenceMs) { const cb = silenceCb; silenceCb = null; cb(); }
  }, 200);

  function level(): number {
    if (!analyser) return 0;
    analyser.getByteFrequencyData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i];
    const avg = sum / buf.length / 255;
    smoothed = smoothed * 0.7 + avg * 0.3;
    return Math.min(1, smoothed * 2.2);
  }

  function teardown() {
    clearInterval(silenceTimer);
    stream.getTracks().forEach((t) => t.stop());
    ac?.close().catch(() => {});
  }

  return {
    level,
    onSilence(ms, cb) { silenceMs = ms; silenceCb = cb; lastLoud = Date.now(); },
    pause() {
      if (rec.state !== 'recording') return;
      paused = true;
      try { rec.pause(); } catch { paused = false; }
    },
    resume() {
      if (rec.state !== 'paused') return;
      try { rec.resume(); paused = false; lastLoud = Date.now(); } catch { /* keep tap fallback available */ }
    },
    cancel() { try { rec.stop(); } catch { /* ignore */ } teardown(); },
    stop() {
      return new Promise<Recording>((resolve) => {
        const finish = () => {
          teardown();
          const type = mime || rec.mimeType || 'audio/webm';
          resolve({ blob: new Blob(chunks, { type }), mimeType: type, ext: extFor(type), durationMs: Date.now() - startedAt });
        };
        rec.onstop = finish;
        try { rec.stop(); } catch { finish(); }
      });
    },
  };
}
