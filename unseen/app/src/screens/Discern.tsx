import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Panel } from '../components/ui';
import { Orb } from '../components/Orb';
import { useBattle } from '../battle/useBattle';
import { useUi } from '../store';
import { allBattles } from '../data/repos';
import { clusters, lieTokens } from '../analytics';
import type { Struggle } from '../types';

const STRUGGLE_LABELS: [Struggle, string][] = [
  ['anger', 'Anger'], ['fear', 'Fear'], ['sexual', 'Lust'], ['escapism', 'Scrolling'],
  ['shame', 'Shame'], ['envy', 'Envy'], ['compulsion', 'Compulsion'], ['deceit', 'Deceit'], ['pride', 'Pride'],
];
const FRONT_LABEL: Record<string, string> = { world: 'the world', flesh: 'the flesh', devil: 'the accuser', unclear: 'unclear' };

export function Discern() {
  const navigate = useNavigate();
  const { showToast } = useUi();
  const { ctx, discern, applyCorrection, retrieve, cancel } = useBattle();
  const [phase, setPhase] = useState<'loading' | 'card'>('loading');
  const [lowConf, setLowConf] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<{ count: number; reference?: string; stood?: number } | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [pendingStruggle, setPendingStruggle] = useState<Struggle | null>(null);
  const pendingStruggleRef = useRef<Struggle | null>(null);

  useEffect(() => {
    if (phase !== 'loading') return;
    const msgs = 3;
    const t = setInterval(() => setLoadingMsg((m) => (m + 1) % msgs), 1100);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!ctx) { navigate('/', { replace: true }); return; }
    (async () => {
      const r = await discern();
      if (r.route === 'harbor') { navigate(`/harbor?mode=${r.mode}`, { replace: true }); return; }
      if (pendingStruggleRef.current) applyCorrection({ struggle: pendingStruggleRef.current });
      setLowConf(!!r.lowConfidence);
      setPhase('card');
      await loadHistory();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadHistory() {
    const d = useBattle.getState().ctx?.discernment;
    if (!d) return;
    const battles = await allBattles();
    const cl = clusters(battles).find((c) => c.struggle === d.struggle && jac(lieTokens(c.label), lieTokens(d.lie)) >= 0.5);
    if (cl && cl.count >= 3) {
      const stoodWith = battles.filter((b) => b.struggle === d.struggle && b.outcome === 'stood');
      setHistory({ count: cl.count, reference: stoodWith[0]?.verse.reference, stood: stoodWith.length });
    }
  }

  async function fight() {
    const ok = await retrieve();
    if (ok) navigate('/battle', { replace: true });
    else showToast('Could not verify a verse. Please try again.');
  }

  if (phase === 'loading' || !ctx?.discernment) {
    return (
      <div className="screen fade-up">
        <button className="icon-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { cancel(); navigate('/', { replace: true }); }}>Cancel</button>
        <div className="row"><Orb size={36} /><h1 className="title" style={{ fontSize: 24 }}>What UNSEEN heard</h1></div>
        {ctx?.transcript && <Panel><p className="tiny" style={{ marginTop: 0 }}>YOUR WORDS</p><p className="body" style={{ marginBottom: 0 }}>"{ctx.transcript}"</p></Panel>}
        <Panel>
          <p className="small muted" style={{ marginTop: 0 }}>Is one of these closer? You can correct this now.</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {STRUGGLE_LABELS.map(([val, label]) => <Chip key={val} label={label} selected={pendingStruggle === val} onClick={() => { pendingStruggleRef.current = val; setPendingStruggle(val); if (useBattle.getState().ctx?.discernment) applyCorrection({ struggle: val }); }} />)}
          </div>
        </Panel>
        <div className="row" role="status" aria-live="polite">
          <div className="pulse" style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--spirit-2)', boxShadow: '0 0 14px rgba(78,139,198,.45)' }} />
          <p className="body" style={{ margin: 0 }}>{['Hearing your words…', 'Naming the lie…', 'Finding the truth…'][loadingMsg]}</p>
        </div>
        <style>{`.pulse{animation:p 1.1s ease-in-out infinite}@keyframes p{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.15);opacity:1}}`}</style>
      </div>
    );
  }

  const d = ctx.discernment;
  return (
    <div className="screen fade-up">
      <button className="icon-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { cancel(); navigate('/', { replace: true }); }}>Back</button>
      <div className="row">
        <Orb size={36} />
        <h1 className="title" style={{ fontSize: 24 }}>{lowConf ? 'Is this right?' : 'What UNSEEN heard'}</h1>
      </div>
      {ctx.offline && <span className="tiny" style={{ color: 'var(--gold-hi)' }}>Offline: using your saved verses</span>}
      <p className="small muted">Tap anything to correct it</p>

      <Panel>
        <Row k="Struggle" v={labelFor(d.struggle)} onTap={() => setEditing(true)} />
        <Row k="The lie" v={`"${d.lie}"`} onTap={() => setEditing(true)} />
        {d.stirred_by.length > 0 && <Row k="What stirred it" v={d.stirred_by.join(', ')} />}
        <Row k="Front" v={FRONT_LABEL[d.front]} />
        <Row k="Intensity" v={`${d.intensity} of 10`} last />
      </Panel>

      {editing && (
        <Panel>
          <p className="small muted" style={{ marginTop: 0 }}>Choose the struggle</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {STRUGGLE_LABELS.map(([val, label]) => (
              <Chip key={val} label={label} selected={d.struggle === val} onClick={() => applyCorrection({ struggle: val })} />
            ))}
          </div>
          <input className="text-input" style={{ marginTop: 12 }} value={d.lie} onChange={(e) => applyCorrection({ lie: e.target.value })} placeholder="Name the lie" />
        </Panel>
      )}

      {history && (
        <Panel style={{ background: 'var(--surface-2)', border: '1px solid var(--gold-line)' }}>
          <p className="small" style={{ margin: 0 }}>You have faced this lie {history.count} times before.{history.reference ? ` ${history.reference} helped you stand in ${history.stood} of them.` : ''}</p>
          <p className="tiny">From your Ebenezer log, on this phone</p>
        </Panel>
      )}

      <div className="spacer" />
      <Button onClick={fight}>That's it. Fight.</Button>
      <Button variant="ghost" onClick={() => setEditing((e) => !e)}>Not quite</Button>
    </div>
  );
}

function Row({ k, v, last, onTap }: { k: string; v: string; last?: boolean; onTap?: () => void }) {
  return (
    <button onClick={onTap} style={{ width: '100%', background: 'transparent', border: 0, borderBottom: last ? 'none' : '1px solid var(--line)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', textAlign: 'left', color: 'inherit' }}>
      <span className="small muted">{k}</span>
      <span className="body" style={{ textAlign: 'right' }}>{v}</span>
    </button>
  );
}

function labelFor(s: Struggle) { return STRUGGLE_LABELS.find(([v]) => v === s)?.[1] ?? 'Something else'; }
function jac(a: string[], b: string[]) { const A = new Set(a), B = new Set(b); const i = [...A].filter((x) => B.has(x)).length; return i / (new Set([...a, ...b]).size || 1); }
