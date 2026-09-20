// T2 — Anger (Krodhasura), "The Unsent Reply". One continuous, escalating argument — not random
// jabs. Each line the other person throws at you opens a response window with two real options:
// an easy, tempting AGGRESSIVE reply (a big obvious target, instant satisfying snap-back — but it
// feeds the fire) versus a harder, deliberate RESTRAINED hold (press and hold through the whole
// window without letting go — genuinely effortful, but it's what actually cools things down).
// Saying nothing at all just lets it fester quietly. As the argument escalates, the window gets
// shorter and the aggressive option gets visually louder — it's supposed to get harder to resist.

import { clamp, fitText } from '../engine2d.js';

const MAX_RAGE = 100;
const RISE_RATE = 6;          // passive fester rate when you say nothing
const LINE_GAP = 1.3;         // beat between a line landing and the response window opening
const AGGRESSIVE_HIT = 24;    // rage cost of snapping back
const RESTRAINED_RELIEF = 16; // rage relief of holding through cleanly
const PROVOKE_CHANCE = 0.4;   // chance a line is a sharper, personal jab instead of the base script

const SCRIPT = [
  'You always do this.',
  "Typical. Just like last time.",
  'Do you even care?',
  'Say something, then!',
  "I knew you'd react like this.",
  'This is exactly why nobody tells you anything.',
  'Go on. Prove me right.',
  "You can't even control yourself, can you?",
  'Fine. Be that way.',
  "Everyone already knows you'll lose it.",
  '...Are you even listening?',
  "This is why nobody wants to deal with you.",
  "You always ruin moments like this.",
  "I'm just saying what everyone else thinks.",
  "You're proving my point right now.",
  "Wow. Real mature.",
];

export const angerTrial = {
  id: 'anger', name: 'Anger', hue: '--hue-anger',
  howTo: 'An argument plays out, line by line. When a response window opens: tap/press the red zone to snap back (easy, but feeds the fire), or press-and-hold the green zone through the whole window to bite your tongue (harder, but cools things down). Doing nothing lets it fester a little.',

  start(engine, onEnd) {
    let rage = 45;
    let ended = false;
    let lineIndex = -1;
    let phase = 'gap';       // 'gap' | 'window' | 'done'
    let phaseTimer = LINE_GAP;
    let windowLen = 3.4;
    let holding = false;
    let heldAllWindow = false;
    let respondedAggressive = false;
    let flash = 0;
    let shakePulse = 0;
    let resultPulse = 0; // >0 green (restrained), <0 red (aggressive), fades
    let jabActive = false;   // this line is a sharper, personal provocation (visually louder)
    let streakHeld = 0;      // consecutive restrained holds — required holds grow as this rises

    function finish(won, reason) {
      if (ended) return;
      ended = true;
      onEnd({ won, score: Math.round(MAX_RAGE - rage), reason });
    }

    function isHeld() {
      return engine.pointer.down || engine.keyDown('Space');
    }

    function isAggressiveHit() {
      return engine.keyJustPressed('KeyX') || (engine.pointer.justDown && engine.pointer.x > engine.width * 0.55);
    }

    function nextLine() {
      lineIndex += 1;
      if (lineIndex >= SCRIPT.length) { phase = 'done'; return; }
      phase = 'gap';
      phaseTimer = LINE_GAP;
      // window shrinks as the argument escalates: 3.4s down to ~2.0s on the last line — slower
      // throughout than before, so restraint is a real deliberate hold, not a reflex test
      const p = lineIndex / Math.max(1, SCRIPT.length - 1);
      windowLen = 3.4 - p * 1.4;
      heldAllWindow = true;
      respondedAggressive = false;
      jabActive = Math.random() < PROVOKE_CHANCE + p * 0.25; // jabs get more frequent as it escalates
    }

    function resolveWindow() {
      if (respondedAggressive) {
        rage += AGGRESSIVE_HIT;
        flash = 1;
        shakePulse = 12;
        resultPulse = -1;
        streakHeld = 0;
      } else if (heldAllWindow && holding) {
        rage -= RESTRAINED_RELIEF;
        engine.burst(engine.width / 2, engine.height / 2 - 20, '#3fb6a8', 14);
        resultPulse = 1;
        streakHeld += 1;
      } else {
        rage += RISE_RATE * (jabActive ? 1.1 : 0.6); // said nothing, let it fester — worse on a sharp jab
        streakHeld = 0;
      }
      rage = clamp(rage, 0, MAX_RAGE);
    }

    nextLine();

    engine.start((dt) => {
      if (ended) return;
      flash = Math.max(0, flash - dt * 2.5);
      resultPulse = resultPulse > 0 ? Math.max(0, resultPulse - dt * 1.2) : Math.min(0, resultPulse + dt * 1.2);

      const held = isHeld();
      holding = held;

      if (phase === 'gap') {
        phaseTimer -= dt;
        if (phaseTimer <= 0) { phase = 'window'; phaseTimer = windowLen; }
      } else if (phase === 'window') {
        if (!held) heldAllWindow = false;
        if (isAggressiveHit()) respondedAggressive = true;
        phaseTimer -= dt;
        if (phaseTimer <= 0 || respondedAggressive) {
          phase = 'gap';
          resolveWindow();
          if (shakePulse > 0) { engine.shake(shakePulse); shakePulse = 0; }
          if (rage >= MAX_RAGE) { finish(false, 'snapped'); return; }
          nextLine();
          if (phase === 'done') { finish(rage < MAX_RAGE, 'made-it-through'); return; }
        }
      } else if (phase === 'done') {
        finish(rage < MAX_RAGE, 'made-it-through');
        return;
      }

      draw(engine, {
        rage, flash, holding, resultPulse, jabActive, streakHeld,
        line: SCRIPT[lineIndex] || '', phase, phaseTimer, windowLen,
      });
    });
  },

  stop(engine) { engine.stop(); },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(engine, s) {
  const ctx = engine.ctx;
  const w = engine.width, h = engine.height;
  const cx = w / 2;
  const heat = s.rage / MAX_RAGE;

  // vertical layout is percentage-based so nothing overlaps regardless of canvas size
  const lineY = h * 0.20;
  const jabY = h * 0.27;
  const barY = h * 0.38;
  const ringCx = w - 46, ringCy = barY + 5;
  const zoneY = h * 0.60;
  const streakY = zoneY + 62;
  const promptY = h * 0.84;

  ctx.fillStyle = `rgba(226,84,42,${0.05 + heat * 0.12 + s.flash * 0.1 + (s.jabActive ? 0.06 : 0)})`;
  ctx.fillRect(0, 0, w, h);
  // a heavier vignette on a sharp jab — the whole scene should feel like it's leaning in on you
  if (s.jabActive) {
    const vg = ctx.createRadialGradient(cx, h / 2, h * 0.25, cx, h / 2, h * 0.75);
    vg.addColorStop(0, 'rgba(226,84,42,0)');
    vg.addColorStop(1, 'rgba(120,20,10,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // the aggressor's line, held in an actual speech-bubble panel so it reads as one designed piece —
  // fitText shrinks the font first so long lines never run off the canvas on narrow screens
  if (s.line) {
    ctx.textAlign = 'center';
    const quoted = `"${s.line}"`;
    fitText(ctx, quoted, w - 48, s.jabActive ? 16 : 15, 'Mulish, sans-serif', s.jabActive ? '700' : '');
    const textW = Math.min(ctx.measureText(quoted).width + 40, w - 32);
    const bubbleW = Math.max(180, textW), bubbleH = s.jabActive ? 54 : 44;
    const bubbleX = cx - bubbleW / 2, bubbleY = lineY - bubbleH + 14;
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 14);
    ctx.fillStyle = s.jabActive ? 'rgba(90,20,14,0.55)' : 'rgba(20,8,14,0.45)';
    ctx.fill();
    ctx.strokeStyle = s.jabActive ? 'rgba(255,120,90,0.6)' : 'rgba(255,246,236,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = s.jabActive ? 'rgba(255,180,150,0.98)' : 'rgba(255,246,236,0.92)';
    ctx.fillText(`"${s.line}"`, cx, lineY);
    if (s.jabActive) {
      ctx.font = '10px Mulish, sans-serif';
      ctx.fillStyle = 'rgba(255,150,120,0.9)';
      ctx.fillText('— that one\'s meant to sting', cx, jabY);
    }
  }

  // rage meter, boxed with its own panel instead of floating loose on the scene
  const barW = Math.min(260, w - 110), barX = cx - barW / 2 - 20;
  roundRect(ctx, barX - 10, barY - 20, barW + 20, 34, 10);
  ctx.fillStyle = 'rgba(10,4,8,0.4)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,236,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(barX, barY, barW, 10);
  ctx.fillStyle = heat > 0.7 ? '#e2542a' : '#ffcf4d';
  ctx.fillRect(barX, barY, barW * heat, 10);
  ctx.font = '9px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('rage', barX, barY - 6);

  if (s.phase === 'window') {
    const remain = clamp(s.phaseTimer / s.windowLen, 0, 1);

    // one shared panel behind both response zones, so they read as a grouped control, not two
    // random circles dropped on the scene
    roundRect(ctx, cx - 160, zoneY - 52, 320, 104, 18);
    ctx.fillStyle = 'rgba(10,4,8,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,236,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // window countdown ring, off to the side so it never collides with the rage bar or text
    ctx.strokeStyle = 'rgba(255,207,77,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, 16, -Math.PI / 2, -Math.PI / 2 + remain * Math.PI * 2);
    ctx.stroke();

    // restrained zone (left/green): hold through it
    const restX = cx - 100, restY = zoneY;
    ctx.beginPath();
    ctx.arc(restX, restY, 34, 0, Math.PI * 2);
    ctx.fillStyle = s.holding ? 'rgba(63,182,168,0.85)' : 'rgba(63,182,168,0.35)';
    ctx.fill();
    ctx.strokeStyle = '#e6fff9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,246,236,0.9)';
    ctx.font = '11px Mulish, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('hold', restX, restY + 4);

    // aggressive zone (right/red): bigger, louder, more tempting as things escalate — jitters on a jab line
    const aggJitter = s.jabActive ? (Math.random() - 0.5) * 4 : 0;
    const aggX = cx + 100 + aggJitter, aggY = zoneY;
    const aggR = 34 + (1 - remain) * 10 + (s.jabActive ? 4 : 0);
    ctx.beginPath();
    ctx.arc(aggX, aggY, aggR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(226,84,42,${0.55 + (1 - remain) * 0.3 + (s.jabActive ? 0.1 : 0)})`;
    ctx.fill();
    ctx.strokeStyle = '#fff6ec';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,246,236,0.95)';
    ctx.font = '11px Mulish, sans-serif';
    ctx.fillText('snap back', aggX, aggY + 4);
  }

  // restraint streak — holding through several jabs in a row builds visible resolve
  if (s.streakHeld >= 2) {
    ctx.font = '11px Mulish, sans-serif';
    ctx.fillStyle = 'rgba(63,182,168,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(`held steady ×${s.streakHeld}`, cx, streakY);
  }

  if (s.resultPulse !== 0) {
    const good = s.resultPulse > 0;
    ctx.fillStyle = good ? `rgba(63,182,168,${Math.abs(s.resultPulse) * 0.4})` : `rgba(226,84,42,${Math.abs(s.resultPulse) * 0.4})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.fillStyle = 'rgba(255,246,236,0.7)';
  ctx.font = '12px Mulish, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.phase === 'window' ? 'hold your tongue, or snap back?' : '...', cx, promptY);
}
