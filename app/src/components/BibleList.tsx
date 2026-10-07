// The Bible version picker (onboarding and Settings). Lists the versions this
// deployment is licensed to show through the YouVersion Platform, the
// public-domain Berean Standard Bible first.
import { BSB, hasOldTestament, useBibles, type BibleInfo } from '../engines/bibles';

function note(b: BibleInfo): string {
  if (b.id === BSB) return 'Public domain · recommended';
  if (!hasOldTestament(b)) return `${b.abbreviation} · New Testament only`;
  if (b.publicDomain) return `${b.abbreviation} · Public domain`;
  return `${b.abbreviation} · Licensed via YouVersion`;
}

export function BibleList({ value, onChange, maxHeight = '46vh' }: {
  value: number; onChange: (b: BibleInfo) => void; maxHeight?: number | string;
}) {
  const { catalog, loading } = useBibles();
  const { bibles, live } = catalog;
  return (
    <>
      <div role="radiogroup" aria-label="Bible version" style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-panel)',
        boxShadow: 'var(--shadow-sm)', overflowY: 'auto', maxHeight,
      }}>
        {bibles.map((b, i) => {
          const selected = b.id === value;
          return (
            <button key={b.id} role="radio" aria-checked={selected} onClick={() => onChange(b)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              background: selected ? 'var(--gold-soft)' : 'transparent', border: 0,
              borderBottom: i < bibles.length - 1 ? '1px solid var(--line)' : 'none',
              padding: '12px 17px', color: 'var(--text)', font: '400 16px var(--sans)', cursor: 'pointer',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 16, lineHeight: '22px' }}>{b.title}</strong>
                <div className="tiny">{note(b)}</div>
              </div>
              <span aria-hidden style={{ color: selected ? 'var(--gold-hi)' : 'transparent', fontSize: 18 }}>✓</span>
            </button>
          );
        })}
        {loading && bibles.length <= 1 && (
          <div className="tiny" style={{ padding: '10px 17px' }}>Checking which versions are available…</div>
        )}
      </div>
      <p className="tiny" style={{ margin: 0 }}>
        {live
          ? 'Every verse is fetched live from the YouVersion Platform and shown with its publisher’s copyright notice.'
          : 'Other versions need a YouVersion app key on the server. The Berean Standard Bible is public domain and always available.'}
      </p>
    </>
  );
}
