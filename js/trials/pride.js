// T3 — Pride (Abhimanasura). An ego stands on a narrow pedestal, endlessly nudged by outside
// flattery and provocation (the gusts). Staying centered means bending — correcting with real,
// weighted momentum, not snapping rigidly back — while refusing to yield at all is exactly what
// makes it topple. "Pride comes before a fall" is the mechanic itself, not just the title: the
// figure has inertia like a real body balancing, so over-correcting throws it just as hard as
// ignoring a gust does.

import { clamp, lerp, reducedMotion, fitText } from '../engine2d.js';

const DURATION = 24;
const DRIFT_ACCEL = 0.6;      // constant unpredictable push on velocity, not tilt directly
const CORRECT_ACCEL = 3.6;    // how hard held input accelerates the correction
const DRAG_IMPULSE = 8.5;     // how hard a pointer-drag delta kicks velocity
const DAMPING = 1.75;         // friction: how fast velocity bleeds off each second
const GUST_MIN = 1.5;
const GUST_MAX = 2.9;
const GUST_IMPULSE = [0.95, 1.6]; // sudden velocity kick from a gust
const TOPPLE = 1.05;
const MAX_VEL = 4.2;
const FLATTERY_MIN = 3.5, FLATTERY_MAX = 6;
const FLATTERY_DURATION = 2.2;
const FLATTERY_DRIFT_MULT = 1.4;   // praise makes the sway harder to predict
const FLATTERY_CORRECT_MULT = 0.75; // and harder to correct against — dazzle, not damage
const FLATTERY_LINES = ['You\'re clearly the best here.', 'No one else could do this.', 'They all came just to watch you.', 'You don\'t even need to try.'];

export const prideTrial = {
  id: 'pride', name: 'Pride', hue: '--hue-pride',
  howTo: 'Use ◂ ▸ (or drag) to keep the figure balanced. It has real weight — over-correcting throws it just as hard as ignoring a gust. When flattery lines appear, ease off — fighting hard against praise is what throws you.',

  start(engine, onEnd) {
    let t = 0;
    let tilt = 0;          // -1..1, the actual lean
    let tiltVel = 0;       // momentum driving tilt
    let visualTilt = 0;    // slightly lags tilt for a natural, flexible sway
    let driftDir = Math.random() < 0.5 ? -1 : 1;
    let ended = false;
    let gustTimer = GUST_MIN + Math.random() * (GUST_MAX - GUST_MIN);
    let gustFlash = 0;
    let lastPointerX = null;
    let flatteryTimer = FLATTERY_MIN + Math.random() * (FLATTERY_MAX - FLATTERY_MIN);
    let flatteryActive = 0; // seconds remaining
    let flatteryLine = '';

    function finish(won, reason) {
      if (ended) return;
      ended = true;
      onEnd({ won, score: Math.round((1 - Math.abs(tilt)) * 100), reason });
    }

    engine.start((dt) => {
      if (ended) return;
      t += dt;
      gustFlash = Math.max(0, gustFlash - dt * 2.5);

      // flattery: a temporary "you're the best" event that dazzles more than it pushes —
      // the sway gets harder to predict and correction gets duller, so fighting it hard
      // (over-correcting on praise) is exactly what throws the balance off
      if (flatteryActive > 0) {
        flatteryActive -= dt;
      } else {
        flatteryTimer -= dt;
        if (flatteryTimer <= 0) {
          flatteryTimer = FLATTERY_MIN + Math.random() * (FLATTERY_MAX - FLATTERY_MIN);
          flatteryActive = FLATTERY_DURATION;
          flatteryLine = FLATTERY_LINES[Math.floor(Math.random() * FLATTERY_LINES.length)];
        }
      }
      const flattered = flatteryActive > 0;
      const driftMult = flattered ? FLATTERY_DRIFT_MULT : 1;
      const correctMult = flattered ? FLATTERY_CORRECT_MULT : 1;

      // self-drift as a gentle constant acceleration, occasionally flips direction
      if (Math.random() < dt * 0.3) driftDir *= -1;
      tiltVel += driftDir * DRIFT_ACCEL * driftMult * dt;

      // periodic gusts: a sudden kick to velocity, not an instant tilt jump
      gustTimer -= dt;
      if (gustTimer <= 0) {
        gustTimer = GUST_MIN + Math.random() * (GUST_MAX - GUST_MIN);
        const strength = GUST_IMPULSE[0] + Math.random() * (GUST_IMPULSE[1] - GUST_IMPULSE[0]);
        tiltVel += (Math.random() < 0.5 ? -1 : 1) * strength;
        gustFlash = 1;
        engine.shake(reducedMotion ? 3 : 8);
      }

      // input correction: keys/drag accelerate velocity, they don't set tilt directly
      if (engine.keyDown('ArrowLeft')) tiltVel -= CORRECT_ACCEL * correctMult * dt;
      if (engine.keyDown('ArrowRight')) tiltVel += CORRECT_ACCEL * correctMult * dt;
      if (engine.pointer.down) {
        if (lastPointerX !== null) {
          const delta = engine.pointer.x - lastPointerX;
          tiltVel += (delta / engine.width) * DRAG_IMPULSE * correctMult;
        }
        lastPointerX = engine.pointer.x;
      } else {
        lastPointerX = null;
      }

      // friction bleeds velocity off, then velocity integrates into tilt
      tiltVel *= Math.max(0, 1 - DAMPING * dt);
      tiltVel = clamp(tiltVel, -MAX_VEL, MAX_VEL);
      tilt += tiltVel * dt;
      tilt = clamp(tilt, -1.3, 1.3);
      visualTilt = lerp(visualTilt, tilt, clamp(dt * 12, 0, 1));

      if (Math.abs(tilt) >= TOPPLE) { finish(false, 'toppled'); return; }
      if (t >= DURATION) { finish(true, 'balanced'); return; }

      draw(engine, { t, tilt: visualTilt, gustFlash, flattered, flatteryLine, remain: clamp(1 - t / DURATION, 0, 1), secsLeft: Math.ceil(DURATION - t) });
    });
  },

  stop(engine) { engine.stop(); },
};

function draw(engine, s) {
  const ctx = engine.ctx;
  const w = engine.width, h = engine.height;
  const cx = w / 2;
  const pedestalY = h - 90;
  const danger = Math.abs(s.tilt) / TOPPLE;
  const now = performance.now() / 1000;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, `rgba(58,23,64,${0.5 + s.gustFlash * 0.15})`);
  bgGrad.addColorStop(1, `rgba(20,8,26,${0.6})`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `rgba(160,107,224,${0.05 + s.gustFlash * 0.12 + (s.flattered ? 0.06 : 0)})`;
  ctx.fillRect(0, 0, w, h);

  // time-remaining bar up top — how much longer you have to hold the balance
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(16, 16, w - 32, 6);
  ctx.fillStyle = '#ffcf4d';
  ctx.fillRect(16, 16, (w - 32) * s.remain, 6);
  ctx.font = '11px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(`hold it — ${s.secsLeft}s to go`, w / 2, 38);

  // a small watching crowd — lights up warmer while flattery is active
  for (let i = 0; i < 9; i++) {
    const px = w * 0.12 + (w * 0.76) * (i / 8);
    const bob = Math.sin(now * 1.6 + i) * 3;
    ctx.beginPath();
    ctx.arc(px, pedestalY + 30 + bob, 5, 0, Math.PI * 2);
    ctx.fillStyle = s.flattered ? 'rgba(255,207,77,0.55)' : 'rgba(255,246,236,0.18)';
    ctx.fill();
  }

  // pedestal with a couple of steps for visual weight
  ctx.fillStyle = '#2a1030';
  ctx.fillRect(cx - 66, pedestalY + 10, 132, 10);
  ctx.fillStyle = '#3a1740';
  ctx.fillRect(cx - 50, pedestalY, 100, 14);
  ctx.fillRect(cx - 12, pedestalY + 14, 24, 30);

  // danger band hint at the edges
  ctx.fillStyle = 'rgba(226,84,42,0.5)';
  ctx.fillRect(cx - 54, pedestalY - 4, 4, 4);
  ctx.fillRect(cx + 50, pedestalY - 4, 4, 4);

  // flattery sparkle + line, floating above the figure
  if (s.flattered) {
    for (let i = 0; i < 6; i++) {
      const a = now * 1.2 + i * 1.1;
      const sx = cx + Math.cos(a) * (40 + i * 6), sy = pedestalY - 110 + Math.sin(a * 1.4) * 14;
      ctx.fillStyle = 'rgba(255,207,77,0.75)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    const flatteryText = `"${s.flatteryLine}"`;
    fitText(ctx, flatteryText, w - 40, 13);
    ctx.fillStyle = 'rgba(255,207,77,0.9)';
    ctx.fillText(flatteryText, cx, pedestalY - 128);
  }

  // figure: pivots at pedestal top, tilts, redder/wobblier as danger rises
  const angle = s.tilt * 0.65;
  ctx.save();
  ctx.translate(cx, pedestalY);
  ctx.rotate(angle);
  const bodyColor = danger > 0.7 ? '#e2542a' : (s.flattered ? '#c79bf0' : '#a06be0');
  // a trailing cape/fabric line for visual weight and motion read
  ctx.strokeStyle = bodyColor;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(-18 - angle * 30, -50, -10, -84);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, -46, 16, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0a20';
  ctx.lineWidth = 2;
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(0, -86, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // tilt gauge
  const barW = Math.min(280, w - 60), barX = cx - barW / 2, barY = h - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(barX, barY, barW, 10);
  ctx.fillStyle = 'rgba(255,207,77,0.5)';
  ctx.fillRect(barX + barW * 0.4, barY, barW * 0.2, 10);
  const markerX = barX + barW * ((s.tilt / TOPPLE + 1) / 2);
  ctx.fillStyle = danger > 0.7 ? '#e2542a' : '#fff6ec';
  ctx.fillRect(clamp(markerX, barX, barX + barW) - 2, barY - 5, 4, 20);

  ctx.font = '13px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('stay balanced', cx, barY - 14);
}
