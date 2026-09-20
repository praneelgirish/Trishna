import { state, TRIALS } from '../state.js';
import { hero3d } from '../hero3d.js';
import { audioDirector } from '../audio.js';
import { voice } from '../voice.js';

function trialName(id) {
  const t = TRIALS.find(t => t.id === id);
  return t ? t.name.toLowerCase() : 'the trials';
}

function buildBlessing() {
  const hardest = trialName(state.hardestTrial());
  const easiest = trialName(state.easiestTrial());
  const wish = state.wish || 'what you came here for';
  const tone = state.overallTone();

  if (tone === 'affirming') {
    return `Ganesha exhales, unhurried. Every trial let go on the first ask — that's rare, and he says so without making it a boast. ` +
      `You asked for "${wish}." ${hardest} tested you longest, and ${easiest} barely tried at all. ` +
      `Trishna, they call this — what you actually wanted, not always what you asked for. Tonight, you found more of it than most do. ` +
      `The doorway behind you softens back into ordinary air. Go on — carry it back with you.`;
  }
  return `Ganesha's smile doesn't ask you to pretend it was easy. You asked for "${wish}." ` +
    `${hardest} made you come back more than once — that's not failure, that's just where the knot was tightest. ` +
    `${easiest} came loose the moment you stopped gripping it. ` +
    `Trishna, they call this — what you actually wanted, not always what you asked for. You didn't get all of it tonight; nobody does in one sitting. ` +
    `The doorway waits, patient, for whenever you're ready to look again. Go on — carry what you found back with you.`;
}

export const endingScreen = {
  el: null, blessingEl: null, portalEl: null, replayBtn: null, mushikaEl: null,

  init() {
    this.el = document.getElementById('screen-ending');
    this.blessingEl = document.getElementById('ending-blessing');
    this.portalEl = document.getElementById('portal-out');
    this.replayBtn = document.getElementById('btn-ending-replay');
    this.mushikaEl = document.getElementById('mushika-ending');
  },

  enter(onReplay) {
    hero3d.mount();
    hero3d.revealCinematic();
    hero3d.setMood(0);

    const tone = state.overallTone();
    const blessing = buildBlessing();
    this.blessingEl.textContent = blessing;

    this.portalEl.classList.remove('opening');
    void this.portalEl.offsetWidth;
    this.portalEl.classList.add('opening');

    if (this.mushikaEl) {
      this.mushikaEl.classList.remove('affirming', 'encouraging');
      this.mushikaEl.classList.add(tone);
    }

    audioDirector.playMusic('ending');
    voice.speak(blessing);

    this._onReplay = () => onReplay();
    this.replayBtn.addEventListener('click', this._onReplay);
  },

  exit() {
    this.portalEl.classList.remove('opening');
    this.replayBtn.removeEventListener('click', this._onReplay);
  },
};
