import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, QuoteLine } from '../components/ui';
import { StoneTile } from '../components/StoneTile';
import { allStones, saveStone } from '../data/repos';
import { localDate, recompute } from '../battle/useBattle';
import { useUi } from '../store';
import type { Stone } from '../types';

export function Stones() {
  const navigate = useNavigate();
  const { showToast } = useUi();
  const [stones, setStones] = useState<Stone[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => { allStones().then(setStones); }, []);

  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const summary = useMemo(() => {
    const mPrefix = localDate().slice(0, 7);
    const m = stones.filter((s) => s.date.startsWith(mPrefix));
    return {
      stood: m.filter((s) => s.kind === 'stood').length,
      rose: m.filter((s) => s.kind === 'rose_again').length,
      memory: m.filter((s) => s.kind === 'from_memory').length,
    };
  }, [stones]);

  const shown = filter === 'All' ? stones
    : filter === 'Stood' ? stones.filter((s) => s.kind === 'stood')
    : filter === 'Rose again' ? stones.filter((s) => s.kind === 'rose_again')
    : stones.filter((s) => s.kind === 'from_memory');

  async function wonFromMemory() {
    await saveStone({ id: crypto.randomUUID(), kind: 'from_memory', date: localDate() });
    await recompute();
    setStones(await allStones());
    showToast('A from-memory stone is laid. The Word is doing its work.');
  }

  return (
    <div className="screen has-nav">
      <h1 className="title">Ebenezer</h1>
      <QuoteLine text="Thus far the LORD has helped us." reference="1 Samuel 7:12" />
      <p className="small muted">{month} so far: {summary.stood} stood, {summary.rose} rose again, {summary.memory} won from memory.</p>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        {['All', 'Stood', 'Won from memory', 'Rose again'].map((f) => <Chip key={f} label={f} selected={filter === f} onClick={() => setFilter(f)} />)}
      </div>

      {shown.length === 0 ? (
        <p className="body muted">No stones yet. Your first battle lays the first one.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {shown.map((s) => <StoneTile key={s.id} stone={s} onClick={() => navigate(`/stones/${s.id}`)} />)}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center', gap: 16, marginTop: 4 }}>
        <Legend color="var(--gold)" label="Stood" />
        <Legend color="var(--spirit-2)" label="Won from memory" />
        <Legend color="var(--rose)" label="Rose again" />
      </div>

      <div className="spacer" />
      <Button variant="ghost" onClick={wonFromMemory}>I won without opening UNSEEN</Button>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{label}</span>;
}
