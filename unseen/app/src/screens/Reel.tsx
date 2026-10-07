import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Panel, QuoteLine, Toggle } from '../components/ui';
import { ARCHETYPES } from '../content/archetypes';
import { allBattles, allStones } from '../data/repos';
import { shareText } from '../native';
import { useUi } from '../store';
import type { Battle, Stone } from '../types';

export function Reel() {
  const navigate = useNavigate();
  const { showToast } = useUi();
  const [stones, setStones] = useState<Stone[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [frame, setFrame] = useState(0);
  const [hideStruggle, setHideStruggle] = useState(true);
  const [hideDates, setHideDates] = useState(true);

  useEffect(() => { (async () => { setStones(await allStones()); setBattles(await allBattles()); })(); }, []);

  const weekStones = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400_000;
    return stones.filter((s) => (Date.parse(s.date) || 0) >= weekAgo).slice(0, 6);
  }, [stones]);

  useEffect(() => {
    if (weekStones.length === 0) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % (weekStones.length + 1)), 2000);
    return () => clearInterval(t);
  }, [weekStones.length]);

  function caption(s: Stone, idx: number): string {
    const day = hideDates ? `Battle ${idx + 1}` : new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' });
    if (s.kind === 'from_memory') return `${day}: Won from memory`;
    if (s.kind === 'rose_again') return `${day}: Rose again`;
    const b = battles.find((x) => x.id === s.battleId);
    const tempter = hideStruggle ? 'The tempter' : (b ? ARCHETYPES[b.archetype].name : 'The tempter');
    return `${day}: ${tempter} fled`;
  }

  const atClosing = frame >= weekStones.length;

  // Share the reel as detail-free text, honouring the two privacy toggles
  // (native share sheet on Android, Web Share on the web, clipboard otherwise).
  async function share() {
    const text = [
      "This week's reel",
      ...weekStones.map((s, i) => caption(s, i)),
      '“They have overcome him by the blood of the Lamb and by the word of their testimony.” Revelation 12:11',
    ].join('\n');
    try {
      if (await shareText(text, "This week's reel")) { showToast('Shared. You send it, not UNSEEN.'); return; }
      await navigator.clipboard?.writeText(text);
      showToast('Copied a detail-free copy. You send it, not UNSEEN.');
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') showToast('Could not share. Your reel is still here.');
    }
  }

  return (
    <div className="screen">
      <button className="icon-btn" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>Close</button>
      <h1 className="title">This week's reel</h1>
      <p className="small muted">Made on your phone from this week's stones. Only you can see it.</p>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', maxHeight: 360, borderRadius: 16, overflow: 'hidden', background: 'radial-gradient(120% 100% at 50% 0%, #241C52, #0C0E29)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>
        {weekStones.length === 0 ? (
          <p className="body muted">No stones this week yet.</p>
        ) : atClosing ? (
          <div style={{ textAlign: 'center', padding: 20 }} className="fade-up">
            <img src="/art/cross-of-light.svg" width={80} alt="" />
            <QuoteLine text="They have overcome him by the blood of the Lamb and by the word of their testimony." reference="Revelation 12:11" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }} className="fade-up" key={frame}>
            <img src="/art/guardian-rest.svg" width={120} alt="" />
            <p className="section-title" style={{ marginTop: 10 }}>{caption(weekStones[frame], frame)}</p>
            {weekStones[frame].verse && <p className="tiny">{weekStones[frame].verse!.reference}</p>}
          </div>
        )}
      </div>

      <Panel>
        <ToggleRow label="Hide what I struggled with" on={hideStruggle} onChange={setHideStruggle} />
        <ToggleRow label="Hide dates and times" on={hideDates} onChange={setHideDates} />
      </Panel>

      <div className="spacer" />
      <Button onClick={() => void share()}>Share without details</Button>
    </div>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return <div className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}><span className="body">{label}</span><Toggle on={on} onChange={onChange} /></div>;
}
