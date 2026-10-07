import { CLASSIFIER_STEMS } from '../content/misc';
import type { Struggle } from '../types';

// On-device keyword classifier used when discernment is unavailable (§6.8).
export function classify(text: string): Struggle {
  const t = text.toLowerCase();
  let best: Struggle = 'other';
  let bestN = 0;
  (Object.keys(CLASSIFIER_STEMS) as (keyof typeof CLASSIFIER_STEMS)[]).forEach((struggle) => {
    const n = CLASSIFIER_STEMS[struggle].filter((s) => t.includes(s)).length;
    if (n > bestN) { bestN = n; best = struggle; }
  });
  return bestN ? best : 'other';
}
