import { state, TRIALS } from '../state.js';
import { hero3d } from '../hero3d.js';

export const hubScreen = {
  el: null, stationsEl: null, endingBtn: null,

  init() {
    this.el = document.getElementById('screen-hub');
    this.stationsEl = document.getElementById('hub-stations');
    this.endingBtn = document.getElementById('btn-hub-ending');
  },

  enter({ onSelectTrial, onEnding }) {
    hero3d.mount();
    hero3d.show();
    hero3d.setMood(0);

    this._render(onSelectTrial);

    this.endingBtn.classList.toggle('hidden', !state.allBeaten());
    this._onEnding = () => onEnding();
    this.endingBtn.addEventListener('click', this._onEnding);
  },

  _render(onSelectTrial) {
    this.stationsEl.innerHTML = '';
    for (const t of TRIALS) {
      const r = state.results[t.id];
      const btn = document.createElement('button');
      btn.className = 'station' + (r.beaten ? ' beaten' : '');
      // Do NOT set borderColor inline — .station.beaten overrides to --gold via CSS;
      // inline style would win specificity and prevent the gold border from showing.
      btn.innerHTML = `<img class="icon" src="${t.icon}" alt="${t.demon}">${t.demon}<span class="status">${r.beaten ? 'Beaten' : 'Not yet'}</span>`;
      btn.addEventListener('click', () => onSelectTrial(t.id));
      this.stationsEl.appendChild(btn);
    }
  },

  refresh() {
    this.endingBtn.classList.toggle('hidden', !state.allBeaten());
    const buttons = this.stationsEl.querySelectorAll('.station');
    TRIALS.forEach((t, i) => {
      const r = state.results[t.id];
      const btn = buttons[i];
      if (!btn) return;
      btn.classList.toggle('beaten', r.beaten);
      // Clear any residual inline borderColor so the CSS class takes effect.
      btn.style.borderColor = '';
      btn.querySelector('.status').textContent = r.beaten ? 'Beaten' : 'Not yet';
    });
  },

  exit() {
    this.endingBtn.removeEventListener('click', this._onEnding);
  },
};
