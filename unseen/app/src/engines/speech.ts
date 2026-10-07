// Speech output uses the server audio endpoint. Speech-to-text is Whisper-only.
import { api } from '../ai/api';

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let requestId = 0;

function release(audio: HTMLAudioElement, url: string) {
  audio.pause();
  audio.onended = null;
  audio.onerror = null;
  if (activeAudio === audio) activeAudio = null;
  if (activeUrl === url) {
    URL.revokeObjectURL(url);
    activeUrl = null;
  }
}

export function stopSpeaking() {
  requestId++;
  if (activeAudio && activeUrl) release(activeAudio, activeUrl);
}

export async function speak(text: string, onEnd?: () => void, onError?: () => void): Promise<boolean> {
  stopSpeaking();
  const id = ++requestId;
  let audio: HTMLAudioElement | null = null;
  let url: string | null = null;
  try {
    const blob = await api.speak(text);
    if (id !== requestId) return false;

    const audioUrl = URL.createObjectURL(blob);
    const player = new Audio(audioUrl);
    url = audioUrl;
    audio = player;
    activeAudio = player;
    activeUrl = audioUrl;
    player.onended = () => {
      release(player, audioUrl);
      onEnd?.();
    };
    player.onerror = () => {
      release(player, audioUrl);
      onError?.();
    };
    await player.play();
    return true;
  } catch {
    if (id === requestId) {
      if (audio && url) release(audio, url);
      onError?.();
    }
    return false;
  }
}
