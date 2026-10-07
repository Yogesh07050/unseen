import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Panel, QuoteLine } from '../components/ui';
import { useSettings } from '../store';
import { DEFAULT_SETTINGS } from '../data/repos';
import { allFixedUsfm } from '../content/truthIndex';
import { getPassage } from '../engines/verses';
import type { Settings } from '../types';

type Step = 'welcome' | 'age' | 'name' | 'tradition' | 'bible' | 'lock' | 'allies' | 'prepare';

export function Onboarding() {
  const navigate = useNavigate();
  const { update } = useSettings();
  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [prepareMsg, setPrepareMsg] = useState('Gathering your verses…');

  const go = (s: Step) => setStep(s);

  async function finish(d: Settings) {
    go('prepare');
    try {
      if ('storage' in navigator && navigator.storage.persist) await navigator.storage.persist();
      // Prefetch and cache every Truth Index verse (public-domain BSB).
      const ids = allFixedUsfm();
      let done = 0;
      await Promise.all(ids.map(async (u) => {
        try { await getPassage(d.bibleId, [u]); } catch { /* ignore */ }
        done += 1;
        setPrepareMsg(`Gathering your verses… ${done}/${ids.length}`);
      }));
    } catch { /* ignore */ }
    await update({ ...d, onboardedAt: Date.now(), adultConfirmedAt: Date.now() });
    navigate('/', { replace: true });
  }

  if (step === 'welcome') {
    return (
      <div className="screen fade-up">
        <img src="/art/hills-of-fire.svg" alt="" style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }} />
        <QuoteLine text="Then Elisha prayed, “O LORD, please open his eyes that he may see.”" reference="2 Kings 6:17" />
        <span className="wordmark">UNSEEN</span>
        <h1 className="title">You are not alone in this fight.</h1>
        <p className="body">When temptation speaks, answer it the way Jesus did, with Scripture. UNSEEN finds the right verse in seconds and remembers every battle, privately.</p>
        <p className="small muted">No account. Nothing to sign up for.</p>
        <p className="small muted">Your battle log stays on this phone, behind your screen lock.</p>
        <div className="spacer" />
        <Button onClick={() => go('age')}>Open my eyes</Button>
      </div>
    );
  }

  if (step === 'age') {
    return (
      <div className="screen center fade-up">
        <h2 className="section-title">UNSEEN is for adults.</h2>
        <p className="body">Are you 18 or older?</p>
        <Button onClick={() => go('name')}>I'm 18 or older</Button>
        <Button variant="ghost" onClick={() => go('welcome')}>Not yet</Button>
        <p className="tiny" style={{ marginTop: 10 }}>Under 18? Talk with a parent, youth leader or pastor you trust.</p>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="screen fade-up">
        <div className="spacer" />
        <h2 className="section-title">What should we call you?</h2>
        <input className="text-input" placeholder="First name" value={draft.firstName ?? ''}
          onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
        <div className="spacer" />
        <Button onClick={() => go('tradition')}>Continue</Button>
        <Button variant="quiet" onClick={() => go('tradition')}>Skip</Button>
      </div>
    );
  }

  if (step === 'tradition') {
    const options: [Settings['tradition'] | undefined, string][] = [
      ['evangelical', 'Evangelical'], ['catholic', 'Catholic'], ['mainline', 'Mainline'], [undefined, 'General Christian'],
    ];
    return (
      <div className="screen fade-up">
        <div className="spacer" />
        <h2 className="section-title">Which tradition feels like home?</h2>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {options.map(([val, label]) => (
            <Chip key={label} label={label} selected={draft.tradition === val} onClick={() => setDraft({ ...draft, tradition: val })} />
          ))}
        </div>
        <div className="spacer" />
        <Button onClick={() => go('bible')}>Continue</Button>
      </div>
    );
  }

  if (step === 'bible') {
    return (
      <div className="screen fade-up">
        <div className="spacer" />
        <h2 className="section-title">Bible version</h2>
        <Panel><div className="row"><div style={{ flex: 1 }}><strong>Berean Standard Bible</strong><div className="tiny">Public domain · recommended</div></div><span style={{ color: 'var(--gold-hi)' }}>✓</span></div></Panel>
        <p className="tiny">Other versions follow their YouVersion licence and need an app key.</p>
        <div className="spacer" />
        <Button onClick={() => go('lock')}>Continue</Button>
      </div>
    );
  }

  if (step === 'lock') {
    const hasWebauthn = 'credentials' in navigator && 'PublicKeyCredential' in window;
    return (
      <div className="screen fade-up">
        <div className="spacer" />
        <h2 className="section-title">Lock UNSEEN with Face ID?</h2>
        <p className="body">Your battle log is sensitive. A device lock keeps it yours.</p>
        <div className="spacer" />
        <Button onClick={() => { setDraft({ ...draft, lock: hasWebauthn ? 'webauthn' : 'none' }); go('allies'); }}>Turn on</Button>
        <Button variant="ghost" onClick={() => go('allies')}>Not now</Button>
      </div>
    );
  }

  if (step === 'allies') {
    return (
      <div className="screen fade-up">
        <div className="spacer" />
        <h2 className="section-title">Who holds up your arms?</h2>
        <p className="body">Up to three people can pray for you in the moment. They never see what you are facing. You can add them later in Allies.</p>
        <div className="spacer" />
        <Button onClick={() => finish(draft)}>Continue</Button>
        <Button variant="quiet" onClick={() => finish(draft)}>Later</Button>
      </div>
    );
  }

  return (
    <div className="screen center">
      <span className="wordmark">UNSEEN</span>
      <p className="body" style={{ marginTop: 20 }}>{prepareMsg}</p>
    </div>
  );
}
