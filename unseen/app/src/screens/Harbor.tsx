import { useNavigate, useSearchParams } from 'react-router-dom';
import { CRISIS_RESOURCES } from '../content/misc';
import { useSettings } from '../store';
import { useBattle } from '../battle/useBattle';

export function Harbor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'care' ? 'care' : 'crisis';
  const { settings, allies } = useSettings();
  const { discern } = useBattle();

  const region = settings?.crisisCountry
    ?? (typeof navigator !== 'undefined' ? (navigator.language.split('-')[1] ?? 'US') : 'US');
  const res = CRISIS_RESOURCES[region] ?? CRISIS_RESOURCES.US;

  async function notCrisis() {
    const r = await discern();
    if (r.route === 'harbor') return;
    navigate('/discern', { replace: true });
  }

  const allyBtns = allies.filter((a) => a.phone).map((a) => (
    <HarborBtn key={a.id} label={`Call ${a.name}`} href={`tel:${a.phone}`} />
  ));
  const pastorBtn = <HarborBtn label="Contact your pastor" href="sms:" />;
  const counsellorBtn = settings?.counsellorUrl
    ? <HarborBtn label="Talk to a counsellor" href={settings.counsellorUrl} external />
    : null;
  const crisisLine = res.line.tel
    ? <HarborBtn label={res.line.label} sub={res.line.sub} href={`tel:${res.line.tel}`} />
    : <HarborBtn label={res.line.label} href={res.line.url} external />;
  const emergencyBtn = res.emergency.tel
    ? <HarborBtn label={res.emergency.label} href={`tel:${res.emergency.tel}`} danger />
    : null;

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(180deg,var(--harbor-bg-1),var(--harbor-bg-2))', color: 'var(--harbor-ink)' }}>
      <div className="screen" style={{ color: 'var(--harbor-ink)' }}>
        <div style={{ fontSize: 40, textAlign: 'center' }} aria-hidden>{mode === 'care' ? '🤍' : '☀️'}</div>
        <h1 className="title" style={{ color: 'var(--harbor-ink)', textAlign: 'center' }}>
          {mode === 'care' ? "This isn't a battle to fight alone." : "You don't have to carry this alone."}
        </h1>
        <p className="body" style={{ color: 'var(--harbor-ink)', textAlign: 'center' }}>
          {mode === 'care'
            ? 'This sounds heavy. Reaching out to someone who loves you is a strong, good step.'
            : 'What you said sounds really heavy. You deserve support from a real person right now.'}
        </p>

        {mode === 'care' ? (
          // People first; crisis line kept available but secondary.
          <>
            <div className="stack">
              {allyBtns.length ? allyBtns : null}
              {pastorBtn}
              {counsellorBtn}
            </div>
            <p className="tiny" style={{ color: 'var(--harbor-muted)', textAlign: 'center', marginTop: 4 }}>If it ever feels like more than you can carry</p>
            <div className="stack">
              {crisisLine}
              {emergencyBtn}
            </div>
          </>
        ) : (
          <div className="stack">
            {crisisLine}
            {allyBtns}
            {pastorBtn}
            {emergencyBtn}
            <HarborBtn label="Outside the US? See crisis lines near you" href="https://findahelpline.com" external quiet />
          </div>
        )}

        <p style={{ fontStyle: 'italic', color: 'var(--harbor-muted)', textAlign: 'center', marginTop: 8 }}>
          “The LORD is near to the brokenhearted; He saves the contrite in spirit.” <span style={{ display: 'block', fontStyle: 'normal', fontSize: 13 }}>Psalm 34:18</span>
        </p>

        <div className="spacer" />
        <button style={btn('solid')} onClick={() => navigate('/', { replace: true })}>I'm safe. Take me back.</button>
        {mode === 'crisis'
          ? <button style={btn('text')} onClick={notCrisis}>This isn't a crisis</button>
          : <button style={btn('text')} onClick={() => navigate('/cry-out?mode=text', { replace: true })}>Return to my words</button>}
      </div>
    </div>
  );
}

function HarborBtn({ label, sub, href, external, danger, quiet }: { label: string; sub?: string; href?: string; external?: boolean; danger?: boolean; quiet?: boolean }) {
  return (
    <a href={href} target={external ? '_blank' : undefined} rel="noreferrer" style={{
      display: 'block', textDecoration: 'none', borderRadius: 16, padding: '14px 16px',
      background: quiet ? 'transparent' : danger ? '#F4D7CF' : 'var(--surface)',
      border: `1px solid ${danger ? '#D98C7A' : 'var(--line-strong)'}`, color: danger ? '#7A2A1A' : 'var(--harbor-ink)', textAlign: 'center',
    }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--harbor-muted)' }}>{sub}</div>}
    </a>
  );
}
function btn(kind: 'solid' | 'text'): React.CSSProperties {
  return kind === 'solid'
    ? { height: 54, borderRadius: 28, border: 0, background: 'linear-gradient(180deg,#2BC2F0 0%,#00A8E1 52%,#0089C4 100%)', color: '#FFFFFF', fontWeight: 700, fontSize: 18, width: '100%', boxShadow: '0 10px 26px rgba(0,168,225,.32)' }
    : { height: 40, border: 0, background: 'transparent', color: 'var(--harbor-muted)', fontSize: 16, width: '100%' };
}
