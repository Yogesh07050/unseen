// Native shell integration (Capacitor / Android).
//
// Every function here is a safe no-op or a web fallback when the app runs as a
// PWA in the browser, so one codebase ships to both. Nothing in this module
// changes product behaviour: it maps interactions the app already has (the
// vibration on a strike, sharing, online/offline, back navigation) onto the
// Android platform's native equivalents.
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';

export const isNative: boolean = Capacitor.isNativePlatform();

/** The vibration on each Scripture strike (was navigator.vibrate). */
export async function strikeHaptic(): Promise<void> {
  if (isNative) { try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { /* no haptics */ } return; }
  if (navigator.vibrate) navigator.vibrate([25, 0, 15]);
}

/** A warmer pulse when the battle is won. */
export async function victoryHaptic(): Promise<void> {
  if (isNative) { try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* no haptics */ } return; }
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
}

/** Share text through the native sheet (or the Web Share API). Returns false if no sharing is available. */
export async function shareText(text: string, title?: string): Promise<boolean> {
  if (isNative) { await Share.share({ text, title, dialogTitle: title }); return true; }
  if (navigator.share) { await navigator.share({ text, title }); return true; }
  return false;
}

/** Match the system status bar to the current theme. */
export async function applyStatusBar(dark: boolean): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#0B1623' : '#FFFFFF' });
  } catch { /* status bar unavailable */ }
}

/** Hide the launch splash once the encrypted settings have loaded. */
export async function hideSplash(): Promise<void> {
  if (!isNative) return;
  try { await SplashScreen.hide({ fadeOutDuration: 300 }); } catch { /* already hidden */ }
}

/**
 * Wire the hardware back button and network status into the app. Returns a
 * cleanup function. On the web this is a no-op (the browser owns both).
 */
export function initNativeShell(handlers: { onBack: () => void; onOnline: (online: boolean) => void }): () => void {
  if (!isNative) return () => {};
  const handles = [
    CapApp.addListener('backButton', () => handlers.onBack()),
    Network.addListener('networkStatusChange', (s) => handlers.onOnline(s.connected)),
  ];
  void Network.getStatus().then((s) => handlers.onOnline(s.connected)).catch(() => {});
  return () => { handles.forEach((h) => { void h.then((x) => x.remove()).catch(() => {}); }); };
}

/** Leave the app without killing it (used when Back is pressed on the Home screen). */
export async function minimizeApp(): Promise<void> {
  if (!isNative) return;
  try { await CapApp.minimizeApp(); } catch { /* not supported */ }
}
