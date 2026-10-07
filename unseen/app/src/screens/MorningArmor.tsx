import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Vellum, VerseSkeleton } from '../components/ui';
import { MORNING_ARMOR } from '../content/misc';
import { getVerified } from '../engines/verses';
import { allWatch, logEvent, saveWatch } from '../data/repos';
import { useSettings } from '../store';
import { speak, stopSpeaking } from '../engines/speech';
import type { VerifiedVerse } from '../types';
import { useUi } from '../store';

export function MorningArmor() {
  const navigate = useNavigate();
  const { settings, allies, update } = useSettings();
  const { showToast } = useUi();
  const [i, setI] = useState(0);
  const [verse, setVerse] = useState<VerifiedVerse | null>(null);
  const [answer, setAnswer] = useState('');
  const [planArmed, setPlanArmed] = useState(!!settings?.armorPlanArmed);
  const [complete, setComplete] = useState(false);
  const step = MORNING_ARMOR[i];

  useEffect(() => { setVerse(null); getVerified(settings?.bibleId ?? 3034, step.usfm).then(setVerse).catch(() => setVerse(null)); }, [i, step.usfm, settings?.bibleId]);
  useEffect(() => () => stopSpeaking(), []);

  async function armPlan() {
    const windows = await allWatch();
    await Promise.all(windows.map((w) => saveWatch({ ...w, approved: !planArmed })));
    await update({ armorPlanArmed: !planArmed });
    setPlanArmed((v) => !v);
  }

  async function next() {
    if (step.input === 'pick_lie') await update({ armorIntention: answer.trim() });
    if (step.input === 'optional_note' && answer.trim()) await update({ armorPeaceStep: answer.trim() });
    if (step.input === 'choose') await update({ armorIdentity: answer });
    if (step.input === 'pick_ally') await update({ armorAlly: answer });
    if (i + 1 >= MORNING_ARMOR.length) {
      await logEvent({ id: crypto.randomUUID(), ts: Date.now(), type: 'armor_on' });
      navigate('/', { replace: true });
    } else { setAnswer(''); setComplete(false); setI(i + 1); }
  }

  return (
    <div className="screen fade-up">
      <button className="icon-btn" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>Close</button>
      <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
        {MORNING_ARMOR.map((_, k) => <span key={k} style={{ width: 8, height: 8, borderRadius: '50%', background: k <= i ? 'var(--gold)' : 'var(--line-strong)' }} />)}
      </div>
      <h1 className="title">Put on the armor</h1>
      <p className="small muted">Ephesians 6:13-18</p>

      <h2 className="section-title">{step.piece}</h2>
      {verse ? <Vellum verse={verse} /> : <VerseSkeleton lines={4} />}
      <p className="body">{step.prompt}</p>
      {step.input === 'pick_lie' && <input className="text-input" aria-label="Name the lie you expect today" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Name the lie you expect today" />}
      {step.input === 'optional_note' && <textarea className="text-input" rows={2} aria-label="A step toward peace" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="What is one small step? (optional)" />}
      {step.input === 'none' && <Button variant={complete ? 'quiet' : 'ghost'} onClick={() => setComplete(true)}>{complete ? 'Grace received' : 'Receive grace'}</Button>}
      {step.options && <div className="stack">{step.options.map((o) => <Button key={o} variant={answer === o ? 'gold' : 'ghost'} onClick={() => setAnswer(o)}>{o}</Button>)}</div>}
      {step.input === 'approve_plan' && <Button variant={planArmed ? 'gold' : 'ghost'} onClick={armPlan}>{planArmed ? 'Watch plan armed' : 'Arm my watch plan'}</Button>}
      {step.input === 'speak_verse' && <div className="stack"><Button variant="ghost" disabled={!verse} onClick={() => verse && void speak(verse.text, undefined, () => showToast('Could not play the verse audio. Check the connection and retry.'))}>Listen to the verse</Button><Button variant={complete ? 'gold' : 'ghost'} onClick={() => setComplete(true)}>{complete ? 'Marked as spoken' : 'I spoke it aloud'}</Button></div>}
      {step.input === 'pick_ally' && <div className="row" style={{ flexWrap: 'wrap' }}>{allies.length ? allies.map((a) => <Button key={a.id} variant={answer === a.name ? 'gold' : 'ghost'} onClick={() => setAnswer(a.name)}>{a.name}</Button>) : <Button variant="ghost" onClick={() => setAnswer('someone I trust')}>Pray for someone I trust</Button>}</div>}

      <div className="spacer" />
      <Button onClick={next} disabled={!verse || (step.input === 'pick_lie' && !answer.trim()) || (step.options !== undefined && !answer) || (step.input === 'pick_ally' && !answer) || (step.input === 'none' && !complete) || (step.input === 'speak_verse' && !complete)}>{i + 1 >= MORNING_ARMOR.length ? 'Armed for today' : 'Put it on'}</Button>
    </div>
  );
}
