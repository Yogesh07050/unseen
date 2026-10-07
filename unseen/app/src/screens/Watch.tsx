import { useEffect, useState } from 'react';
import { Button, Panel, QuoteLine, Toggle } from '../components/ui';
import { WatchTimeline } from '../components/charts';
import { allBattles, allWatch } from '../data/repos';
import { WEEKDAYS_LONG } from '../analytics';
import { downloadIcs } from '../analytics/ics';
import { useSettings, useUi } from '../store';
import type { Battle, WatchWindow } from '../types';

function hourLabel(h: number) { const ap = h >= 12 ? 'pm' : 'am'; const hr = h % 12 === 0 ? 12 : h % 12; return `${hr} ${ap}`; }

export function Watch() {
  const { settings, update } = useSettings();
  const { showToast } = useUi();
  const [windows, setWindows] = useState<WatchWindow[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [askFirst, setAskFirst] = useState(true);

  useEffect(() => { (async () => { setWindows(await allWatch()); setBattles(await allBattles()); })(); }, []);

  const today = new Date().getDay();
  const tonight = windows.find((w) => w.weekday === today) ?? windows[0];

  return (
    <div className="screen has-nav">
      <h1 className="title">Watch</h1>
      <QuoteLine text="When the devil had finished every temptation, he left Him until an opportune time." reference="Luke 4:13" />

      {battles.length < 5 ? (
        <Panel><p className="body" style={{ margin: 0 }}>Watch is still learning your times.</p></Panel>
      ) : (
        <>
          <h2 className="section-title">Your opportune times this week</h2>
          <WatchTimeline windows={windows} todayWeekday={today} />

          {tonight && (
            <Panel>
              <strong>{tonight.weekday === today ? "Tonight's armor" : `${WEEKDAYS_LONG[tonight.weekday]}'s armor`}, {hourLabel(tonight.startHour)} to {hourLabel(tonight.endHour)}</strong>
              <div className="stack" style={{ marginTop: 8 }}>
                {tonight.plan.map((p) => <div key={p.kind} className="small">• {p.label}</div>)}
              </div>
            </Panel>
          )}

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="body">Ask me before arming</span>
            <Toggle on={askFirst} onChange={setAskFirst} />
          </div>

          <Button variant="ghost" onClick={() => { downloadIcs(windows); showToast('Calendar file saved. It names no struggle.'); update({ watchAlerts: 'calendar' }); }}>Add watch times to my calendar</Button>
        </>
      )}
    </div>
  );
}
