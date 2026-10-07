// Voice capability / permission / server-readiness probes for the Cry Out indicator.
import { voiceCaptureSupported } from './audio';
import { apiUrl } from '../ai/base';

export type VoiceStatus =
  | 'checking' | 'ready' | 'needs_permission' | 'denied' | 'unsupported'
  | 'server_off' | 'recording' | 'transcribing' | 'no_speech' | 'error';

export const VOICE_REASON: Record<VoiceStatus, string> = {
  checking: 'Checking voice…',
  ready: 'Voice ready',
  needs_permission: 'Allow the microphone to use voice',
  denied: 'Microphone blocked — using typing',
  unsupported: 'Voice not supported on this browser — using typing',
  server_off: 'Voice service is off — using typing',
  recording: 'Listening',
  transcribing: 'Hearing you…',
  no_speech: "Didn't catch that — try again or type",
  error: "Voice didn't work — using typing",
};

export function voiceCapability(): 'available' | 'unsupported' {
  return voiceCaptureSupported() ? 'available' : 'unsupported';
}

export async function micPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    const p = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return (p?.state as 'granted' | 'denied' | 'prompt') ?? 'unknown';
  } catch {
    return 'unknown'; // Safari and others don't support the microphone permission query
  }
}

let serverReady: boolean | null = null;
export async function voiceServerReady(): Promise<boolean> {
  if (serverReady !== null) return serverReady;
  try {
    const res = await fetch(apiUrl('/api/health'));
    const j = await res.json();
    serverReady = !!j.openai;
  } catch {
    serverReady = false;
  }
  return serverReady;
}

// Resolve the initial status before the user starts speaking.
export async function probeVoice(): Promise<VoiceStatus> {
  if (voiceCapability() === 'unsupported') return 'unsupported';
  if (!(await voiceServerReady())) return 'server_off';
  const perm = await micPermission();
  if (perm === 'denied') return 'denied';
  if (perm === 'granted') return 'ready';
  return 'needs_permission'; // 'prompt' or 'unknown' — getUserMedia will ask
}
