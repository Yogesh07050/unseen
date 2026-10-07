import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, VerseSkeleton } from '../components/ui';
import { getStone } from '../data/repos';
import { getVerified } from '../engines/verses';
import { Vellum } from '../components/ui';
import type { Stone, VerifiedVerse } from '../types';

export function StoneDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stone, setStone] = useState<Stone | null>(null);
  const [verse, setVerse] = useState<VerifiedVerse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = id ? await getStone(id) : null;
      setStone(s);
      if (s?.verse) setVerse(await getVerified(s.verse.bibleId, s.verse.usfm).catch(() => null));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="screen"><Button variant="ghost" onClick={() => navigate('/stones')}>Back to the wall</Button><VerseSkeleton /></div>;
  if (!stone) return <div className="screen"><Button variant="ghost" onClick={() => navigate('/stones')}>Back to the wall</Button><p className="body muted">Stone not found.</p></div>;

  const kindLabel = stone.kind === 'from_memory' ? 'Won from memory' : stone.kind === 'rose_again' ? 'Rose again' : 'Stood';
  return (
    <div className="screen fade-up">
      <Button variant="ghost" onClick={() => navigate('/stones')}>Back to the wall</Button>
      <h1 className="title">{kindLabel}</h1>
      <p className="small muted">{new Date(stone.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      {verse && <Vellum verse={verse} />}
      {stone.verse && !verse && <p className="small muted">The verified verse is unavailable right now.</p>}
      {stone.note && <p className="body">{stone.note}</p>}
    </div>
  );
}
