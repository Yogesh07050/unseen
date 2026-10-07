import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scene } from '../scene/Scene';
import { Button, Panel, QuoteLine } from '../components/ui';
import { useBattle } from '../battle/useBattle';
import { useSettings, useUi } from '../store';
import { ACTION_BY_ID } from '../content/actions';

export function Peace() {
  const navigate = useNavigate();
  const { settings, allies } = useSettings();
  const { showToast } = useUi();
  const { ctx, finalize, useBackup } = useBattle();
  const [selected, setSelected] = useState<string | null>(null);
  const [escapes, setEscapes] = useState<string[]>(ctx?.escapes ?? []);

  // Escapes arrive from compose (3 s cap); show the library order until then.
  useEffect(() => {
    const lib = ACTION_BY_ID;
    const fallback = (ctx?.escapes ?? []);
    setEscapes(fallback.length ? fallback : Object.keys(lib).slice(0, 3));
    const t = setTimeout(() => { const cur = useBattle.getState().ctx; if (cur?.escapes.length) setEscapes(cur.escapes); }, 3000);
    const poll = setInterval(() => { const cur = useBattle.getState().ctx; if (cur?.escapes.length) { setEscapes(cur.escapes); clearInterval(poll); } }, 400);
    return () => { clearTimeout(t); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ctx) { navigate('/', { replace: true }); return null; }
  const gentle = ctx.gentleReply;

  function fillLabel(label: string): string {
    const ally = allies[0]?.name ?? 'an ally';
    const allyList = allies.length ? allies.map((a) => a.name).join(' or ') : 'your allies';
    return label.replace('{person}', 'your brother').replace('{ally}', ally).replace('{sponsor}', ally).replace('{allies}', allyList);
  }

  async function layStone() {
    await finalize('stood', { escapeId: selected ?? undefined });
    showToast('A stone is laid on your Ebenezer wall.');
    navigate('/stones', { replace: true });
  }

  async function stillFighting() {
    const ok = await useBackup();
    if (ok) navigate('/battle', { replace: true });
    else showToast('No backup verse. Keep the first one close.');
  }

  async function copyReply() {
    try { await navigator.clipboard.writeText(gentle ?? ''); showToast('Copied. You send it, not UNSEEN.'); }
    catch { showToast('Could not copy. Select the reply to copy it.'); }
  }

  async function shareReply() {
    if (!gentle) return;
    if (!navigator.share) { await copyReply(); return; }
    try { await navigator.share({ text: gentle }); }
    catch (e) { if ((e as DOMException)?.name === 'AbortError') showToast('Share cancelled. Your reply is still here.'); }
  }

  return (
    <div className="screen fade-up">
      <Scene archetype={ctx.archetype ?? 'shadow'} lie="" phraseIndex={ctx.verse?.phrases.length ?? 0} totalPhrases={ctx.verse?.phrases.length ?? 1} state="peace" allyAcks={ctx.allyAcks} symbolic={settings?.battleStyle === 'symbolic'} reduceMotion={settings?.reduceMotion} />
      <QuoteLine text="Then the devil left Him, and angels came and ministered to Him." reference="Matthew 4:11" />
      <h1 className="title">You stood, in His strength.</h1>

      <div>
        <p className="small muted" style={{ marginBottom: 4 }}>Your way of escape. “He will also provide an escape.” 1 Corinthians 10:13</p>
        <div className="stack">
          {escapes.map((id) => {
            const a = ACTION_BY_ID[id];
            if (!a) return null;
            return (
              <button key={id} onClick={() => setSelected(id)} style={{ textAlign: 'left', background: selected === id ? 'var(--gold-soft)' : 'var(--surface)', border: `1px solid ${selected === id ? 'var(--gold-line)' : 'var(--line)'}`, borderRadius: 14, padding: '12px 14px', color: 'inherit' }}>
                <div className="body">{fillLabel(a.label)}</div>
                {a.note && <div className="tiny" style={{ marginTop: 2 }}>{a.note}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {selected === 'gentle_reply' && gentle && (
        <Panel>
          <p className="small muted" style={{ marginTop: 0 }}>A gentle reply you can edit and send yourself</p>
          <p className="body">{gentle}</p>
          <div className="row">
            <Button variant="ghost" onClick={copyReply}>Copy</Button>
            <Button variant="ghost" onClick={shareReply}>Share</Button>
          </div>
        </Panel>
      )}

      <p className="quote" style={{ fontSize: 15 }}>Thank You, Jesus, for the strength to stand.<span className="ref">Prayer guide written by UNSEEN, not Scripture</span></p>

      <div className="spacer" />
      <Button onClick={layStone}>Lay a stone</Button>
      <Button variant="ghost" onClick={stillFighting}>Still fighting</Button>
      <button className="icon-btn" style={{ alignSelf: 'center' }} onClick={() => { void finalize('fell'); navigate('/rise', { replace: true }); }}>I fell</button>
    </div>
  );
}
