import { state } from '../state.js';
import { hero3d } from '../hero3d.js';

export const wishScreen = {
  el: null, textEl: null, beginBtn: null,

  init() {
    this.el = document.getElementById('screen-wish');
    this.textEl = document.getElementById('wish-text');
    this.beginBtn = document.getElementById('btn-wish-begin');
  },

  enter(onDone) {
    this._done = onDone;
    this.textEl.value = state.wish || '';
    hero3d.hide();

    this._onBegin = () => {
      const val = this.textEl.value.trim();
      state.setWish(val || 'to find some peace');
      this._done();
    };
    this.beginBtn.addEventListener('click', this._onBegin);

    setTimeout(() => this.textEl.focus(), 300);
  },

  exit() {
    this.beginBtn.removeEventListener('click', this._onBegin);
  },
};
