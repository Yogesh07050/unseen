import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Orb } from '../components/Orb';
import { Button, Chip, QuoteLine, VoiceStatusPill } from '../components/ui';
import { startRecording, type Recorder } from '../engines/audio';
import { probeVoice, VOICE_REASON, type VoiceStatus } from '../engines/voiceStatus';
import { api } from '../ai/api';
import { useBattle } from '../battle/useBattle';

const STRUGGLE_CHIPS: { label: string; text: string }[] = [
  { label: 'Anger', text: 'I am angry and I want to fire back something cruel.' },
  { label: 'Fear', text: "I can't stop worrying that everything is going to fall apart." },
  { label: 'Lust', text: "I'm alone and tempted to look at things I know I shouldn't." },
  { label: 'Scrolling', text: "It's late and I keep scrolling, just five more minutes." },
  { label: 'Shame', text: 'I failed again and I feel too far gone.' },
  { label: 'Envy', text: 'Everyone seems to have a better life than me.' },
  { label: 'Something else', text: '' },
];

const MIN_AUDIO_BYTES = 1500;
const MIN_AUDIO_MS = 400;

export function CryOut() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const voiceMode = params.get('mode') !== 'text';
  const { begin, gate, setTranscript } = useBattle();

  const [text, setText] = useState('');
  const [typing, setTyping] = useState(!voiceMode);
  const [showChips, setShowChips] = useState(!voiceMode);
  const [status, setStatus] = useState<VoiceStatus>(voiceMode ? 'checking' : 'ready');
  const [level, setLevel] = useState(0);
  const [heardFromVoice, setHeardFromVoice] = useState(false);

  const recorderRef = useRef<Recorder | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    begin(voiceMode ? 'whisper' : 'text');
    if (voiceMode) initVoice();
    return () => { stopMeter(); recorderRef.current?.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopMeter() { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; }

  // Probe first so the indicator is truthful, then start recording if usable.
  async function initVoice() {
    const probed = await probeVoice();
    if (probed === 'unsupported' || probed === 'server_off' || probed === 'denied') {
      fallbackToTyping(probed);
      return;
    }
    await startVoice();
  }

  function fallbackToTyping(s: VoiceStatus) {
    stopMeter();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setStatus(s);
    setTyping(true);
    setShowChips(true);
  }

  async function startVoice() {
    try {
      const rec = await startRecording();
      recorderRef.current = rec;
      setStatus('recording');
      setTyping(false);
      const tick = () => { setLevel(rec.level()); rafRef.current = requestAnimationFrame(tick); };
      tick();
      rec.onSilence(16_000, () => setShowChips(true));
    } catch (e) {
      // getUserMedia rejected: usually a denied/blocked microphone.
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      fallbackToTyping(denied ? 'denied' : 'error');
    }
  }

  async function finishVoice() {
    const rec = recorderRef.current;
    if (!rec) return;
    stopMeter();
    setStatus('transcribing');
    try {
      const { blob, ext, durationMs } = await rec.stop();
      recorderRef.current = null;
      if (blob.size < MIN_AUDIO_BYTES || durationMs < MIN_AUDIO_MS) { noSpeech(); return; }
      const { text: heard } = await api.transcribe(blob, ext);
      if (!heard.trim()) { noSpeech(); return; }
      const transcript = heard.trim();
      setText(transcript);
      setTranscript(transcript);
      setHeardFromVoice(true);
      setTyping(true);
      setStatus('ready');
    } catch {
      setStatus('error');
      setTyping(true);
      setShowChips(true);
    }
  }

  function noSpeech() {
    setStatus('no_speech');
    setTyping(true);
    setShowChips(true);
  }

  function proceed(value: string) {
    const v = value.trim();
    if (!v) return;
    setTranscript(v);
    const result = gate(v);
    if (result.route === 'harbor') navigate('/harbor?mode=crisis', { replace: true });
    else navigate('/discern', { replace: true });
  }

  const recording = status === 'recording';
  const canRetryVoice = (status === 'no_speech' || status === 'error' || status === 'denied') && voiceMode;

  return (
    <div className="screen fade-up">
      <div className="header-row">
        <button className="icon-btn" onClick={() => { recorderRef.current?.cancel(); navigate('/'); }}>Cancel</button>
        <span role="status" style={{ padding: '6px 13px', borderRadius: 'var(--r-chip)', fontSize: 15, fontWeight: 500, background: 'var(--gold-soft)', border: '1px solid var(--gold-line)', color: 'var(--gold-hi)' }}>Whisper mode · always on</span>
      </div>

      {voiceMode && <VoiceStatusPill status={status} reason={heardFromVoice && status === 'ready' ? 'Whisper heard you — review or edit the transcript' : VOICE_REASON[status]} />}

      <div style={{ display: 'grid', placeItems: 'center', gap: 12, marginTop: 4 }}>
        <Orb size={240} listening={recording} level={level} />
        <QuoteLine text="the Spirit helps us in our weakness" reference="Romans 8:26" />
      </div>

      {typing && (
        <>
          {heardFromVoice && <label htmlFor="cry-out-transcript" className="small muted">What Whisper heard — edit if needed:</label>}
          <textarea id="cry-out-transcript" className="text-input" rows={3} placeholder="Say what is happening…" value={text}
            onChange={(e) => { setText(e.target.value); setTranscript(e.target.value); }} autoFocus={!voiceMode} />
        </>
      )}

      {canRetryVoice && (
        <Button variant="ghost" onClick={() => { setStatus('checking'); setText(''); setHeardFromVoice(false); initVoice(); }}>Try voice again</Button>
      )}

      {showChips && status !== 'transcribing' && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {STRUGGLE_CHIPS.map((c) => (
            <Chip key={c.label} label={c.label} onClick={() => { if (c.text) proceed(c.text); else { recorderRef.current?.cancel(); setTyping(true); } }} />
          ))}
        </div>
      )}

      <div className="spacer" />
      {recording ? (
        <Button onClick={finishVoice}>I'm done speaking</Button>
      ) : status === 'transcribing' ? (
        <Button disabled>Hearing you…</Button>
      ) : (
        <Button onClick={() => proceed(text)} disabled={!text.trim()}>{voiceMode ? 'Proceed' : "I'm done speaking"}</Button>
      )}
      <p className="tiny" style={{ textAlign: 'center' }}>Sent only to understand this moment. Saved only on this phone.</p>
    </div>
  );
}
