/**
 * Fetch every Truth Index verse through the API and fail if any is missing (§3).
 * Run against a running API:  npm run check:verses
 */
import { allFixedUsfm, BIBLE_ID } from '../app/src/content/truthIndex';

const API = process.env.API_BASE ?? 'http://localhost:8000';
const INSTALL = 'check-verses';

async function main() {
  const ids = allFixedUsfm();
  const missing: string[] = [];
  for (const u of ids) {
    try {
      const r = await fetch(`${API}/api/verse/${BIBLE_ID}/${u}`, { headers: { 'X-Install-Id': INSTALL } });
      const j = (await r.json()) as any;
      if (!r.ok || !j.content || !j.content.trim()) missing.push(u);
    } catch { missing.push(u); }
  }
  console.log(`Checked ${ids.length} verses against ${API}.`);
  if (missing.length) {
    console.error(`MISSING (${missing.length}): ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('All Truth Index verses fetch successfully.');
}

main().catch((e) => { console.error(e); process.exit(2); });
