import type { WatchWindow } from '../types';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function pad(n: number) { return String(n).padStart(2, '0'); }

// Floating local-time weekly events with a 20-minute alarm; names no struggle (§10).
export function buildIcs(windows: WatchWindow[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UNSEEN//Watch//EN'];
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  for (const w of windows) {
    const dur = Math.max(1, w.endHour - w.startHour);
    lines.push(
      'BEGIN:VEVENT',
      `UID:watch-${BYDAY[w.weekday].toLowerCase()}-${w.startHour}@unseen`,
      `DTSTAMP:${stamp}`,
      `DTSTART:20260101T${pad(w.startHour)}0000`,
      `DURATION:PT${dur}H`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[w.weekday]}`,
      'SUMMARY:Watch and pray',
      'DESCRIPTION:Open UNSEEN to arm up.',
      'BEGIN:VALARM', 'TRIGGER:-PT20M', 'ACTION:DISPLAY', 'DESCRIPTION:Watch and pray', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(windows: WatchWindow[]) {
  const blob = new Blob([buildIcs(windows)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unseen-watch.ics';
  a.click();
  URL.revokeObjectURL(url);
}
