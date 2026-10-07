import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Public, content-free prayer page (§11). Loads no app data, needs no lock.
export function AllyPage() {
  const { token } = useParams();
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'expired'>('loading');

  const localKey = `unseen-prayed-${token}`;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/pray/${token}`);
        if (res.status === 410) { setState('expired'); return; }
        if (localStorage.getItem(localKey)) { setState('done'); return; }
        setState('ready');
      } catch { setState('expired'); }
    })();
  }, [token, localKey]);

  async function pray() {
    try {
      const res = await fetch(`/api/pray/${token}/ack`, { method: 'POST' });
      if (res.ok) { localStorage.setItem(localKey, '1'); setState('done'); }
      else setState('expired');
    } catch { setState('expired'); }
  }

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(180deg,#EAF6FD,#CBE7F8)', color: '#0E2B45', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }} aria-hidden>🕯️</div>
        {state === 'loading' && <p>…</p>}
        {state === 'ready' && (
          <>
            <h1 style={{ fontFamily: 'var(--serif)' }}>Someone you love asked for prayer right now.</h1>
            <p>They have shared nothing else, and this page stores nothing about you.</p>
            <button onClick={pray} style={{ height: 54, borderRadius: 28, border: 0, background: 'linear-gradient(180deg,#2BC2F0 0%,#00A8E1 52%,#0089C4 100%)', color: '#FFFFFF', fontWeight: 700, fontSize: 18, width: '100%', boxShadow: '0 10px 26px rgba(0,168,225,.32)' }}>I'm praying</button>
          </>
        )}
        {state === 'done' && <><h1 style={{ fontFamily: 'var(--serif)' }}>Thank you.</h1><p>They'll see a light beside them.</p></>}
        {state === 'expired' && <p>This prayer request has ended. Thank you for caring.</p>}
      </div>
    </div>
  );
}
