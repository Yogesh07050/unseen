import { allAllies, allArmory, allBattles, allStones, allWatch, getSettings } from './repos';

export async function buildExport() {
  const [settings, battles, stones, armory, watch, allies] = await Promise.all([
    getSettings(), allBattles(), allStones(), allArmory(), allWatch(), allAllies(),
  ]);
  const safeSettings = settings ? { ...settings, credentialId: undefined } : null;
  return { version: 1 as const, exportedAt: Date.now(), settings: safeSettings, battles, stones, armory, watch, allies };
}

export async function downloadExportJson() {
  const data = await buildExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `unseen-export-${d}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
