// The signed-in session, kept in localStorage (not the sealed store: it must be
// readable before the vault opens, and it is only a bearer token + username).
export interface AuthUser { id: string; username: string }

const TOKEN_KEY = 'unseen-session';
const USER_KEY = 'unseen-auth-user';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function getCachedUser(): AuthUser | null {
  try { const raw = localStorage.getItem(USER_KEY); return raw ? (JSON.parse(raw) as AuthUser) : null; } catch { return null; }
}
export function setSession(token: string, user: AuthUser): void {
  try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}
export function clearSession(): void {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
}

// Mirrors the server's rules (server/app/services/auth.py) so the form can say
// what is wrong before a round trip.
export const USERNAME_RE = /^[a-z0-9][a-z0-9_.]{2,31}$/;
export const PASSWORD_MIN = 8;
export function usernameProblem(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  if (!u) return null;
  if (u.length < 3) return 'At least 3 characters.';
  if (u.length > 32) return 'At most 32 characters.';
  if (!USERNAME_RE.test(u)) return 'Letters, numbers, dots or underscores; start with a letter or number.';
  return null;
}
export function passwordProblem(p: string): string | null {
  if (!p) return null;
  if (p.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters.`;
  if (p !== p.trim()) return 'No spaces at the start or end.';
  return null;
}
