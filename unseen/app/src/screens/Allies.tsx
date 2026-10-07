import { useState } from 'react';
import { Button, Panel, QuoteLine, Vellum } from '../components/ui';
import { api } from '../ai/api';
import { saveAlly, removeAlly } from '../data/repos';
import { useSettings, useUi } from '../store';
import type { Ally } from '../types';

export function Allies() {
  const { settings, allies, reloadAllies } = useSettings();
  const { showToast } = useUi();
  const [editing, setEditing] = useState(allies.length === 0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  async function add() {
    if (!name.trim()) return;
    await saveAlly({ id: crypto.randomUUID(), name: name.trim(), phone: phone.trim() || undefined, consentAt: Date.now() });
    setName(''); setPhone('');
    await reloadAllies();
    showToast('Ally added. They only ever see a request to pray.');
  }

  async function ask(ally: Ally) {
    let url: string;
    try {
      ({ url } = await api.pray());
    } catch {
      showToast('Needs a connection to create a prayer link.');
      return;
    }
    const who = settings?.firstName ?? 'Someone you love';
    const text = `${who} asked you to pray for them right now. Nothing else is shared. Tap to let them know you're praying: ${url}`;
    // Token is created; sharing is a best-effort hand-off and may be cancelled.
    if (navigator.share) {
      try { await navigator.share({ text }); showToast('Sent. You send it, not UNSEEN.'); }
      catch (e) {
        if ((e as DOMException)?.name === 'AbortError') showToast('Share cancelled. The prayer link was created but not sent.');
        else showToast('Could not open sharing. The prayer link was created but not sent.');
      }
      return;
    }
    if (ally.phone) { window.location.href = `sms:${ally.phone}?&body=${encodeURIComponent(text)}`; return; }
    try { await navigator.clipboard?.writeText(text); showToast('Prayer link copied. You send it, not UNSEEN.'); }
    catch { showToast('Prayer link ready to share.'); }
  }

  return (
    <div className="screen has-nav">
      <h1 className="title">Hold up my arms</h1>
      <p className="body muted">Up to three people pray for you in the moment. They never see what you are facing.</p>
      <QuoteLine text="Then Aaron and Hur held up his hands, one on each side." reference="Exodus 17:12" />

      <div className="stack">
        {allies.map((a) => (
          <Panel key={a.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><strong>{a.name}</strong><div className="tiny">Not asked yet</div></div>
              <div className="row">
                <Button variant="ghost" onClick={() => ask(a)}>Ask them to pray now</Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel style={{ background: 'var(--surface-2)', border: '1px solid var(--gold-line)' }}>
        <p className="small muted" style={{ marginTop: 0 }}>What they see</p>
        <Vellum><em>{settings?.firstName ?? 'Someone you love'} asked you to pray for them right now.</em></Vellum>
        <p className="tiny" style={{ marginBottom: 0 }}>Nothing else is shared.</p>
      </Panel>

      {editing && (
        <Panel>
          <input className="text-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="text-input" style={{ marginTop: 10 }} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="tiny">They have agreed to pray when you ask.</p>
          <Button onClick={add} disabled={!name.trim() || allies.length >= 3}>Add ally</Button>
        </Panel>
      )}

      <div className="spacer" />
      <Button variant="ghost" onClick={() => setEditing((e) => !e)}>Change my allies</Button>
      {allies.length > 0 && <button className="icon-btn" style={{ alignSelf: 'center', color: 'var(--faint)' }} onClick={async () => { await removeAlly(allies[allies.length - 1].id); await reloadAllies(); showToast('Ally removed at once.'); }}>Remove last ally</button>}
    </div>
  );
}
