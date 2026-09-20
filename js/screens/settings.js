import { state } from '../state.js';
import { audioDirector } from '../audio.js';
import { setLowQuality } from '../engine2d.js';

export const settingsPanel = {
  el: null,

  init() {
    this.el = document.getElementById('settings-panel');
    this.musicEl = document.getElementById('setting-music');
    this.sfxEl = document.getElementById('setting-sfx');
    this.voiceEl = document.getElementById('setting-voice');
    this.captionsEl = document.getElementById('setting-captions');
    this.qualityEl = document.getElementById('setting-quality');
    this.closeBtn = document.getElementById('btn-settings-close');

    this.musicEl.value = state.settings.music;
    this.sfxEl.value = state.settings.sfx;
    this.voiceEl.value = state.settings.voice;
    this.captionsEl.checked = state.settings.captions;
    this.qualityEl.checked = state.settings.quality === 'low';
    setLowQuality(state.settings.quality === 'low');

    this.musicEl.addEventListener('input', () => {
      state.setSettings({ music: Number(this.musicEl.value) });
      audioDirector.setVolumes({ music: state.settings.music });
    });
    this.sfxEl.addEventListener('input', () => {
      state.setSettings({ sfx: Number(this.sfxEl.value) });
      audioDirector.setVolumes({ sfx: state.settings.sfx });
    });
    this.voiceEl.addEventListener('input', () => {
      state.setSettings({ voice: Number(this.voiceEl.value) });
    });
    this.captionsEl.addEventListener('change', () => {
      state.setSettings({ captions: this.captionsEl.checked });
    });
    this.qualityEl.addEventListener('change', () => {
      const quality = this.qualityEl.checked ? 'low' : 'high';
      state.setSettings({ quality });
      setLowQuality(quality === 'low');
    });
    this.closeBtn.addEventListener('click', () => this.close());
  },

  open() { this.el.classList.remove('hidden'); },
  close() { this.el.classList.add('hidden'); },
};
