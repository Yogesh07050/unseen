import { useNavigate } from 'react-router-dom';
import { Button, Panel } from '../components/ui';
import { loadDemoData } from '../dev/seed';
import { clearDemo } from '../data/repos';
import { useBattle } from '../battle/useBattle';
import { useUi } from '../store';

export function Dev() {
  const navigate = useNavigate();
  const { showToast } = useUi();
  const ctx = useBattle((s) => s.ctx);

  return (
    <div className="screen">
      <div className="header-row">
        <h1 className="title">Demo controls</h1>
        <button className="icon-btn" onClick={() => navigate('/')}>Done</button>
      </div>
      <Panel>
        <p className="small muted" style={{ marginTop: 0 }}>Everything here is synthetic and labelled "Demo data" on screen.</p>
        <div className="stack">
          <Button onClick={async () => { const n = await loadDemoData(); showToast(`Loaded ${n} demo rows.`); }}>Load 8 weeks of demo data</Button>
          <Button variant="ghost" onClick={async () => { await clearDemo(); showToast('Demo data cleared.'); }}>Clear demo data</Button>
          <Button variant="ghost" onClick={() => { if (ctx) useBattle.setState({ ctx: { ...ctx, allyAcks: Math.min(3, ctx.allyAcks + 1) } }); showToast('Simulated an ally praying.'); }}>Simulate an ally praying</Button>
          <Button variant="ghost" onClick={() => navigate('/harbor?mode=crisis')}>Open Safe Harbor (crisis)</Button>
        </div>
      </Panel>
    </div>
  );
}
