import type { Stone } from '../types';

const VEIN: Record<Stone['kind'], string> = {
  stood: 'var(--gold)', from_memory: 'var(--spirit-2)', rose_again: 'var(--rose)',
};

export function StoneTile({ stone, onClick }: { stone: Stone; onClick?: () => void }) {
  const label = stone.kind === 'from_memory' ? 'From memory' : stone.kind === 'rose_again' ? 'Rose again' : (stone.verse?.reference ?? 'Stood');
  const [, m, d] = stone.date.split('-');
  return (
    <button onClick={onClick} style={{
      height: 76, borderRadius: '16px 11px 18px 12px', border: '1px solid var(--line-strong)', textAlign: 'left',
      background: 'radial-gradient(130% 120% at 32% 22%, #FCF8EF 0%, #F0E8D7 56%, #E5DAC3 100%)',
      boxShadow: 'var(--shadow-sm), inset 0 1px 1px rgba(255,255,255,.7), inset 0 -4px 10px rgba(160,120,50,.08)',
      padding: '9px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', color: 'var(--ink)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-deep)' }}>{m}/{d}</span>
      <span style={{ fontSize: 12.5, lineHeight: 1.2, color: 'var(--ink-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ position: 'absolute', right: 9, top: 9, width: 7, height: 7, borderRadius: '50%', background: VEIN[stone.kind], boxShadow: `0 0 6px ${VEIN[stone.kind]}` }} />
    </button>
  );
}
