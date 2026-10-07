import { useEffect, useState } from 'react';
import { Button, DemoTag, Panel, QuoteLine } from '../components/ui';
import { SharpnessMeter } from '../components/charts';
import { allArmory, allBattles, allStones, saveArmory } from '../data/repos';
import { getPassage } from '../engines/verses';
import { speak, stopSpeaking } from '../engines/speech';
import { localDate } from '../battle/useBattle';
import { useUi } from '../store';
import type { ArmoryVerse, Stone } from '../types';

const INTERVALS = [0, 1, 3, 7, 14, 30];

export function Armory() {
  const { showToast } = useUi();
  const [verses, setVerses] = useState<ArmoryVerse[]>([]);
  const [stones, setStones] = useState<Stone[]>([]);

  useEffect(() => {
    (async () => {
      let v = await allArmory();
      if (v.length === 0) v = await seedFromBattles();
      setVerses(v.sort((a, b) => a.nextDrillAt - b.nextDrillAt));
      setStones(await allStones());
    })();
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const fromMemory = stones.filter((s) => s.kind === 'from_memory' && s.date.startsWith(localDate().slice(0, 7))).length;

  async function drill(v: ArmoryVerse) {
    void speak(`${v.verse.reference}. Say it from memory.`, undefined, () => showToast('Could not play the verse audio. Check the connection and retry.'));
    const next = Math.min(5, v.sharpness + 1) as ArmoryVerse['sharpness'];
    const updated = { ...v, sharpness: next, drills: v.drills + 1, nextDrillAt: Date.now() + INTERVALS[next] * 86400_000 };
    await saveArmory(updated);
    setVerses((cur) => cur.map((x) => (x.id === v.id ? updated : x)).sort((a, b) => a.nextDrillAt - b.nextDrillAt));
  }

  return (
    <div className="screen has-nav">
      <h1 className="title">Armory</h1>
      <QuoteLine text="I have hidden Your word in my heart that I might not sin against You." reference="Psalm 119:11" />

      <Panel>
        <strong>{fromMemory} battles won from memory this {month}</strong>
        <p className="small muted" style={{ margin: '4px 0 0' }}>When a verse is sharp, UNSEEN steps back and lets you fight without it.</p>
      </Panel>

      <div className="stack">
        {verses.length === 0 && <p className="body muted">Verses join the Armory after your first stood battle.</p>}
        {verses.map((v) => (
          <Panel key={v.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{v.verse.reference}</strong>
                <div className="tiny">{v.firstWords}…</div>
                <div style={{ marginTop: 6 }}><SharpnessMeter value={v.sharpness} /></div>
              </div>
              <Button variant="ghost" onClick={() => drill(v)}>Drill</Button>
            </div>
          </Panel>
        ))}
      </div>
      {stones.some((s) => s.demo) && <DemoTag />}
    </div>
  );
}

async function seedFromBattles(): Promise<ArmoryVerse[]> {
  const battles = await allBattles();
  const stood = battles.filter((b) => b.outcome === 'stood' && b.verse.usfm.length);
  const seen = new Set<string>();
  const out: ArmoryVerse[] = [];
  for (const b of stood) {
    const id = `${b.verse.bibleId}:${b.verse.usfm.join(',')}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const wins = stood.filter((x) => x.verse.usfm.join(',') === b.verse.usfm.join(',')).length;
    const sharpness = Math.min(5, wins) as ArmoryVerse['sharpness'];
    let firstWords = '';
    try { const p = await getPassage(b.verse.bibleId, b.verse.usfm); firstWords = p.text.split(/\s+/).slice(0, 5).join(' '); } catch { firstWords = b.verse.reference; }
    const v: ArmoryVerse = { id, verse: b.verse, firstWords, sharpness, nextDrillAt: Date.now() + INTERVALS[sharpness] * 86400_000, wins, drills: 0 };
    out.push(v);
    await saveArmory(v);
  }
  return out;
}
