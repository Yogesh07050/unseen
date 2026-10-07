import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Panel, Vellum, VerseAttribution, VerseSkeleton } from '../components/ui';
import { getVerified } from '../engines/verses';
import { BSB } from '../engines/bibles';
import { saveStone, allBattles } from '../data/repos';
import { localDate, recompute } from '../battle/useBattle';
import { useSettings, useUi } from '../store';
import type { Trigger, VerifiedVerse } from '../types';

const FIRST: { label: string; value: Trigger }[] = [
  { label: 'Tired', value: 'tired' }, { label: 'Alone', value: 'alone' }, { label: 'Hurt', value: 'hurt' },
  { label: 'Bored', value: 'bored' }, { label: 'Stressed', value: 'stressed' },
];

export function Rise() {
  const navigate = useNavigate();
  const { allies, settings } = useSettings();
  const { showToast } = useUi();
  const [micah, setMicah] = useState<VerifiedVerse | null>(null);
  const [john, setJohn] = useState<VerifiedVerse | null>(null);
  const [picked, setPicked] = useState<Trigger[]>([]);
  const [note, setNote] = useState('');
  const [careCard, setCareCard] = useState(false);
  const [versesLoading, setVersesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const bibleId = useSettings.getState().settings?.bibleId ?? BSB;
      const [m, j] = await Promise.all([
        getVerified(bibleId, ['MIC.7.8']).catch(() => null),
        getVerified(bibleId, ['1JN.1.9']).catch(() => null),
      ]);
      setMicah(m); setJohn(j); setVersesLoading(false);
      const battles = await allBattles();
      const weekAgo = Date.now() - 7 * 86400_000;
      const falls = battles.filter((b) => b.outcome === 'fell' && b.startedAt >= weekAgo).length;
      if (falls >= 3) setCareCard(true);
    })();
  }, []);

  async function layStone() {
    await saveStone({ id: crypto.randomUUID(), kind: 'rose_again', date: localDate(), verse: { bibleId: micah?.bibleId ?? BSB, usfm: ['MIC.7.8'], reference: micah?.reference ?? 'Micah 7:8' }, note: note || undefined });
    await recompute();
    showToast('A rose-again stone is laid. Nothing earlier is erased.');
    navigate('/stones', { replace: true });
  }

  return (
    <div className="screen fade-up">
      <button className="icon-btn" onClick={() => navigate('/')} style={{ alignSelf: 'flex-start' }}>Close</button>
      <h1 className="title">You can rise again.</h1>
      <p className="body muted">A fall doesn't erase a single stone.</p>

      {!micah && versesLoading && <VerseSkeleton lines={3} />}
      {micah && (
        <Vellum>
          <span className="dropcap">{micah.text.charAt(0)}</span>{micah.text.slice(1)}
          <VerseAttribution verse={micah} />
        </Vellum>
      )}
      {john ? <Vellum verse={john} /> : versesLoading ? <VerseSkeleton lines={3} /> : null}

      <Panel>
        <p className="small muted" style={{ marginTop: 0 }}>A prayer you can pray</p>
        <p className="body">Father, I fell tonight. I confess it to You. Thank You that You are faithful to forgive me. Help me rise.</p>
        <p className="tiny">Prayer guide written by UNSEEN, not Scripture</p>
      </Panel>

      <div>
        <p className="small muted" style={{ marginBottom: 6 }}>What came first?</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {FIRST.map((f) => <Chip key={f.value} label={f.label} selected={picked.includes(f.value)} onClick={() => setPicked((p) => p.includes(f.value) ? p.filter((x) => x !== f.value) : [...p, f.value])} />)}
        </div>
      </div>
      <textarea className="text-input" rows={2} placeholder="What would help next time? (stays on this phone)" value={note} onChange={(e) => setNote(e.target.value)} />

      {careCard && (
        <Panel style={{ borderColor: 'rgba(221,167,184,.5)' }}>
          <p className="body" style={{ marginTop: 0 }}>Would it help to talk with someone this week?</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {allies[0] && <Chip label={`Talk to ${allies[0].name}`} onClick={() => { window.location.href = allies[0].phone ? `tel:${allies[0].phone}` : 'sms:'; }} />}
            <Chip label="Message a pastor" onClick={() => { window.location.href = 'sms:'; }} />
            <Chip label="Find a counsellor" onClick={() => { window.open(settings?.counsellorUrl ?? 'https://findahelpline.com', '_blank', 'noopener'); }} />
          </div>
        </Panel>
      )}

      <div className="spacer" />
      <Button onClick={layStone}>Lay a rose-again stone</Button>
    </div>
  );
}
