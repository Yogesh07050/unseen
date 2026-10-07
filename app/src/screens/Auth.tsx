import { useState, type FormEvent } from 'react';
import { Button, Panel, QuoteLine } from '../components/ui';
import { ApiError } from '../ai/api';
import { passwordProblem, usernameProblem, PASSWORD_MIN } from '../data/auth';
import { useAuth } from '../store';

type Mode = 'login' | 'register';

const EYE = (open: boolean) => open
  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.4 5.1A9 9 0 0121 12a9 9 0 01-1.6 2.6M6.1 6.1A9 9 0 003 12a9 9 0 0010.9 5.3"/></svg>;

function messageFor(e: unknown, mode: Mode): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'bad_credentials': return 'Wrong username or password.';
      case 'username_taken': return 'That username is taken. Try another, or sign in.';
      case 'invalid_username':
      case 'weak_password': return e.message;
      case 'locked': return 'Too many attempts. Wait fifteen minutes and try again.';
      case 'rate_limited': return 'Too many requests from this device. Try again in a few minutes.';
      case 'no_database': return 'Accounts are not set up on this server yet.';
    }
    if (e.status >= 500) return 'UNSEEN could not reach its server. Try again in a moment.';
    return e.message || 'Something went wrong.';
  }
  if (e instanceof DOMException && e.name === 'AbortError') return 'The server took too long. Check your connection and try again.';
  if (!navigator.onLine) return `You are offline. ${mode === 'login' ? 'Signing in' : 'Creating an account'} needs a connection.`;
  return 'Could not reach UNSEEN. Check your connection and try again.';
}

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const uProblem = usernameProblem(username);
  const pProblem = mode === 'register' ? passwordProblem(password) : null;
  const cProblem = mode === 'register' && confirm && confirm !== password ? 'Passwords do not match.' : null;
  const canSubmit = !busy && username.trim().length >= 3 && password.length >= (mode === 'register' ? PASSWORD_MIN : 1)
    && !uProblem && !pProblem && (mode === 'login' || (confirm === password));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, password);
      // A fresh boot pulls this account's history (App.syncOnBoot) and routes to Home or onboarding.
      window.location.replace('/');
    } catch (err) {
      setError(messageFor(err, mode));
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next); setError(null); setConfirm(''); setTouched(false);
  }

  return (
    <div className="screen fade-up">
      <img src="/art/hills-of-fire.svg" alt="" style={{ width: '100%', borderRadius: 16, border: '1px solid var(--line)' }} />
      <span className="wordmark">UNSEEN</span>
      <h1 className="title">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
      <p className="body muted" style={{ margin: 0 }}>
        {mode === 'login'
          ? 'Sign in to pick up your battles, stones and allies on this phone.'
          : 'One username and password. No e-mail, nothing else to give.'}
      </p>

      <form onSubmit={submit} className="stack" noValidate>
        <Panel>
          <label className="tiny" htmlFor="auth-username" style={{ display: 'block', marginBottom: 6 }}>USERNAME</label>
          <input id="auth-username" className="text-input" placeholder="yourname" value={username}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
            inputMode="text" maxLength={32} disabled={busy}
            onChange={(e) => { setUsername(e.target.value); setError(null); }} />
          {touched && uProblem && <p className="tiny" style={{ color: 'var(--ember)', margin: '6px 0 0' }}>{uProblem}</p>}

          <label className="tiny" htmlFor="auth-password" style={{ display: 'block', margin: '14px 0 6px' }}>PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input id="auth-password" className="text-input" type={show ? 'text' : 'password'} value={password}
              placeholder={mode === 'register' ? `At least ${PASSWORD_MIN} characters` : 'Your password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={128} disabled={busy}
              style={{ paddingRight: 44 }}
              onChange={(e) => { setPassword(e.target.value); setError(null); }} />
            <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'}
              onClick={() => setShow((v) => !v)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>{EYE(show)}</button>
          </div>
          {touched && pProblem && <p className="tiny" style={{ color: 'var(--ember)', margin: '6px 0 0' }}>{pProblem}</p>}

          {mode === 'register' && (
            <>
              <label className="tiny" htmlFor="auth-confirm" style={{ display: 'block', margin: '14px 0 6px' }}>CONFIRM PASSWORD</label>
              <input id="auth-confirm" className="text-input" type={show ? 'text' : 'password'} value={confirm}
                placeholder="Type it again" autoComplete="new-password" maxLength={128} disabled={busy}
                onChange={(e) => { setConfirm(e.target.value); setError(null); }} />
              {cProblem && <p className="tiny" style={{ color: 'var(--ember)', margin: '6px 0 0' }}>{cProblem}</p>}
            </>
          )}
        </Panel>

        {error && (
          <p role="alert" className="small" style={{ margin: 0, color: 'var(--ember)' }}>{error}</p>
        )}

        <Button type="submit" disabled={!canSubmit}>
          {busy ? (mode === 'login' ? 'Signing in…' : 'Creating your account…') : (mode === 'login' ? 'Sign in' : 'Create account')}
        </Button>
      </form>

      <Button variant="quiet" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </Button>

      <div className="spacer" />
      <QuoteLine text="Then Elisha prayed, “O LORD, please open his eyes that he may see.”" reference="2 Kings 6:17" />
      <p className="tiny" style={{ margin: 0 }}>Your battles are private to your account. Your spoken words never leave this phone.</p>
    </div>
  );
}
