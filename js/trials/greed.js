// T1 — Greed (Lobhasura). Catch modaks in a bowl — but the win band is a *sweet spot*, not a maximum:
// catch too many and the bowl overflows (loses), catch too few and the offering wasn't enough (also loses).
// Once you've caught enough, a chance to "offer it now" appears — take it and you win cleanly.
// Ignore it and modakas rain in faster and harder: you already had enough, but stopping is the
// part that's actually hard. The mechanic itself is the moral: restraint, not accumulation, wins.

import { clamp } from '../engine2d.js';

const DURATION = 32;
const SWEET_MIN = 10;
const SWEET_MAX = 16;          // tighter sweet band — harder to land cleanly on the line
const OVERFLOW = 19;           // less room past the sweet zone before it's over
const SPAWN_START = 0.52;
const SPAWN_END = 0.22;
const TEMPTATION_SPAWN_MULT = 0.42; // spawns come faster once you could've stopped
const TEMPTATION_SPEED_MULT = 1.8;  // and fall harder
const BASE_FALL_MIN = 360, BASE_FALL_MAX = 500; // faster still
const SOUR_CHANCE = 0.24; // spoiled modaks: dodge these, catching one costs the meter
const SOUR_PENALTY = 2;

export const greedTrial = {
  id: 'greed', name: 'Greed', hue: '--hue-greed',
  howTo: 'Drag (or use ◂ ▸) to move the bowl and catch modaks — dodge the dark, spoiled ones, they cost you. Once you\'ve caught enough, tap the "offer it now" ring (or press Enter) to stop cleanly — ignore it and the temptation only gets stronger, and faster.',

  start(engine, onEnd) {
    let t = 0;
    let meter = 0;
    let bowlX = engine.width / 2;
    const bowlW = 112, bowlH = 48;
    let falling = [];
    let spawnTimer = 0;
    let ended = false;
    let bowlPulse = 0;
    let offerReady = false; // meter has entered the sweet zone at least once
    let offerPulse = 0;

    function spawnInterval() {
      const p = clamp(t / DURATION, 0, 1);
      const base = SPAWN_START + (SPAWN_END - SPAWN_START) * p;
      return offerReady ? base * TEMPTATION_SPAWN_MULT : base;
    }

    function finish(won, reason) {
      if (ended) return;
      ended = true;
      const bonus = reason === 'offered-in-time' ? 5 : 0;
      onEnd({ won, score: meter + bonus, reason });
    }

    function offerNow() {
      if (offerReady && meter >= SWEET_MIN && meter <= SWEET_MAX) {
        finish(true, 'offered-in-time');
      }
    }

    engine.start((dt) => {
      if (ended) return;
      t += dt;

      // input: pointer drag or keyboard
      if (engine.pointer.down) bowlX = engine.pointer.x;
      if (engine.keyDown('ArrowLeft')) bowlX -= 320 * dt;
      if (engine.keyDown('ArrowRight')) bowlX += 320 * dt;
      bowlX = clamp(bowlX, bowlW / 2, engine.width - bowlW / 2);
      bowlPulse = Math.max(0, bowlPulse - dt * 4);
      offerPulse = (offerPulse + dt * 2.2) % 1;

      if (meter >= SWEET_MIN && meter <= SWEET_MAX) offerReady = true;

      const offerZone = { x: engine.width - 56, y: 26, r: 28 };
      if (engine.pointer.justDown && Math.hypot(engine.pointer.x - offerZone.x, engine.pointer.y - offerZone.y) < offerZone.r) offerNow();
      if (engine.keyJustPressed('Enter')) offerNow();
      if (ended) return;

      // spawn — usually one modak, but often a second alongside it so the bowl has real
      // volume to read/react to instead of a thin trickle
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = spawnInterval();
        const speedMult = offerReady ? TEMPTATION_SPEED_MULT : 1;
        const burstCount = Math.random() < (offerReady ? 0.55 : 0.35) ? 2 : 1;
        for (let i = 0; i < burstCount; i++) {
          const sour = Math.random() < SOUR_CHANCE;
          falling.push({
            x: 20 + Math.random() * (engine.width - 40), y: -10 - i * 34,
            vy: (BASE_FALL_MIN + Math.random() * (BASE_FALL_MAX - BASE_FALL_MIN)) * speedMult,
            vx: (Math.random() - 0.5) * 60, r: 12, sour,
          });
        }
      }

      // update falling modaks
      const bowlTop = engine.height - 70;
      for (const m of falling) { m.y += m.vy * dt; m.x += m.vx * dt; }
      for (const m of falling) {
        if (!m.caught && m.y > bowlTop - 10 && m.y < bowlTop + 20 && Math.abs(m.x - bowlX) < bowlW / 2) {
          m.caught = true;
          if (m.sour) {
            meter = Math.max(0, meter - SOUR_PENALTY);
            bowlPulse = 1;
            engine.burst(m.x, bowlTop, '#5a4a2a', 10);
            engine.shake(4);
          } else {
            meter += 1;
            bowlPulse = 1;
            engine.burst(m.x, bowlTop, '#ffcf4d', meter >= SWEET_MIN && meter <= SWEET_MAX ? 22 : 14);
            if (meter >= OVERFLOW) engine.shake(14);
          }
        }
      }
      falling = falling.filter(m => !m.caught && m.y < engine.height + 20);

      if (meter >= OVERFLOW) {
        finish(false, 'overflow');
        return;
      }
      if (t >= DURATION) {
        finish(meter >= SWEET_MIN && meter <= SWEET_MAX, meter < SWEET_MIN ? 'not-enough' : 'ok');
        return;
      }

      draw(engine, { t, meter, bowlX, bowlW, bowlH, falling, bowlTop, bowlPulse, offerReady, offerPulse });
    });
  },

  stop(engine) { engine.stop(); },
};

function draw(engine, s) {
  const ctx = engine.ctx;
  const w = engine.width, h = engine.height;

  // sweet-zone backdrop hint on the meter is handled in HUD (index.html meter);
  // here we just draw the play area.
  ctx.fillStyle = 'rgba(224,177,60,0.06)';
  ctx.fillRect(0, 0, w, h);

  // sweet-zone band: a visible strip on the fill meter showing the "just enough" range
  const bandW = Math.min(260, w - 60);
  const bandX = w / 2 - bandW / 2, bandY = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(bandX, bandY, bandW, 10);
  const sweetFrac0 = clamp(SWEET_MIN / OVERFLOW, 0, 1);
  const sweetFrac1 = clamp(SWEET_MAX / OVERFLOW, 0, 1);
  ctx.fillStyle = 'rgba(79,191,120,0.55)';
  ctx.fillRect(bandX + bandW * sweetFrac0, bandY, bandW * (sweetFrac1 - sweetFrac0), 10);
  const fillFrac = clamp(s.meter / OVERFLOW, 0, 1);
  ctx.fillStyle = s.meter >= SWEET_MIN && s.meter <= SWEET_MAX ? '#ffcf4d' : '#e2542a';
  ctx.fillRect(bandX + bandW * fillFrac - 2, bandY - 3, 4, 16);

  // falling modaks (dark, dull ones are sour — dodge them)
  for (const m of s.falling) {
    ctx.fillStyle = m.sour ? '#4a3a24' : '#e0b13c';
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - m.r);
    ctx.quadraticCurveTo(m.x + m.r, m.y - m.r, m.x, m.y + m.r);
    ctx.quadraticCurveTo(m.x - m.r, m.y - m.r, m.x, m.y - m.r);
    ctx.fill();
    ctx.strokeStyle = m.sour ? '#2a2014' : '#fff4d6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // bowl (pulses bigger on each catch)
  const bowlScale = 1 + s.bowlPulse * 0.4;
  ctx.save();
  ctx.translate(s.bowlX, s.bowlTop);
  ctx.scale(bowlScale, bowlScale);
  ctx.fillStyle = s.meter >= SWEET_MIN && s.meter <= SWEET_MAX ? '#ffcf4d' : '#c9903a';
  ctx.beginPath();
  ctx.moveTo(-s.bowlW / 2, 0);
  ctx.quadraticCurveTo(0, s.bowlH, s.bowlW / 2, 0);
  ctx.fill();
  ctx.strokeStyle = '#7b2f6b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // timer bar
  const remain = clamp(1 - s.t / DURATION, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(16, h - 14, w - 32, 4);
  ctx.fillStyle = '#ffcf4d';
  ctx.fillRect(16, h - 14, (w - 32) * remain, 4);

  // offer-it-now zone: appears once you've caught enough, pulses to tempt you to keep going instead
  if (s.offerReady) {
    const pulseR = 22 + Math.sin(s.offerPulse * Math.PI * 2) * 4;
    ctx.beginPath();
    ctx.arc(w - 56, 26, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79,191,120,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,246,236,0.85)';
    ctx.font = '10px Mulish, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('offer it', w - 56, 30);
  }
}
