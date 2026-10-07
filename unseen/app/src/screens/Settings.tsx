import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button, Chip, Panel, Toggle } from '../components/ui';
import { useSettings, useUi } from '../store';
import { downloadExportJson } from '../data/export';
import { wipeEverything } from '../data/db';
import { clearDemo } from '../data/repos';
import { resetKeyCache } from '../data/crypto';

export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const { showToast } = useUi();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = settings;
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
        <SettingRow label="Bible version"><span className="small muted">Berean Standard Bible</span></SettingRow>
        <SettingRow label="Battle style">
          <div className="row">
            <Chip label="Cinematic" selected={s.battleStyle === 'cinematic'} onClick={() => update({ battleStyle: 'cinematic' })} />
            <Chip label="Symbolic" selected={s.battleStyle === 'symbolic'} onClick={() => update({ battleStyle: 'symbolic' })} />
          </div>
        </SettingRow>
        <SettingRow label="Discernment">
          <div className="row">
            <Chip label="Instant" selected={(s.discernMode ?? 'instant') === 'instant'} onClick={() => update({ discernMode: 'instant' })} />
            <Chip label="Deeper reading" selected={s.discernMode === 'gloo'} onClick={() => update({ discernMode: 'gloo' })} />
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

      <button className="icon-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { navigate('/dev'); }}>Demo controls</button>
      <button className="icon-btn" style={{ alignSelf: 'flex-start' }} onClick={async () => { await clearDemo(); showToast('Demo data cleared.'); }}>Clear demo data</button>

      <Panel>
        <p className="tiny" style={{ margin: 0 }}>The Holy Bible, Berean Standard Bible, is in the public domain. Fonts: Alegreya &amp; Alegreya Sans (SIL Open Font License). Scripture is fetched and verified at run time, never generated.</p>
      </Panel>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(38,33,26,.5)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 24 }}>
          <div className="card" style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="section-title">Delete everything</h2>
            <p className="body" style={{ margin: 0 }}>This deletes every battle, stone and setting on this phone. It cannot be undone.</p>
            <Button onClick={async () => { await wipeEverything(); resetKeyCache(); location.href = '/'; }}>Delete it all</Button>
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
