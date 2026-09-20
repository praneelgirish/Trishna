// Thin wrapper over browser-native SpeechSynthesis (PRD N4/N5/N6) — no external TTS API.
import { state } from './state.js';

let captionEl = null;
let captionTimer = null;

export const voice = {
  speak(text, { onend } = {}) {
    const synth = window.speechSynthesis;
    if (!synth || state.settings.voice <= 0) {
      if (onend) onend();
      return;
    }
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.volume = state.settings.voice;
    utt.rate = 0.95;
    if (onend) utt.onend = onend;
    synth.speak(utt);
  },

  cancel() {
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
  },

  caption(text) {
    if (!state.settings.captions) return;
    if (!captionEl) captionEl = document.getElementById('caption-bar');
    if (!captionEl) return;
    captionEl.textContent = text;
    captionEl.classList.remove('hidden');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => captionEl.classList.add('hidden'), 3200);
  },
};
