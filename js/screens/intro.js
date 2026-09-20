import { hero3d } from '../hero3d.js';
import { state } from '../state.js';
import { audioDirector } from '../audio.js';
import { voice } from '../voice.js';

const LINES = [
  "A devotee kneels at dusk, holding a wish they haven't said aloud yet.",
  "Diyas gutter in the pandal wind; somewhere a conch shell hums low across the courtyard.",
  "Somewhere close, something small watches from the shadows and slips by unseen.",
  "The wish sits heavy — not the words, but what's underneath them.",
  "Six shapes wait on the other side, wearing the faces of everything that's ever gotten between you and what you actually want.",
  "The air changes. A doorway opens where there wasn't one.",
];

const HERO_REVEAL_STEP = LINES.length - 1; // final beat — portal opens into the hero, then _finish() cuts to wish

export const introScreen = {
  el: null, lineEl: null, mushikaEl: null, portalEl: null, continueBtn: null, skipBtn: null,
  _step: 0,
  _advance: null,

  init() {
    this.el = document.getElementById('screen-intro');
    this.lineEl = document.getElementById('intro-line');
    this.mushikaEl = document.getElementById('mushika-cameo');
    this.portalEl = document.getElementById('portal');
    this.continueBtn = document.getElementById('btn-intro-continue');
    this.skipBtn = document.getElementById('btn-skip-intro');
  },

  enter(onDone) {
    this._done = onDone;

    // Replays should be fast and skippable — the intro never costs replay value (PRD N4).
    if (state.introSeen) {
      this.skipBtn.classList.add('hidden');
      this.continueBtn.textContent = 'Continue';
    } else {
      this.skipBtn.classList.remove('hidden');
      this.continueBtn.textContent = 'Tap to continue';
    }

    this._step = 0;
    this.lineEl.textContent = LINES[0];
    this.portalEl.classList.remove('opening');
    // restart the mushika cross-scene animation each time this screen is entered
    this.mushikaEl.style.animation = 'none';
    void this.mushikaEl.offsetWidth;
    this.mushikaEl.style.animation = '';

    hero3d.mount();
    hero3d.hide();

    audioDirector.unlock();
    audioDirector.playMusic('intro');
    voice.speak(LINES[0]);

    // Browsers only let an AudioContext actually start once a real user gesture fires it —
    // creating it in enter() isn't enough, resume() has to happen inside a click handler.
    this._onContinue = () => { audioDirector.unlock(); this._advanceStep(); };
    this._onSkip = () => { audioDirector.unlock(); this._finish(); };
    this.continueBtn.addEventListener('click', this._onContinue);
    this.skipBtn.addEventListener('click', this._onSkip);
  },

  _advanceStep() {
    this._step += 1;
    if (this._step < LINES.length) {
      this.lineEl.textContent = LINES[this._step];
      voice.speak(LINES[this._step]);
      if (this._step === HERO_REVEAL_STEP) {
        this.portalEl.classList.add('opening');
        hero3d.revealCinematic();
      }
      return;
    }
    this._finish();
  },

  _finish() {
    state.markIntroSeen();
    this.exit(); // cleans up both listeners in one place
    this._done();
  },

  exit() {
    this.portalEl.classList.remove('opening');
    // Clean up listeners regardless of whether _finish() ran, so replays
    // never accumulate duplicate click handlers on these buttons.
    if (this._onContinue) this.continueBtn.removeEventListener('click', this._onContinue);
    if (this._onSkip) this.skipBtn.removeEventListener('click', this._onSkip);
    this._onContinue = null;
    this._onSkip = null;
  },
};
