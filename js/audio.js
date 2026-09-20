// Procedural music + SFX via Web Audio API — no sample files, no licensing, works offline.
import { state } from './state.js';

// Per-key mood: [root Hz, scale intervals (semitones), tempo (beats/sec), waveform, filter Hz]
const BEDS = {
  intro:      { root: 220, scale: [0, 3, 5, 7, 10], bps: 1.2, wave: 'sine',     filter: 900 },
  hub:        { root: 196, scale: [0, 2, 4, 7, 9],  bps: 1,   wave: 'triangle', filter: 1100 },
  greed:      { root: 330, scale: [0, 2, 4, 7, 9],  bps: 3.2, wave: 'square',   filter: 1800 },
  anger:      { root: 110, scale: [0, 1, 6, 7],     bps: 4,   wave: 'sawtooth', filter: 700 },
  pride:      { root: 261, scale: [0, 4, 7, 11],    bps: 0.8, wave: 'sine',     filter: 1400 },
  attachment: { root: 174, scale: [0, 3, 5, 8],     bps: 1,   wave: 'triangle', filter: 800 },
  delusion:   { root: 200, scale: [0, 1, 6, 8],     bps: 1.5, wave: 'sine',     filter: 600 },
  jealousy:   { root: 233, scale: [0, 1, 7, 8],     bps: 2.2, wave: 'sawtooth', filter: 900 },
  ending:     { root: 261, scale: [0, 4, 7, 12],    bps: 0.9, wave: 'sine',     filter: 1600 },
};

class AudioDirector {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this._voices = [];
    this._lfo = null;
    this._currentKey = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return; // unsupported — everything below becomes a silent no-op
    this.ctx = new Ctx();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = state.settings.music;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = state.settings.sfx;
    this.sfxGain.connect(this.ctx.destination);
  }

  setVolumes({ music, sfx } = {}) {
    if (!this.ctx) return;
    if (music !== undefined && this.musicGain) this.musicGain.gain.value = music;
    if (sfx !== undefined && this.sfxGain) this.sfxGain.gain.value = sfx;
  }

  stopMusic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const v of this._voices) {
      try {
        v.gain.gain.setTargetAtTime(0, now, 0.15);
        v.osc.stop(now + 0.6);
      } catch (e) { /* already stopped */ }
    }
    if (this._lfo) { try { this._lfo.osc.stop(now + 0.6); } catch (e) { /* already stopped */ } }
    this._voices = [];
    this._lfo = null;
    this._currentKey = null;
  }

  playMusic(key) {
    if (!this.ctx || key === this._currentKey) return;
    this.stopMusic();
    this._currentKey = key;
    const bed = BEDS[key] || BEDS.hub;
    const now = this.ctx.currentTime;

    // A slow filter LFO gives each bed a breathing/pulsing quality instead of a static drone.
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = bed.filter;
    filter.connect(this.musicGain);

    const lfoOsc = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfoOsc.frequency.value = bed.bps * 0.5;
    lfoGain.gain.value = bed.filter * 0.35;
    lfoOsc.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfoOsc.start(now);
    this._lfo = { osc: lfoOsc };

    // Two or three detuned voices arpeggiating the mood's scale, each with its own slow tremolo.
    bed.scale.forEach((interval, i) => {
      const freq = bed.root * Math.pow(2, interval / 12);
      const osc = this.ctx.createOscillator();
      osc.type = bed.wave;
      osc.frequency.value = freq;
      osc.detune.value = (i % 2 === 0 ? -1 : 1) * 4;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(filter);

      const tremolo = this.ctx.createOscillator();
      const tremoloGain = this.ctx.createGain();
      tremolo.frequency.value = bed.bps / (i + 1.5);
      tremoloGain.gain.value = 0.06 / bed.scale.length;
      tremolo.connect(tremoloGain);
      tremoloGain.connect(gain.gain);
      tremolo.start(now + i * 0.05);

      const target = 0.12 / bed.scale.length;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(target, now + 1.2 + i * 0.2);
      osc.start(now + i * 0.05);

      this._voices.push({ osc, gain, tremolo });
    });
  }

  playSFX(name) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const specs = {
      hit:  { freq: 660, end: 880,  dur: 0.08, wave: 'square' },
      miss: { freq: 220, end: 140,  dur: 0.15, wave: 'sine' },
      win:  { freq: 440, end: 880,  dur: 0.35, wave: 'triangle' },
      lose: { freq: 300, end: 120,  dur: 0.4,  wave: 'sawtooth' },
    };
    const spec = specs[name] || specs.hit;

    const osc = this.ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.end), now + spec.dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + spec.dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + spec.dur + 0.05);
  }
}

export const audioDirector = new AudioDirector();
