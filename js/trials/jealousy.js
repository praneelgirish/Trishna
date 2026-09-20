// T6 — Jealousy (Matsaryasura), "Two Chairs". An interview alternates between you and a rival
// sitting beside you. On YOUR turn, answering well is a real timing skill: a needle sweeps a dial
// and you tap the instant it crosses the good-answer zone — that's the only honest path to winning.
// On the RIVAL's turn, you do nothing and their score rises anyway, a little faster than seems fair,
// while they visibly bask in it — the whole point is that watching this is uncomfortable. A
// "distract them" jab is sitting right there during their turn: using it knocks their score down
// hard and feels immediately satisfying, but it does two costly things at once — it raises a
// visible Guilt meter that disqualifies you outright if it maxes out, AND it rattles YOUR next
// answer (a noticeably smaller, harder zone), because acting on jealousy doesn't just risk getting
// caught, it actually throws off your own focus. Winning means reaching your own answer goal
// through the honest, harder path while the rival visibly outpaces you the whole time.

import { clamp, fitText } from '../engine2d.js';

const GOAL = 6;               // good answers you need to win
const MAX_ROUNDS = 10;        // your turns before it's over, win or not
const YOUR_TURN_LEN_START = 1.7, YOUR_TURN_LEN_END = 1.05; // needle sweep time, tightens each round
const ZONE_START = 0.24, ZONE_END = 0.13; // good-answer zone width (fraction of the dial), tightens
const STUNG_ZONE_MULT = 0.65; // your zone shrinks further the turn right after you distract
const RIVAL_TURN_LEN = 1.15;
const RIVAL_GAIN = [0.8, 1.15];   // rival's effortless score-per-turn
const RIVAL_GAIN_DISTRACTED = [0.15, 0.3];
const GUILT_MAX = 100;
const GUILT_PER_USE = 36;     // 3 uses and you're disqualified
const GUILT_DECAY = 5;        // per second, if you leave it alone
const DRIFT_AMP_MAX = 0.13;   // from round 4 on, the good-answer zone itself drifts as you sweep —
const DRIFT_PERIOD = 1.05;    // you have to track it live, not just time one static spot

const QUESTIONS = [
  'Why should this go to you?', 'What makes you different?', 'Tell us about a time you led.',
  'Why do you want this?', 'What\'s your biggest strength?', 'Why not them instead?',
  'What have you actually done?', 'Convince us.', 'Last question — sell yourself.',
];

export const jealousyTrial = {
  id: 'jealousy', name: 'Jealousy', hue: '--hue-jealousy',
  howTo: 'On your turn, tap (or Space) the instant the needle crosses the glowing zone — that\'s your only honest way to score. On the rival\'s turn, their score rises on its own while they bask in it; you can tap "distract" to knock them down, but it feeds a Guilt meter that disqualifies you if it maxes, and rattles your very next answer.',

  start(engine, onEnd) {
    let ended = false;
    let round = 0;
    let turn = 'you'; // 'you' | 'rival' | 'switching'
    let turnT = 0;
    let yourScore = 0;
    let rivalScore = 0;
    let guilt = 0;
    let needlePos = 0; // 0..1, sweeps forward then back
    let zoneCenter = 0.5;  // the live, current center — what hit detection actually uses
    let zoneBase = 0.5;    // the center it drifts around, once drift kicks in
    let driftAmp = 0;
    let zoneWidth = ZONE_START;
    let turnLen = YOUR_TURN_LEN_START;
    let pendingSting = false; // set by distract(), consumed at the start of your next turn
    let currentlyStung = false; // true for the whole turn that was rattled, for the visual read
    let question = QUESTIONS[0];
    let resultFlash = 0; // >0 good hit, <0 miss
    let rivalFlash = 0;
    let distractedThisTurn = false;
    let guiltFlash = 0;
    let switchTimer = 0;
    let nextIsYou = false; // alternation is independent of `round`, which only counts YOUR turns

    function finish(won, reason) {
      if (ended) return;
      ended = true;
      onEnd({ won, score: yourScore, reason });
    }

    function setupYourTurn() {
      const p = clamp(round / (MAX_ROUNDS - 1), 0, 1);
      turnLen = YOUR_TURN_LEN_START + (YOUR_TURN_LEN_END - YOUR_TURN_LEN_START) * p;
      currentlyStung = pendingSting;
      zoneWidth = (ZONE_START + (ZONE_END - ZONE_START) * p) * (currentlyStung ? STUNG_ZONE_MULT : 1);
      pendingSting = false;
      zoneBase = 0.3 + Math.random() * 0.4;
      zoneCenter = zoneBase;
      driftAmp = round >= 3 ? DRIFT_AMP_MAX * clamp((round - 2) / 5, 0, 1) : 0;
      needlePos = 0;
      turnT = 0;
      question = QUESTIONS[round % QUESTIONS.length];
    }

    function startTurn(which) {
      turn = which;
      turnT = 0;
      distractedThisTurn = false;
      if (which === 'you') setupYourTurn();
    }

    function answer() {
      if (turn !== 'you') return;
      const hit = Math.abs(needlePos - zoneCenter) <= zoneWidth / 2;
      if (hit) {
        yourScore += 1;
        resultFlash = 1;
        engine.burst(engine.width / 2, engine.height * 0.42, '#4fbf78', 16);
      } else {
        resultFlash = -1;
        engine.shake(4);
      }
      round += 1;
      turn = 'switching';
      switchTimer = 0.5;
      nextIsYou = false;
    }

    function distract() {
      if (turn !== 'rival' || distractedThisTurn || ended) return;
      distractedThisTurn = true;
      guilt = clamp(guilt + GUILT_PER_USE, 0, GUILT_MAX);
      guiltFlash = 1;
      pendingSting = true;
      engine.shake(6);
      engine.burst(engine.width * 0.72, engine.height * 0.42, '#e2542a', 12);
    }

    startTurn('you');

    engine.start((dt) => {
      if (ended) return;
      resultFlash = resultFlash > 0 ? Math.max(0, resultFlash - dt * 1.3) : Math.min(0, resultFlash + dt * 1.3);
      rivalFlash = Math.max(0, rivalFlash - dt * 2);
      guiltFlash = Math.max(0, guiltFlash - dt * 2);
      guilt = clamp(guilt - GUILT_DECAY * dt, 0, GUILT_MAX);

      if (turn === 'you') {
        turnT += dt;
        // needle sweeps 0 -> 1 -> 0 across the dial
        const cyclePos = (turnT / turnLen) % 2;
        needlePos = cyclePos <= 1 ? cyclePos : 2 - cyclePos;
        // from round 4 on, the zone itself drifts while you track it — same value drives both
        // what's drawn and what answer() checks against, so there's no hidden unfairness
        if (driftAmp > 0) {
          const drift = Math.sin((turnT / DRIFT_PERIOD) * Math.PI * 2) * driftAmp;
          zoneCenter = clamp(zoneBase + drift, zoneWidth / 2, 1 - zoneWidth / 2);
        }
        if ((engine.pointer.justDown || engine.keyJustPressed('Space')) ) answer();
        else if (turnT >= turnLen * 2.05) { // ran out without answering
          resultFlash = -1;
          round += 1;
          turn = 'switching';
          switchTimer = 0.5;
          nextIsYou = false;
        }
      } else if (turn === 'rival') {
        turnT += dt;
        const buttonX = engine.width * 0.72, buttonY = engine.height * 0.34;
        const tappedButton = engine.pointer.justDown && Math.hypot(engine.pointer.x - buttonX, engine.pointer.y - buttonY) < 40;
        if ((tappedButton || engine.keyJustPressed('Space')) && !distractedThisTurn) distract();
        if (turnT >= RIVAL_TURN_LEN) {
          const range = distractedThisTurn ? RIVAL_GAIN_DISTRACTED : RIVAL_GAIN;
          rivalScore += range[0] + Math.random() * (range[1] - range[0]);
          rivalFlash = 1;
          turn = 'switching';
          switchTimer = 0.5;
          nextIsYou = true;
        }
      } else { // switching — a brief beat so the turn change reads clearly
        switchTimer -= dt;
        if (switchTimer <= 0) {
          if (guilt >= GUILT_MAX) { finish(false, 'disqualified'); return; }
          if (yourScore >= GOAL) { finish(true, 'earned-it'); return; }
          if (round >= MAX_ROUNDS) { finish(false, 'ran-out'); return; }
          startTurn(nextIsYou ? 'you' : 'rival');
        }
      }

      draw(engine, {
        turn, needlePos, zoneCenter, zoneWidth, question,
        yourScore, rivalScore, guilt, resultFlash, rivalFlash, guiltFlash,
        distractedThisTurn, round, stung: currentlyStung,
      });
    });
  },

  stop(engine) { engine.stop(); },
};

function draw(engine, s) {
  const ctx = engine.ctx;
  const w = engine.width, h = engine.height;
  const now = performance.now() / 1000;

  ctx.fillStyle = `rgba(79,191,120,${0.04 + Math.abs(s.resultFlash) * 0.06 + s.guiltFlash * 0.08})`;
  ctx.fillRect(0, 0, w, h);

  // interviewer podium, top-center
  ctx.fillStyle = 'rgba(20,30,24,0.6)';
  ctx.fillRect(w / 2 - 34, 14, 68, 24);
  ctx.strokeStyle = 'rgba(255,246,236,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(w / 2 - 34, 14, 68, 24);
  ctx.textAlign = 'center';
  const questionText = '"' + s.question + '"';
  fitText(ctx, questionText, w - 40, 11);
  ctx.fillStyle = 'rgba(255,246,236,0.8)';
  ctx.fillText(questionText, w / 2, 52);

  const chairY = h * 0.62;
  const youX = w * 0.28, rivalX = w * 0.72;

  // your chair
  ctx.save();
  ctx.translate(youX, chairY);
  ctx.globalAlpha = s.turn === 'you' ? 1 : 0.55;
  ctx.fillStyle = '#2a3a2e';
  ctx.fillRect(-26, -10, 52, 46);
  ctx.strokeStyle = s.turn === 'you' ? 'rgba(79,191,120,0.9)' : 'rgba(255,246,236,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-26, -10, 52, 46);
  ctx.beginPath(); ctx.arc(0, -28, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#4fbf78'; ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.font = '10px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.7)';
  ctx.fillText('you', youX, chairY + 56);

  // rival chair — smirks and glows warm while it's their turn
  ctx.save();
  ctx.translate(rivalX, chairY);
  ctx.globalAlpha = s.turn === 'rival' ? 1 : 0.55;
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-26, -10, 52, 46);
  ctx.strokeStyle = s.turn === 'rival' ? 'rgba(255,207,77,0.9)' : 'rgba(255,246,236,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-26, -10, 52, 46);
  ctx.beginPath(); ctx.arc(0, -28, 16, 0, Math.PI * 2);
  ctx.fillStyle = s.turn === 'rival' ? '#e0b13c' : '#8a6a3a'; ctx.fill(); ctx.stroke();
  // a small smug curved mouth
  ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(3, -25, 6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  if (s.rivalFlash > 0) {
    ctx.globalAlpha = s.rivalFlash;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + now * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 30, -28 + Math.sin(a) * 30, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcf4d'; ctx.fill();
    }
  }
  ctx.restore();
  ctx.font = '10px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.7)';
  ctx.fillText('rival', rivalX, chairY + 56);

  // your answer dial — only shown on your turn
  if (s.turn === 'you') {
    const dialY = h * 0.34, dialW = Math.min(260, w - 80), dialX = w / 2 - dialW / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(dialX, dialY, dialW, 12);
    const zoneX = dialX + dialW * (s.zoneCenter - s.zoneWidth / 2);
    ctx.fillStyle = s.stung ? 'rgba(226,84,42,0.7)' : 'rgba(79,191,120,0.7)';
    ctx.fillRect(zoneX, dialY, dialW * s.zoneWidth, 12);
    const needleX = dialX + dialW * s.needlePos;
    ctx.fillStyle = '#fff6ec';
    ctx.fillRect(needleX - 2, dialY - 6, 4, 24);
    ctx.font = '11px Mulish, sans-serif';
    ctx.fillStyle = 'rgba(255,246,236,0.8)';
    ctx.fillText(s.stung ? 'still rattled from that jab — tap the glow' : 'tap when it\'s in the glow', w / 2, dialY - 14);
  } else if (s.turn === 'rival') {
    // distract hotspot — big, filled, and pulsing hard: it should look genuinely tempting to hit
    const dx = rivalX, dy = h * 0.34;
    if (!s.distractedThisTurn) {
      const outerPulse = 34 + Math.sin(now * 5) * 6;
      const glow = ctx.createRadialGradient(dx, dy, 4, dx, dy, outerPulse + 14);
      glow.addColorStop(0, 'rgba(226,84,42,0.5)');
      glow.addColorStop(1, 'rgba(226,84,42,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(dx, dy, outerPulse + 14, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath(); ctx.arc(dx, dy, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(226,84,42,0.85)';
      ctx.fill();
      ctx.strokeStyle = '#fff6ec';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(dx, dy, outerPulse, 0, Math.PI * 2); ctx.stroke();

      ctx.font = '700 13px Mulish, sans-serif';
      ctx.fillStyle = '#fff6ec';
      ctx.fillText('DISTRACT', dx, dy + 5);
    } else {
      ctx.beginPath(); ctx.arc(dx, dy, 24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,246,236,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '10px Mulish, sans-serif';
      ctx.fillStyle = 'rgba(255,246,236,0.6)';
      ctx.fillText('done', dx, dy + 4);
    }
    ctx.font = '11px Mulish, sans-serif';
    ctx.fillStyle = 'rgba(255,207,77,0.75)';
    ctx.fillText('they\'re answering easily...', w / 2, h * 0.22);

    // a small crowd, visibly warming to the rival while it's their turn
    for (let i = 0; i < 5; i++) {
      const px = rivalX - 50 + i * 25;
      const bob = Math.sin(now * 3 + i * 1.3) * 3;
      ctx.beginPath(); ctx.arc(px, h * 0.5 + bob, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,207,77,0.5)';
      ctx.fill();
    }
  }

  // rival's trophy shelf — a growing, unearned-looking tally that's the whole point of the sting
  const rivalTrophies = Math.floor(s.rivalScore);
  const shelfY = chairY + 66;
  for (let i = 0; i < Math.min(rivalTrophies, 6); i++) {
    ctx.font = '12px Mulish, sans-serif';
    ctx.fillStyle = 'rgba(255,207,77,0.8)';
    ctx.textAlign = 'left';
    ctx.fillText('★', rivalX - 40 + i * 15, shelfY);
  }

  // the visible gap between what you've earned and what they've been given — the actual sting
  const gap = Math.max(0, s.rivalScore - s.yourScore);
  if (gap > 1.5) {
    ctx.textAlign = 'center';
    const gapText = `they're ${gap.toFixed(1)} ahead — and it cost them nothing`;
    fitText(ctx, gapText, w - 40, 10);
    ctx.fillStyle = 'rgba(226,84,42,0.75)';
    ctx.fillText(gapText, w / 2, h - 70);
  }

  // scores
  ctx.font = '13px Mulish, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4fbf78';
  ctx.fillText(`you ${s.yourScore}/${GOAL}`, 16, h - 54);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e0b13c';
  ctx.fillText(`rival ${s.rivalScore.toFixed(1)}`, w - 16, h - 54);

  // guilt meter
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(16, h - 26, w - 32, 8);
  ctx.fillStyle = s.guilt > 66 ? '#e2542a' : '#9a7bc4';
  ctx.fillRect(16, h - 26, (w - 32) * (s.guilt / 100), 8);
  ctx.font = '9px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.55)';
  ctx.fillText('guilt', 16, h - 30);

  if (s.resultFlash !== 0) {
    const good = s.resultFlash > 0;
    ctx.fillStyle = good ? `rgba(79,191,120,${Math.abs(s.resultFlash) * 0.3})` : `rgba(226,84,42,${Math.abs(s.resultFlash) * 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }
}
