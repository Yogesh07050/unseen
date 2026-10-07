// Speech-to-strike matcher (§6.7).

const NUM: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six',
  '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve',
  '13': 'thirteen', '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
  '18': 'eighteen', '19': 'nineteen', '20': 'twenty',
};

const HOMOPHONES: string[][] = [
  ['to', 'too', 'two'], ['their', 'there', 'theyre'], ['your', 'youre'],
  ['sun', 'son'], ['whole', 'hole'], ['peace', 'piece'], ['wont', 'want'],
];

export function norm(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUM[w] ?? w);
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function same(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && lev(a, b) <= 1) return true;
  for (const set of HOMOPHONES) if (set.includes(a) && set.includes(b)) return true;
  return false;
}

// Longest common subsequence length under the sameness rule.
function lcs(phrase: string[], window: string[]): number {
  const m = phrase.length, n = window.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = same(phrase[i - 1], window[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

export interface MatchState { phraseIndex: number; offset: number }

export function matchPhrase(
  phrase: string,
  tokens: string[],
  s: MatchState,
  threshold = 0.6,
): { struck: boolean; score: number } {
  const pTok = norm(phrase);
  if (pTok.length === 0) return { struck: false, score: 0 };
  const windowAll = tokens.slice(s.offset);
  const window = windowAll.slice(0, pTok.length + 6);
  const score = lcs(pTok, window) / pTok.length;

  // Last three tokens appearing in order at the end of the window also strikes.
  const tail = pTok.slice(-3);
  let tailHit = false;
  if (tail.length >= 1) {
    let k = window.length - 1;
    let ti = tail.length - 1;
    while (k >= 0 && ti >= 0) {
      if (same(window[k], tail[ti])) ti--;
      k--;
    }
    tailHit = ti < 0;
  }
  return { struck: score >= threshold || tailHit, score };
}
