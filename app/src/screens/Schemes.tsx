import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, QuoteLine } from '../components/ui';
import { HeatMap } from '../components/charts';
import { allBattles } from '../data/repos';
import { api } from '../ai/api';
import { clusters, heatMap, insightCandidates, type Stronghold } from '../analytics';
import type { Battle } from '../types';

export function Schemes() {
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [grid, setGrid] = useState<number[][]>([]);
  const [strongholds, setStrongholds] = useState<Stronghold[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const b = await allBattles();
      setBattles(b);
      if (b.length < 10) return;
      setGrid(heatMap(b).grid);
      const sh = clusters(b).filter((c) => c.count > 0);
      setStrongholds(sh);
      const { candidates, templates } = insightCandidates(b, sh);
      setInsights(templates.length ? templates : sh.length
        ? [`“${sh[0].label}” has appeared ${sh[0].count} times in your recent battles.`]
        : []);
      if (candidates.length) {
        try { const r = await api.insight(candidates); if (r.sentences.length) setInsights(r.sentences); } catch { /* keep templates */ }
      }
    })();
  }, []);

  return (
    <div className="screen has-nav">
      <h1 className="title">His schemes</h1>
      <QuoteLine text="For we are not unaware of his schemes." reference="2 Corinthians 2:11" />

      {battles.length < 10 ? (
        <Panel><p className="body" style={{ margin: 0 }}>Not enough battles yet to see patterns.</p></Panel>
      ) : (
        <>
          <section>
            <h2 className="section-title">When he comes</h2>
            <HeatMap grid={grid} />
          </section>

          <section>
            <h2 className="section-title">Strongholds</h2>
            <div className="stack">
              {strongholds.map((s) => (
                <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="body">“{s.label}” {s.count}×</span>
                  {s.status === 'stronghold' && <span style={badge('#E8592F')}>Stronghold</span>}
                  {s.status === 'torn_down' && <span style={badge('#6FBF73')}>Torn down</span>}
                </div>
              ))}
            </div>
          </section>

          {insights.length > 0 && (
            <Panel>
              {insights.map((s, i) => <p key={i} className="body" style={{ margin: i ? '8px 0 0' : 0 }}>{s}</p>)}
            </Panel>
          )}

          <p className="tiny">Patterns show what often happens together, not causes.</p>
          <button className="icon-btn" style={{ color: 'var(--gold-hi)', alignSelf: 'flex-start' }} onClick={() => navigate('/watch')}>See this week's watch →</button>
        </>
      )}
    </div>
  );
}

function badge(color: string): React.CSSProperties {
  return { fontSize: 12, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 10, padding: '2px 8px' };
}
