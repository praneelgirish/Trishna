// T5 — Delusion (Mohasura). Among a spread of flickering lamps, only one burns steady and true.
// The rest are decoys — flashier, more erratic, easier to notice, and wrong. Tap the true one.
// Arrow keys move selection toward the nearest lamp in that direction, Space/Enter confirms.
// From round 3 a decoy occasionally borrows the true lamp's steady flicker for a moment — even
// the truth can be imitated briefly. The screen-wide breathing effect stays on the background
// only, so the lamps themselves never visually drift out from under your cursor.

import { clamp, reducedMotion } from '../engine2d.js';

const TOTAL_ROUNDS = 5;
const LIVES = 3;
const DECOY_FLICKER_BASE = 0.22; // tightened from 0.35 — the tell should take real attention
// cosmetic-only base rim colors, assigned independent of which lamp is real — kept noticeably
// lighter/warmer than the trial's dark backdrop so the lamps read as distinct objects, not a
// blur of near-matching tones
const BASE_ACCENTS = ['#6b3a54', '#5a3f6e', '#6e3448', '#4a3a68', '#5c4238'];
// intrusive half-thoughts drifting in the background — atmosphere only, never interactive,
// so they add a delusional "noise in your head" feel without touching the actual puzzle
const WHISPER_WORDS = ['is this real', 'trust it', 'no...', 'that one', 'wait', 'sure?', 'look again'];

export const delusionTrial = {
  id: 'delusion', name: 'Delusion', hue: '--hue-delusion',
  howTo: 'One lamp burns calm and steady — the rest flicker and dazzle. The longer you hesitate, the more convincing the fakes become, and from round 3 a decoy may briefly borrow the true flicker. Tap the true one. (Arrow keys + Space also work.)',

  start(engine, onEnd) {
    let round = 0;
    let lives = LIVES;
    let ended = false;
    let lamps = [];
    let roundTime = 0;
    let roundLimit = 5;
    let selected = 0;
    let resolved = false;
    let resultFlash = 0;
    let confirmFlash = 0; // ambiguous flash on ANY pick, before the outcome is known
    let mimicIndex = -1;   // a decoy that briefly borrows the true flicker this round
    let mimicStart = 0, mimicEnd = 0;

    function finish(won, reason) {
      if (ended) return;
      ended = true;
      onEnd({ won, score: round, reason });
    }

    function layoutRound() {
      const decoys = 2 + round;
      const n = decoys + 1;
      const realIndex = Math.floor(Math.random() * n);
      lamps = [];
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const marginX = engine.width * 0.15, marginY = engine.height * 0.22;
      const cellW = (engine.width - marginX * 2) / cols;
      const cellH = (engine.height * 0.55 - marginY) / rows;
      for (let i = 0; i < n; i++) {
        const cx = marginX + cellW * (i % cols) + cellW / 2 + (Math.random() - 0.5) * 10;
        const cy = engine.height * 0.28 + cellH * Math.floor(i / cols) + cellH / 2 + (Math.random() - 0.5) * 10;
        const seed = Math.random() * 100;
        // cosmetic-only base accent, independent of which lamp is real — variety without a tell
        const accent = BASE_ACCENTS[Math.floor(seed) % BASE_ACCENTS.length];
        lamps.push({ x: cx, y: cy, real: i === realIndex, seed, accent });
      }
      selected = 0;
      roundTime = 0;
      roundLimit = Math.max(2.6, 5 - round * 0.35);
      resolved = false;

      // from round 3 (index >= 2), one decoy briefly mimics the true lamp's steady flicker
      if (round >= 2) {
        const decoyIndices = lamps.map((l, i) => i).filter(i => !lamps[i].real);
        mimicIndex = decoyIndices[Math.floor(Math.random() * decoyIndices.length)];
        mimicStart = roundLimit * (0.3 + Math.random() * 0.35);
        mimicEnd = mimicStart + 0.6;
      } else {
        mimicIndex = -1;
      }
    }

    function pick(index) {
      if (resolved || ended) return;
      const lamp = lamps[index];
      if (!lamp) return;
      resolved = true;
      confirmFlash = 1; // the moment of choosing always feels uncertain, win or lose
      if (lamp.real) {
        resultFlash = 1;
        engine.burst(lamp.x, lamp.y, '#9a7bc4', 16);
        round += 1;
        setTimeout(() => {
          if (ended) return;
          if (round >= TOTAL_ROUNDS) finish(true, 'clear');
          else { layoutRound(); }
        }, 450);
      } else {
        lives -= 1;
        engine.shake(8);
        setTimeout(() => {
          if (ended) return;
          if (lives <= 0) finish(false, 'fooled');
          else layoutRound();
        }, 450);
      }
    }

    function nearestInDirection(dx, dy) {
      const cur = lamps[selected];
      if (!cur) return selected;
      let best = selected, bestScore = Infinity;
      lamps.forEach((l, i) => {
        if (i === selected) return;
        const ldx = l.x - cur.x, ldy = l.y - cur.y;
        const along = ldx * dx + ldy * dy; // how far in the requested direction
        if (along <= 0) return; // wrong way, skip
        const across = Math.abs(ldx * dy - ldy * dx); // perpendicular drift
        const score = along + across * 1.5;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      return best;
    }

    layoutRound();

    engine.start((dt) => {
      if (ended) return;
      roundTime += dt;
      resultFlash = Math.max(0, resultFlash - dt * 2);
      confirmFlash = Math.max(0, confirmFlash - dt * 3.5);

      if (!resolved) {
        if (engine.pointer.justDown) {
          const { x, y } = engine.pointer;
          let hitIndex = -1;
          let hitDist = Infinity;
          lamps.forEach((l, i) => {
            const d = Math.hypot(l.x - x, l.y - y);
            if (d < 34 && d < hitDist) { hitIndex = i; hitDist = d; }
          });
          if (hitIndex >= 0) pick(hitIndex);
        }
        if (engine.keyJustPressed('ArrowRight')) selected = nearestInDirection(1, 0);
        if (engine.keyJustPressed('ArrowLeft')) selected = nearestInDirection(-1, 0);
        if (engine.keyJustPressed('ArrowDown')) selected = nearestInDirection(0, 1);
        if (engine.keyJustPressed('ArrowUp')) selected = nearestInDirection(0, -1);
        if (engine.keyJustPressed('Space') || engine.keyJustPressed('Enter')) pick(selected);

        if (roundTime >= roundLimit) {
          resolved = true;
          lives -= 1;
          engine.shake(6);
          setTimeout(() => {
            if (ended) return;
            if (lives <= 0) finish(false, 'time');
            else layoutRound();
          }, 350);
        }
      }

      const mimicActive = mimicIndex >= 0 && roundTime >= mimicStart && roundTime <= mimicEnd;

      draw(engine, {
        lamps, selected, round, lives, resultFlash, confirmFlash,
        mimicIndex, mimicActive,
        dwell: clamp(roundTime / roundLimit, 0, 1),
        remain: clamp(1 - roundTime / roundLimit, 0, 1),
      });
    });
  },

  stop(engine) { engine.stop(); },
};

function draw(engine, s) {
  const ctx = engine.ctx;
  const w = engine.width, h = engine.height;
  const now = performance.now() / 1000;

  // screen-wide breathing/warp: a slow zoom pulse on the ambient background only — the lamp
  // group is drawn afterward, outside this transform, so lamps never visually drift and stay
  // exactly where the player's cursor expects them.
  const breathAmp = (reducedMotion ? 0.006 : 0.02);
  const breath = 1 + Math.sin(now * 0.7) * breathAmp;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(breath, breath);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = `rgba(154,123,196,${0.04 + s.resultFlash * 0.1})`;
  ctx.fillRect(0, 0, w, h);
  // slow eerie hue drift — a color tide that never quite settles, sold on the background only
  const hueDrift = Math.sin(now * 0.25) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(${Math.round(140 + hueDrift * 60)},${Math.round(60 + (1 - hueDrift) * 40)},${Math.round(160 - hueDrift * 40)},0.045)`;
  ctx.fillRect(0, 0, w, h);
  ctx.restore(); // end breathing transform — lamps below are drawn unwarped

  // intrusive whisper fragments drifting through the background — decorative only, no hitbox,
  // no bearing on which lamp is real; kept in a strip above the lamp grid and given real
  // contrast (a dark drop-shadow) so they're legible instead of merging into the backdrop
  for (let i = 0; i < 4; i++) {
    const seed = i * 37.7;
    const wx = w * 0.12 + w * 0.76 * ((Math.sin(now * 0.13 + seed) + 1) / 2);
    const wy = h * 0.045 + h * 0.035 * i;
    const alpha = 0.22 + Math.max(0, Math.sin(now * 0.4 + seed)) * 0.22;
    const word = WHISPER_WORDS[(i + Math.floor(now * 0.1)) % WHISPER_WORDS.length];
    ctx.font = '11px Mulish, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(10,4,14,${alpha * 0.8})`;
    ctx.fillText(word, wx + 1, wy + 1);
    ctx.fillStyle = `rgba(255,246,236,${alpha})`;
    ctx.fillText(word, wx, wy);
  }

  // dwell-time truth-shift: the longer you hesitate, the steadier (more convincing) the decoys get
  const decoySteady = 1 - s.dwell * 0.75;

  s.lamps.forEach((l, i) => {
    const isMimicking = s.mimicActive && i === s.mimicIndex;
    const flicker = (l.real || isMimicking)
      ? Math.sin(now * 2 + l.seed) * 0.06
      : Math.sin(now * (6 + l.seed % 4) + l.seed) * DECOY_FLICKER_BASE * decoySteady;
    const r = 16 + flicker * 10;
    ctx.save();
    ctx.translate(l.x, l.y);
    // faint chromatic ghosting — a doubled, color-split afterimage of the flame that never
    // moves the real hitbox, just makes the eye feel unreliable while looking at it
    const ghostOff = 1.4 + Math.sin(now * 3 + l.seed) * 0.6;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(226,84,42,0.5)';
    ctx.beginPath(); ctx.ellipse(-ghostOff, -r * 0.3, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(63,182,168,0.5)';
    ctx.beginPath(); ctx.ellipse(ghostOff, -r * 0.3, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // a soft warm floor-glow behind the base — separates every lamp from the dark backdrop
    // regardless of its cosmetic accent, so nothing visually merges into the background
    const floorGlow = ctx.createRadialGradient(0, 16, 2, 0, 16, 30);
    floorGlow.addColorStop(0, 'rgba(255,207,77,0.16)');
    floorGlow.addColorStop(1, 'rgba(255,207,77,0)');
    ctx.fillStyle = floorGlow;
    ctx.beginPath(); ctx.arc(0, 16, 30, 0, Math.PI * 2); ctx.fill();
    // base — cosmetic accent varies per lamp, independent of which one is real
    ctx.fillStyle = l.accent;
    ctx.beginPath(); ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,236,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
    // flame
    const looksTrue = l.real || isMimicking;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, looksTrue ? '#fff6ec' : '#fff2c8');
    grad.addColorStop(1, looksTrue ? 'rgba(255,207,77,0)' : 'rgba(226,84,42,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.3, r * 0.7, r, 0, 0, Math.PI * 2);
    ctx.fill();
    if (i === s.selected) {
      ctx.strokeStyle = '#ffcf4d';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  });

  ctx.font = '13px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.8)';
  ctx.textAlign = 'center';
  ctx.fillText(`round ${s.round + 1}/${TOTAL_ROUNDS} · lives ${s.lives}`, w / 2, h - 40);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(16, h - 20, w - 32, 4);
  ctx.fillStyle = '#9a7bc4';
  ctx.fillRect(16, h - 20, (w - 32) * s.remain, 4);

  // false-confirmation flash: fires on ANY pick, correct or not, before the outcome reads clearly
  if (s.confirmFlash > 0) {
    ctx.fillStyle = `rgba(255,246,236,${s.confirmFlash * 0.22})`;
    ctx.fillRect(0, 0, w, h);
  }
}
