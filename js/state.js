// Central game state. In-memory + sessionStorage only — never transmitted (PRD N1, TRD "wish stored client-side only").

const STORAGE_KEY = 'trishna-state-v1';

export const TRIALS = [
  { id: 'greed', name: 'Greed', demon: 'Lobhasura', hue: '--hue-greed', icon: 'assets/icons/greed.png' },
  { id: 'anger', name: 'Anger', demon: 'Krodhasura', hue: '--hue-anger', icon: 'assets/icons/anger.png' },
  { id: 'pride', name: 'Pride', demon: 'Abhimanasura', hue: '--hue-pride', icon: 'assets/icons/pride.png' },
  { id: 'attachment', name: 'Attachment', demon: 'Mamasura', hue: '--hue-attachment', icon: 'assets/icons/attachment.png' },
  { id: 'delusion', name: 'Delusion', demon: 'Mohasura', hue: '--hue-delusion', icon: 'assets/icons/delusion.png' },
  { id: 'jealousy', name: 'Jealousy', demon: 'Matsaryasura', hue: '--hue-jealousy', icon: 'assets/icons/jealousy.png' },
];

function freshResults() {
  const r = {};
  for (const t of TRIALS) r[t.id] = { beaten: false, attempts: 0, bestScore: 0, lastWon: null };
  return r;
}

class GameState {
  constructor() {
    this.wish = '';
    this.results = freshResults();
    this.introSeen = false;
    this.settings = { music: 0.6, sfx: 0.7, voice: 1, captions: true, quality: 'high' };
    this._load();
  }

  _load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      this.wish = saved.wish || '';
      this.introSeen = !!saved.introSeen;
      if (saved.results) Object.assign(this.results, saved.results);
      if (saved.settings) Object.assign(this.settings, saved.settings);
    } catch (e) { /* ignore corrupt storage */ }
  }

  _save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        wish: this.wish, results: this.results, introSeen: this.introSeen, settings: this.settings,
      }));
    } catch (e) { /* storage unavailable — game still works in-memory */ }
  }

  setSettings(partial) {
    Object.assign(this.settings, partial);
    this._save();
  }

  // Every trial cleared on the first try = affirming ending tone; any retries = encouraging.
  overallTone() {
    const totalAttempts = TRIALS.reduce((sum, t) => sum + this.results[t.id].attempts, 0);
    return totalAttempts === TRIALS.length ? 'affirming' : 'encouraging';
  }

  setWish(text) {
    this.wish = text.trim().slice(0, 140);
    this._save();
  }

  recordAttempt(trialId, won, score) {
    const r = this.results[trialId];
    r.attempts += 1;
    r.lastWon = won;
    if (won) {
      r.beaten = true;
      if (score > r.bestScore) r.bestScore = score;
    }
    this._save();
  }

  markIntroSeen() {
    this.introSeen = true;
    this._save();
  }

  allBeaten() {
    return TRIALS.every(t => this.results[t.id].beaten);
  }

  hardestTrial() {
    // Most attempts before (or without) a win = hardest. Ties broken by fewest wins.
    let worst = null;
    for (const t of TRIALS) {
      const r = this.results[t.id];
      if (!worst || r.attempts > this.results[worst].attempts) worst = t.id;
    }
    return worst;
  }

  easiestTrial() {
    let best = null;
    for (const t of TRIALS) {
      const r = this.results[t.id];
      if (r.beaten && (!best || r.attempts < this.results[best].attempts)) best = t.id;
    }
    return best || TRIALS[0].id;
  }

  reset() {
    this.wish = '';
    this.results = freshResults();
    this._save();
  }
}

export const state = new GameState();
