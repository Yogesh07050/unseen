import { COLUMNS, WEEKDAYS } from '../analytics';
import type { WatchWindow } from '../types';

export function HeatMap({ grid }: { grid: number[][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px repeat(5, 1fr)', gap: 4, alignItems: 'center' }}>
      <span />
      {COLUMNS.map((c) => <span key={c} className="tiny" style={{ textAlign: 'center', fontSize: 10.5 }}>{c}</span>)}
      {grid.map((row, wd) => (
        <RowCells key={wd} wd={wd} row={row} />
      ))}
    </div>
  );
}
function RowCells({ wd, row }: { wd: number; row: number[] }) {
  return (
    <>
      <span className="tiny" style={{ fontSize: 11 }}>{WEEKDAYS[wd]}</span>
      {row.map((v, i) => (
        <span key={i} style={{ height: 22, borderRadius: 6, background: `rgba(184,145,46,${0.07 + 0.8 * v})`, border: '1px solid var(--line)' }} />
      ))}
    </>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function WatchTimeline({ windows, todayWeekday }: { windows: WatchWindow[]; todayWeekday: number }) {
  // Axis 6pm (18) to 2am (26 i.e. 2 next day). Map hour -> 0..1.
  const toPct = (h: number) => {
    const norm = h < 6 ? h + 24 : h; // after-midnight hours shift up
    return Math.max(0, Math.min(1, (norm - 18) / 8));
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="tiny">
        {['6p', '8p', '10p', '12a', '2a'].map((t) => <span key={t}>{t}</span>)}
      </div>
      {DAY_LABELS.map((d, wd) => {
        const wins = windows.filter((w) => w.weekday === wd);
        return (
          <div key={d} className="row" style={{ gap: 8 }}>
            <span className="tiny" style={{ width: 28 }}>{d}</span>
            <div style={{ position: 'relative', flex: 1, height: 16, background: 'var(--surface-sunk)', borderRadius: 8, border: '1px solid var(--line)', outline: wd === todayWeekday ? '1px solid var(--gold-line)' : 'none' }}>
              {wins.map((w) => {
                const l = toPct(w.startHour); const r = toPct(w.endHour);
                return <span key={w.id} title={w.reason} style={{ position: 'absolute', left: `${l * 100}%`, width: `${Math.max(6, (r - l) * 100)}%`, top: 0, bottom: 0, borderRadius: 8, background: w.level === 'high' ? 'var(--gold)' : 'rgba(184,145,46,.5)' }} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SharpnessMeter({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ width: 14, height: 6, borderRadius: 2, background: i < value ? 'var(--gold)' : 'var(--line-strong)' }} />
      ))}
    </span>
  );
}
