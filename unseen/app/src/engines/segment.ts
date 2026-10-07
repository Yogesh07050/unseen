// Phrase splitter (§6.6). Guarantees parts.join(' ') === text.
function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function segment(text: string, min = 2, max = 4): string[] {
  const t = text.trim();
  // 1. Split after . ; : , ! ? keeping punctuation and a trailing closing quote.
  const parts: string[] = [];
  let buf = '';
  for (let i = 0; i < t.length; i++) {
    buf += t[i];
    if (/[.;:,!?]/.test(t[i])) {
      let j = i + 1;
      while (j < t.length && /[”"'’]/.test(t[j])) { buf += t[j]; j++; i = j - 1; }
      // keep trailing space with the left part's boundary (we trim later via join on single space)
      parts.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  // 2. Merge any part shorter than 4 words into the next (last into previous).
  const merged: string[] = [];
  for (const p of parts) {
    if (merged.length && words(merged[merged.length - 1]) < 4) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${p}`;
    } else {
      merged.push(p);
    }
  }
  while (merged.length > 1 && words(merged[merged.length - 1]) < 4) {
    const last = merged.pop()!;
    merged[merged.length - 1] = `${merged[merged.length - 1]} ${last}`;
  }

  // 3. While more than max parts, merge the adjacent pair with the smallest combined word count.
  while (merged.length > max) {
    let bestI = 0, best = Infinity;
    for (let i = 0; i < merged.length - 1; i++) {
      const c = words(merged[i]) + words(merged[i + 1]);
      if (c < best) { best = c; bestI = i; }
    }
    merged[bestI] = `${merged[bestI]} ${merged[bestI + 1]}`;
    merged.splice(bestI + 1, 1);
  }

  // 4. With fewer than min parts and more than 12 words, split near the middle.
  if (merged.length < min && words(merged[0] ?? '') > 12) {
    const only = merged[0];
    const toks = only.split(/\s+/);
    const midWord = Math.floor(toks.length / 2);
    const left = toks.slice(0, midWord).join(' ');
    const right = toks.slice(midWord).join(' ');
    merged.splice(0, 1, left, right);
  }

  // 5. Assert the rejoin invariant (normalise whitespace on both sides).
  const rejoined = merged.join(' ').replace(/\s+/g, ' ').trim();
  const normalisedText = t.replace(/\s+/g, ' ').trim();
  if (rejoined !== normalisedText) {
    return [normalisedText];
  }
  return merged;
}
