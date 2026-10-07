import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button, Chip, Panel, Toggle } from '../components/ui';
import { BibleList } from '../components/BibleList';
import { attribution, useBibleInfo, useBibles } from '../engines/bibles';
import { useSettings, useUi } from '../store';
import { downloadExportJson } from '../data/export';
import { wipeEverything } from '../data/db';
import { resetKeyCache } from '../data/crypto';
import { wipeRemote } from '../data/sync';
import { installId } from '../ai/api';

export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const { showToast } = useUi();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickVersion, setPickVersion] = useState(false);
  const s = settings;
  const bible = useBibleInfo(s?.bibleId ?? 3034);
  const { catalog } = useBibles();
  if (!s) return null;

  return (
    <div className="screen">
      <div className="header-row">
        <h1 className="title">Settings</h1>
        <button className="icon-btn" onClick={() => navigate('/')}>Done</button>
      </div>

      <Panel>
        <SettingRow label="Tradition">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {(['evangelical', 'catholic', 'mainline'] as const).map((t) => (
              <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} selected={s.tradition === t} onClick={() => update({ tradition: s.tradition === t ? undefined : t })} />
            ))}
            <Chip label="General" selected={!s.tradition} onClick={() => update({ tradition: undefined })} />
          </div>
        </SettingRow>
        <SettingRow label="Bible version">
          <div className="row">
            <span className="small muted">{bible.title}</span>
            <Chip label={pickVersion ? 'Close' : 'Change'} selected={pickVersion} onClick={() => setPickVersion((v) => !v)} />
          </div>
        </SettingRow>
        {pickVersion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <BibleList value={s.bibleId} maxHeight={320} onChange={async (b) => {
              await update({ bibleId: b.id });
              setPickVersion(false);
              showToast(`Scripture will now be shown from the ${b.title}.`);
            }} />
          </div>
        )}
        <SettingRow label="Appearance">
          <div className="row">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} selected={(s.theme ?? 'system') === t} onClick={() => update({ theme: t })} />
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Battle style">
          <div className="row">
            <Chip label="Cinematic" selected={s.battleStyle === 'cinematic'} onClick={() => update({ battleStyle: 'cinematic' })} />
            <Chip label="Symbolic" selected={s.battleStyle === 'symbolic'} onClick={() => update({ battleStyle: 'symbolic' })} />
          </div>
        </SettingRow>
        <SettingRow label="Discernment">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <Chip label="AI reads your words" selected={(s.discernMode ?? 'gloo') === 'gloo'} onClick={() => update({ discernMode: 'gloo', discernChosen: true })} />
            <Chip label="On this phone only" selected={s.discernMode === 'instant'} onClick={() => update({ discernMode: 'instant', discernChosen: true })} />
          </div>
        </SettingRow>
        <SettingRow label="Reduce motion"><Toggle on={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} /></SettingRow>
        <SettingRow label="Sound"><Toggle on={s.sound} onChange={(v) => update({ sound: v })} /></SettingRow>
        <SettingRow label="Keep battle notes">
          <div className="row">
            {([7, 30, null] as const).map((d) => <Chip key={String(d)} label={d === null ? 'Keep' : `${d} days`} selected={s.retentionDays === d} onClick={() => update({ retentionDays: d })} />)}
          </div>
        </SettingRow>
        <SettingRow label="Watch alerts">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {(['off', 'in_app', 'calendar'] as const).map((w) => <Chip key={w} label={w === 'in_app' ? 'In app' : w[0].toUpperCase() + w.slice(1)} selected={s.watchAlerts === w} onClick={() => update({ watchAlerts: w })} />)}
          </div>
        </SettingRow>
      </Panel>

      <Panel>
        <button className="list-row" style={rowBtn} onClick={() => { downloadExportJson(); showToast('Export saved. Keep it somewhere safe.'); }}>Export my data</button>
        <button className="list-row" style={{ ...rowBtn, color: 'var(--ember)', borderBottom: 'none' }} onClick={() => setConfirmDelete(true)}>Delete everything</button>
      </Panel>

      <Panel>
        <p className="tiny" style={{ margin: 0 }}>
          Your battles, stones, allies and Armory are saved on this phone and backed up to UNSEEN under this install only
          (no account, no e-mail). Your spoken words never leave the phone. Install id: {installId().slice(0, 8)}.
        </p>
      </Panel>

      <Panel>
        <p className="tiny" style={{ margin: 0 }}>
          Scripture: {bible.title} ({bible.abbreviation}). {attribution(bible)}{' '}
          {catalog.live ? 'Fetched live from the YouVersion Platform and verified at run time, never generated.' : 'Fetched and verified at run time, never generated.'}{' '}
          Fonts: Alegreya &amp; Alegreya Sans (SIL Open Font License).
        </p>
      </Panel>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(38,33,26,.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 24 }}>
          <div className="card" style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="section-title">Delete everything</h2>
            <p className="body" style={{ margin: 0 }}>This deletes every battle, stone, ally and setting on this phone and its backup on UNSEEN. It cannot be undone.</p>
            <Button onClick={async () => { await wipeRemote(); await wipeEverything(); resetKeyCache(); location.href = '/'; }}>Delete it all</Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my data</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const rowBtn: React.CSSProperties = { width: '100%', background: 'transparent', border: 0, textAlign: 'left', color: 'inherit', font: '400 17px var(--sans)' };
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="row" style={{ justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 8 }}><span className="body">{label}</span>{children}</div>;
}
