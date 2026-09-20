import { state, TRIALS } from './state.js';
import { Engine2D } from './engine2d.js';
import { hero3d } from './hero3d.js';
import { audioDirector } from './audio.js';
import { voice } from './voice.js';
import { introScreen } from './screens/intro.js';
import { wishScreen } from './screens/wish.js';
import { hubScreen } from './screens/hub.js';
import { endingScreen } from './screens/ending.js';
import { settingsPanel } from './screens/settings.js';

import { greedTrial } from './trials/greed.js';
import { angerTrial } from './trials/anger.js';
import { prideTrial } from './trials/pride.js';
import { attachmentTrial } from './trials/attachment.js';
import { delusionTrial } from './trials/delusion.js';
import { jealousyTrial } from './trials/jealousy.js';

// Short Ganesha lines spoken/captioned after each trial completes, before the wipe back to hub (PRD N6).
const TRIAL_POST_LINES = {
  greed:      'Restraint is the real offering — not the count.',
  anger:      'Silence at the right moment carries its own kind of strength.',
  pride:      'Balance is something you keep choosing. It is never something you own.',
  attachment: 'Carrying what matters, and leaving the rest — that itself is a kind of wisdom.',
  delusion:   'The steady flame was always there. You just had to look past the dazzle.',
  jealousy:   'Your own ring is the only one worth finishing.',
};

const TRIAL_MODULES = {
  greed: greedTrial, anger: angerTrial, pride: prideTrial,
  attachment: attachmentTrial, delusion: delusionTrial, jealousy: jealousyTrial,
};

// Each trial gets its own base backdrop behind the canvas, so the translucent in-game overlays
// have a matching floor to sit on instead of the generic dusk gradient bleeding through underneath.
const TRIAL_BG = {
  greed: 'radial-gradient(circle at 50% 20%, #3a2c10 0%, #241a0a 60%, #150f06 100%)',
  anger: 'radial-gradient(circle at 50% 30%, #4a180c 0%, #2a0d08 55%, #160604 100%)',
  pride: 'radial-gradient(circle at 50% 15%, #341a44 0%, #1f0e2c 55%, #12081a 100%)',
  attachment: 'radial-gradient(circle at 50% 70%, #2a2410 0%, #1a1408 55%, #100c05 100%)',
  delusion: 'radial-gradient(circle at 50% 40%, #2c1e3a 0%, #1a1024 55%, #0f0a16 100%)',
  jealousy: 'radial-gradient(circle at 50% 30%, #1a3024 0%, #101c16 55%, #090f0c 100%)',
};

const LOSS_COPY = {
  greed: 'The bowl overflowed — it stopped being an offering and became excess.',
  anger: 'The words came out before you could stop them.',
  pride: 'It toppled — too stiff to bend, so it broke instead.',
  attachment: 'You never made it to the door. Still deciding when the room gave out.',
  delusion: 'The dazzle won — the true lamp was there all along.',
  jealousy: 'You kept glancing at the spotlight instead of your own ring.',
};

const WIN_COPY = {
  greed: 'Just enough, and no more — a real offering.',
  anger: 'You bit your tongue when it counted. The argument ran out of fuel.',
  pride: 'Balanced, all the way through — nothing left to defend.',
  attachment: 'You chose what mattered, and you walked out. That was enough.',
  delusion: 'You saw past the dazzle to the steady flame.',
  jealousy: 'Every eye that tried to pull you away — you stayed on your own ring anyway.',
};

class Shell {
  constructor() {
    this.screenEls = {
      intro: document.getElementById('screen-intro'),
      wish: document.getElementById('screen-wish'),
      hub: document.getElementById('screen-hub'),
      trial: document.getElementById('screen-trial'),
      ending: document.getElementById('screen-ending'),
    };
    this.canvas = document.getElementById('trial-canvas');
    this.engine = new Engine2D(this.canvas);
    this.engine.attachInput();
    this._hubEntered = false; // guard: only call hubScreen.exit() after at least one enter()

    this.current = null;
    this.activeTrialId = null;

    introScreen.init();
    wishScreen.init();
    hubScreen.init();
    endingScreen.init();
    settingsPanel.init();

    this.wipeEl = document.getElementById('screen-wipe');

    document.getElementById('btn-settings-hub').addEventListener('click', () => settingsPanel.open());
    document.getElementById('btn-settings-ending').addEventListener('click', () => settingsPanel.open());

    // Safety net: any first pointer interaction unlocks audio, in case the player lands
    // mid-flow (e.g. a reload with introSeen already true) instead of via the intro buttons.
    document.addEventListener('pointerdown', () => audioDirector.unlock(), { once: true, capture: true });

    this._bindTrialChrome();
  }

  _showScreen(name) {
    // Cancel any in-flight speech synthesis so a line from the previous screen
    // never bleeds into the new one.
    voice.cancel();
    for (const key of Object.keys(this.screenEls)) {
      this.screenEls[key].classList.toggle('hidden', key !== name);
    }
    this.canvas.style.display = name === 'trial' ? 'block' : 'none';
    if (name === 'trial') this.engine.resize();
  }

  start() {
    this.goIntro();
  }

  goIntro() {
    this._showScreen('intro');
    introScreen.enter(() => this.goWish());
  }

  goWish() {
    introScreen.exit();
    this._showScreen('wish');
    wishScreen.enter(() => this.goHub());
  }

  goHub() {
    wishScreen.exit();
    // Only call exit() after enter() has been called at least once, to avoid
    // removing an undefined event listener on the very first hub visit.
    if (this._hubEntered) hubScreen.exit();
    this._showScreen('hub');
    hubScreen.enter({
      onSelectTrial: (id) => this.goTrial(id),
      onEnding: () => this.goEnding(),
    });
    this._hubEntered = true;
    audioDirector.playMusic('hub');
  }

  goTrial(id) {
    hubScreen.exit();
    this.activeTrialId = id;
    this._showScreen('trial');
    hero3d.hide();
    this._setupTrialChrome(id);
    audioDirector.playMusic(id);
  }

  goEnding() {
    hubScreen.exit();
    this._showScreen('ending');
    endingScreen.enter(() => this.replay());
  }

  replay() {
    endingScreen.exit();
    state.reset();
    this.goIntro();
  }

  _bindTrialChrome() {
    this.startOverlay = document.getElementById('trial-start-overlay');
    this.endOverlay = document.getElementById('trial-end-overlay');
    this.overlayTitle = document.getElementById('trial-overlay-title');
    this.overlayHowto = document.getElementById('trial-overlay-howto');
    this.endTitle = document.getElementById('trial-end-title');
    this.endCopy = document.getElementById('trial-end-copy');
    this.nameEl = document.getElementById('trial-name');
    this.scoreEl = document.getElementById('trial-score');
    this.meterFill = document.getElementById('trial-meter-fill');
    this.howtoBlock = document.getElementById('trial-howto-block');
    this.itemsForm = document.getElementById('attachment-items-form');
    this.itemsGrid = document.getElementById('attachment-items-grid');
    this.itemsNextBtn = document.getElementById('btn-trial-items-next');
    this.startBtn = document.getElementById('btn-trial-start');
    if (this.itemsGrid && !this.itemsGrid.children.length) {
      const placeholders = ['a photo', 'an old book', 'your journal', 'a childhood toy', 'a letter', 'a music box', 'a keepsake', 'one more thing'];
      for (let i = 0; i < 8; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 24;
        input.placeholder = placeholders[i];
        input.id = `attachment-item-${i}`;
        this.itemsGrid.appendChild(input);
      }
    }

    document.getElementById('btn-trial-quit').addEventListener('click', () => this._quitTrial());
    document.getElementById('btn-trial-start').addEventListener('click', () => this._runTrial());
    document.getElementById('btn-trial-retry').addEventListener('click', () => this._runTrial());
    document.getElementById('btn-trial-hub').addEventListener('click', () => this._quitTrial());
    this.itemsNextBtn.addEventListener('click', () => this._advanceAttachmentStep());
  }

  _setupTrialChrome(id) {
    const meta = TRIALS.find(t => t.id === id);
    const mod = TRIAL_MODULES[id];
    this.nameEl.textContent = meta.name;
    this.overlayTitle.textContent = meta.name;
    this.overlayHowto.textContent = mod.howTo;
    this.scoreEl.textContent = '';
    this.meterFill.style.width = '0%';
    this.meterFill.style.background = `var(${meta.hue})`;
    this.canvas.style.background = TRIAL_BG[id] || '';

    if (id === 'attachment') {
      // step 1: only "what can't you leave behind" — no rules, no mechanics yet
      this.howtoBlock.classList.add('hidden');
      this.itemsForm.classList.remove('hidden');
      this.itemsNextBtn.classList.remove('hidden');
      this.startBtn.classList.add('hidden');
    } else {
      this.howtoBlock.classList.remove('hidden');
      this.itemsForm.classList.add('hidden');
      this.itemsNextBtn.classList.add('hidden');
      this.startBtn.classList.remove('hidden');
    }

    this.startOverlay.classList.remove('hidden');
    this.endOverlay.classList.add('hidden');
  }

  _advanceAttachmentStep() {
    // step 2: now show how the trial plays — still without the "carry at most 3" specifics,
    // which the trial itself reveals once play begins
    this.itemsForm.classList.add('hidden');
    this.itemsNextBtn.classList.add('hidden');
    this.howtoBlock.classList.remove('hidden');
    this.startBtn.classList.remove('hidden');
  }

  _runTrial() {
    const id = this.activeTrialId;
    const mod = TRIAL_MODULES[id];

    if (id === 'attachment' && mod.setPersonalItems) {
      const labels = Array.from(this.itemsGrid.querySelectorAll('input'))
        .map(inp => inp.value.trim())
        .filter(Boolean);
      mod.setPersonalItems(labels);
    }

    // Reset HUD score + meter so stale values from the previous attempt are never
    // visible for a frame at the start of a retry.
    this.scoreEl.textContent = '';
    this.meterFill.style.width = '0%';

    this.startOverlay.classList.add('hidden');
    this.endOverlay.classList.add('hidden');

    mod.start(this.engine, (result) => this._onTrialEnd(id, mod, result));
  }

  _onTrialEnd(id, mod, result) {
    this.engine.stop();
    state.recordAttempt(id, result.won, result.score);
    const line = result.won ? WIN_COPY[id] : LOSS_COPY[id];
    this.endTitle.textContent = result.won ? 'Trial passed' : 'Not yet';
    this.endCopy.textContent = line;
    this.endOverlay.classList.remove('hidden');
    audioDirector.playSFX(result.won ? 'win' : 'lose');
    voice.caption(line);
    voice.speak(line);
  }

  _quitTrial() {
    const id = this.activeTrialId;
    const mod = TRIAL_MODULES[id];
    // mod.stop() already calls engine.stop() internally — avoid the double call.
    if (mod.stop) mod.stop(this.engine);
    else this.engine.stop();
    this._wipeTo(id, () => {
      this.goHub();
      hubScreen.refresh();
    });
  }

  // Themed wipe using the trial's own hue — reuses TRIAL_BG's accent colors already in this file.
  // Also speaks a short Ganesha post-trial line (PRD N6) timed to land just as the wipe fades.
  _wipeTo(id, onMid) {
    const meta = TRIALS.find(t => t.id === id);
    if (this.wipeEl && meta) {
      this.wipeEl.style.background = `var(${meta.hue})`;
      this.wipeEl.classList.add('active');
      // Speak the per-trial line slightly after the wipe peaks so it doesn't
      // compete with the win/lose result line that was just spoken.
      const postLine = TRIAL_POST_LINES[id];
      if (postLine) {
        setTimeout(() => { voice.speak(postLine); voice.caption(postLine); }, 300);
      }
      setTimeout(() => {
        onMid();
        setTimeout(() => this.wipeEl.classList.remove('active'), 400);
      }, 220);
    } else {
      onMid();
    }
  }
}

export function bootShell() {
  const shell = new Shell();
  shell.start();
  return shell;
}
