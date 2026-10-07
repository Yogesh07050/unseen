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
            <p className="tiny" style={{ color: '#5a4b7a', textAlign: 'center', marginTop: 4 }}>If it ever feels like more than you can carry</p>
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

        <p style={{ fontStyle: 'italic', color: '#5a4b7a', textAlign: 'center', marginTop: 8 }}>
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
      display: 'block', textDecoration: 'none', borderRadius: 14, padding: '14px 16px',
      background: quiet ? 'transparent' : danger ? '#F4D7CF' : '#FFFFFF',
      border: `1px solid ${danger ? '#D98C7A' : 'rgba(42,35,70,.15)'}`, color: 'var(--harbor-ink)', textAlign: 'center',
    }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontSize: 13, color: '#5a4b7a' }}>{sub}</div>}
    </a>
  );
}
function btn(kind: 'solid' | 'text'): React.CSSProperties {
  return kind === 'solid'
    ? { height: 54, borderRadius: 27, border: 0, background: '#2A2346', color: '#FBF4E8', fontWeight: 700, fontSize: 18, width: '100%' }
    : { height: 40, border: 0, background: 'transparent', color: '#5a4b7a', fontSize: 16, width: '100%' };
}
