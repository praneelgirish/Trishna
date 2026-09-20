// T4 — Attachment (Mamasura), "The Room You Can't Leave". A room full of keepsakes is collapsing
// and on fire. You can carry out at most 3. Selecting is a real choice (tap to pick up, tap again
// to put back); grabbing a new item while your hands are full swaps out your oldest pick and costs
// you time — indecision is what actually costs you here, not weight. The only way to win is to
// actively walk out the exit with whatever you've chosen, at any point, before the room gives out.
// Never deciding to leave — not carrying too much — is the failure mode.
//
// Before the trial starts, the player can name 7–8 things they personally can't give up (see
// setPersonalItems); those replace the default keepsake set for that run, each rendered as an
// icon matched to what they typed, so the room reflects what THEY said they'd lose.

import { clamp, fitText } from '../engine2d.js';

const ROOM_TIME = 19;
const MAX_CARRY = 3;
const SWAP_PENALTY = 1.6;
const RULE_REVEAL_TIME = 4.5; // how long the "carry at most 3" rule stays on screen once play starts

const DEFAULT_ITEMS = [
  { label: 'photo', memory: 'the day you both laughed until it hurt', icon: 'photo', color: '#3fb6a8' },
  { label: 'toy', memory: 'the one you never let go of as a kid', icon: 'toy', color: '#e0b13c' },
  { label: 'letter', memory: 'words you never actually sent', icon: 'letter', color: '#9a7bc4' },
  { label: 'trophy', memory: 'a win nobody else remembers', icon: 'trophy', color: '#ffcf4d' },
  { label: 'blanket', memory: 'your first winter here', icon: 'blanket', color: '#4fbf78' },
  { label: 'music box', memory: 'a tune you can still hum', icon: 'music', color: '#e2542a' },
  { label: 'old book', memory: 'the last thing they gave you', icon: 'book', color: '#a06be0' },
];

const ICON_KEYWORDS = [
  [/photo|picture|pic\b|image|portrait|selfie|album|camera/, 'photo'],
  [/book|journal|diary|novel|notebook|notes?\b/, 'book'],
  [/toy|teddy|doll|figure|action figure|stuffed|plush/, 'toy'],
  [/letter|note\b|card\b|postcard/, 'letter'],
  [/trophy|medal|award|prize|certificate/, 'trophy'],
  [/blanket|quilt|scarf|shawl|sweater|pillow|cushion/, 'blanket'],
  [/music|song|guitar|piano|violin|instrument|mixtape|cd\b|headphone|speaker/, 'music'],
  [/ring|necklace|bracelet|jewel|earring/, 'ring'],
  [/phone|laptop|computer|tablet|ipad/, 'phone'],
  [/dog|cat|pet\b|hamster|bird|puppy|kitten/, 'pet'],
  [/plant|flower|garden|rose|bouquet/, 'plant'],
  [/\bkey\b|keys/, 'key'],
  [/game|console|controller|playstation|xbox/, 'game'],
  [/house|home\b|apartment|room\b/, 'house'],
  [/watch|clock/, 'watch'],
  [/glass(es)?|spectacles|sunglasses/, 'glasses'],
  [/shoe|sneaker|boot|sandal/, 'shoe'],
  [/bag|backpack|purse|suitcase/, 'bag'],
  [/candle|lamp\b/, 'candle'],
  [/cup\b|mug\b|coffee|tea\b/, 'cup'],
  [/car\b|bike|bicycle|scooter/, 'vehicle'],
  [/hat|cap\b/, 'hat'],
  [/painting|art\b|drawing|sketch/, 'art'],
  [/coin|money|cash|wallet/, 'coin'],
  [/umbrella/, 'umbrella'],
  [/shirt|dress|jacket|clothes|clothing|hoodie/, 'clothing'],
];
const ICON_COLORS = ['#3fb6a8', '#e0b13c', '#9a7bc4', '#ffcf4d', '#4fbf78', '#e2542a', '#a06be0', '#5fa8d3'];

// Real illustrated art for the common keepsake types (photo, book, etc.) — falls back to the
// procedural drawIcon() shapes below for the rarer keyword-matched types with no art yet.
const ICON_IMAGE_PATHS = {
  photo: 'assets/icons/keepsake_photo.png',
  book: 'assets/icons/keepsake_book.png',
  toy: 'assets/icons/keepsake_toy.png',
  letter: 'assets/icons/keepsake_letter.png',
  trophy: 'assets/icons/keepsake_trophy.png',
  blanket: 'assets/icons/keepsake_blanket.png',
  music: 'assets/icons/keepsake_music.png',
};
const ICON_IMAGES = {};
for (const [type, path] of Object.entries(ICON_IMAGE_PATHS)) {
  const img = new Image();
  img.src = path;
  ICON_IMAGES[type] = img;
}

function iconForLabel(label, index) {
  const lower = label.toLowerCase();
  let icon = 'tag'; // a generic labeled keepsake tag, used only when nothing more specific matches
  for (const [re, type] of ICON_KEYWORDS) { if (re.test(lower)) { icon = type; break; } }
  return {
    label: label.slice(0, 20),
    memory: `you said you couldn't leave "${label.slice(0, 30)}" behind — this is that moment`,
    icon, color: ICON_COLORS[index % ICON_COLORS.length],
  };
}

export const attachmentTrial = {
  id: 'attachment', name: 'Attachment', hue: '--hue-attachment',
  howTo: 'Your house is burning. Tap a keepsake to pick it up — tap it again to put it back — then tap the EXIT to walk out with whatever you\'re carrying, whenever you\'re ready. Waiting too long to decide is what loses this trial — the fire doesn\'t wait.',

  _personalItems: null,
  setPersonalItems(labels) {
    const clean = (labels || []).map(l => l.trim()).filter(Boolean);
    this._personalItems = clean.length >= 4 ? clean.slice(0, 8).map(iconForLabel) : null;
  },

  start(engine, onEnd) {
    const ITEMS = this._personalItems || DEFAULT_ITEMS;
    let ended = false;
    let timeLeft = ROOM_TIME;
    let carried = []; // indices into ITEMS, in pick-up order (oldest first)
    let selected = 0;
    let items = [];
    let exitPulse = 0;
    let penaltyFlash = 0;
    let pickPulse = 0;
    let embers = [];
    let emberTimer = 0;
    let elapsed = 0;

    function finish(won, reason) {
      if (ended) return;
      ended = true;
      onEnd({ won, score: carried.length, reason });
    }

    function layout() {
      const cols = 4;
      items = ITEMS.map((it, i) => {
        const row = Math.floor(i / cols), col = i % cols;
        const rowCount = row === 0 ? cols : ITEMS.length - cols;
        const marginX = engine.width * 0.14;
        const cellW = (engine.width - marginX * 2) / Math.max(1, (row === 0 ? cols : rowCount));
        return {
          ...it,
          x: marginX + cellW * (col + 0.5),
          y: engine.height * (row === 0 ? 0.28 : 0.5),
        };
      });
    }

    function toggle(index) {
      const at = carried.indexOf(index);
      if (at >= 0) {
        carried.splice(at, 1);
        pickPulse = 1;
        return;
      }
      if (carried.length < MAX_CARRY) {
        carried.push(index);
        pickPulse = 1;
        engine.burst(items[index].x, items[index].y, items[index].color, 12);
      } else {
        carried.shift(); // oldest pick goes back
        carried.push(index);
        timeLeft = Math.max(0, timeLeft - SWAP_PENALTY);
        penaltyFlash = 1;
        engine.shake(6);
      }
    }

    function nearestInDirection(dx, dy) {
      const cur = items[selected];
      if (!cur) return selected;
      let best = selected, bestScore = Infinity;
      items.forEach((it, i) => {
        if (i === selected) return;
        const ldx = it.x - cur.x, ldy = it.y - cur.y;
        const along = ldx * dx + ldy * dy;
        if (along <= 0) return;
        const across = Math.abs(ldx * dy - ldy * dx);
        const score = along + across * 1.5;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      return best;
    }

    layout();

    engine.start((dt) => {
      if (ended) return;
      timeLeft -= dt;
      elapsed += dt;
      exitPulse = (exitPulse + dt * 1.6) % 1;
      penaltyFlash = Math.max(0, penaltyFlash - dt * 2.5);
      pickPulse = Math.max(0, pickPulse - dt * 3);

      // rising embers — spawn faster and thicker as the collapse gets closer
      const urgency = clamp(1 - timeLeft / ROOM_TIME, 0, 1);
      emberTimer -= dt;
      if (emberTimer <= 0) {
        emberTimer = 0.12 - urgency * 0.07;
        embers.push({
          x: Math.random() * engine.width, y: engine.height + 6,
          vy: -(30 + Math.random() * 40) * (1 + urgency), vx: (Math.random() - 0.5) * 14,
          life: 1.4 + Math.random() * 1.2, age: 0, size: 1.5 + Math.random() * 2.5,
        });
      }
      for (const e of embers) { e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; }
      embers = embers.filter(e => e.age < e.life);

      const exitZone = { x: engine.width / 2, y: engine.height - 40, r: 34 };
      if (engine.pointer.justDown) {
        const { x, y } = engine.pointer;
        if (Math.hypot(x - exitZone.x, y - exitZone.y) < exitZone.r) {
          finish(true, 'walked-out');
          return;
        }
        let hitIndex = -1, hitDist = Infinity;
        items.forEach((it, i) => {
          const d = Math.hypot(it.x - x, it.y - y);
          if (d < 32 && d < hitDist) { hitIndex = i; hitDist = d; }
        });
        if (hitIndex >= 0) toggle(hitIndex);
      }
      if (engine.keyJustPressed('ArrowRight')) selected = nearestInDirection(1, 0);
      if (engine.keyJustPressed('ArrowLeft')) selected = nearestInDirection(-1, 0);
      if (engine.keyJustPressed('ArrowDown')) selected = nearestInDirection(0, 1);
      if (engine.keyJustPressed('ArrowUp')) selected = nearestInDirection(0, -1);
      if (engine.keyJustPressed('Space')) toggle(selected);
      if (engine.keyJustPressed('Enter')) { finish(true, 'walked-out'); return; }

      if (timeLeft <= 0) { finish(false, 'collapsed'); return; }

      draw(engine, { items, carried, selected, timeLeft, exitPulse, penaltyFlash, pickPulse, exitZone, embers, urgency, elapsed });
    });
  },

  stop(engine) { engine.stop(); },
};

function drawIcon(ctx, type, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1a0a20';
  ctx.lineWidth = 2;
  const s = size;
  switch (type) {
    case 'photo': {
      ctx.fillStyle = '#fff6ec';
      ctx.fillRect(-s, -s * 1.1, s * 2, s * 2.2);
      ctx.strokeRect(-s, -s * 1.1, s * 2, s * 2.2);
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.78, -s * 0.85, s * 1.56, s * 1.35);
      ctx.beginPath();
      ctx.moveTo(-s * 0.78, s * 0.5);
      ctx.lineTo(-s * 0.15, -s * 0.1);
      ctx.lineTo(s * 0.3, s * 0.25);
      ctx.lineTo(s * 0.78, -s * 0.3);
      ctx.lineTo(s * 0.78, s * 0.5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20,10,25,0.5)';
      ctx.fill();
      ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.45, s * 0.18, 0, Math.PI * 2); ctx.fillStyle = '#ffcf4d'; ctx.fill();
      break;
    }
    case 'book': {
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.9); ctx.lineTo(s, -s * 0.9); ctx.lineTo(s, s * 0.9);
      ctx.lineTo(0, s * 1.1); ctx.lineTo(-s, s * 0.9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,246,236,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.lineTo(0, s * 1.0); ctx.stroke();
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(0.15 * s, i * s * 0.35); ctx.lineTo(s * 0.75, i * s * 0.35 + s * 0.1); ctx.stroke();
      }
      break;
    }
    case 'toy': {
      ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-s * 0.5, -s * 1.0, s * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.5, -s * 1.0, s * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * 0.7, s * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'letter': {
      ctx.fillRect(-s, -s * 0.65, s * 2, s * 1.3);
      ctx.strokeRect(-s, -s * 0.65, s * 2, s * 1.3);
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.65); ctx.lineTo(0, s * 0.1); ctx.lineTo(s, -s * 0.65);
      ctx.strokeStyle = 'rgba(26,10,32,0.7)';
      ctx.stroke();
      break;
    }
    case 'trophy': {
      ctx.beginPath(); ctx.moveTo(-s * 0.55, -s); ctx.lineTo(s * 0.55, -s);
      ctx.lineTo(s * 0.35, s * 0.15); ctx.lineTo(-s * 0.35, s * 0.15); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-s * 0.75, -s * 0.7, s * 0.28, Math.PI * 0.3, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.7, s * 0.28, Math.PI * 1.6, Math.PI * 0.7, true); ctx.stroke();
      ctx.fillRect(-s * 0.18, s * 0.15, s * 0.36, s * 0.4);
      ctx.fillRect(-s * 0.4, s * 0.55, s * 0.8, s * 0.18);
      break;
    }
    case 'blanket': {
      ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4);
      ctx.strokeRect(-s, -s * 0.7, s * 2, s * 1.4);
      ctx.strokeStyle = 'rgba(255,246,236,0.45)'; ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.35, -s * 0.7); ctx.lineTo(i * s * 0.35, s * 0.7); ctx.stroke();
      }
      break;
    }
    case 'music': {
      ctx.fillRect(-s * 0.9, -s * 0.5, s * 1.8, s * 1.0);
      ctx.strokeRect(-s * 0.9, -s * 0.5, s * 1.8, s * 1.0);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a20'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      break;
    }
    case 'ring': {
      ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.62, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(-s * 0.3, -s * 0.1); ctx.lineTo(s * 0.3, -s * 0.1); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'phone': {
      ctx.fillRect(-s * 0.55, -s, s * 1.1, s * 2);
      ctx.strokeRect(-s * 0.55, -s, s * 1.1, s * 2);
      ctx.fillStyle = 'rgba(20,10,25,0.6)';
      ctx.fillRect(-s * 0.42, -s * 0.82, s * 0.84, s * 1.5);
      break;
    }
    case 'pet': {
      ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.7, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.35, s * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.68); ctx.lineTo(s * 0.4, -s * 1.05); ctx.lineTo(s * 0.55, -s * 0.72); ctx.closePath(); ctx.fill();
      break;
    }
    case 'plant': {
      ctx.fillRect(-s * 0.4, s * 0.15, s * 0.8, s * 0.7);
      ctx.strokeRect(-s * 0.4, s * 0.15, s * 0.8, s * 0.7);
      ctx.strokeStyle = '#4fbf78'; ctx.fillStyle = '#4fbf78'; ctx.lineWidth = 3;
      for (const a of [-0.5, 0, 0.5]) {
        ctx.beginPath(); ctx.moveTo(0, s * 0.15); ctx.quadraticCurveTo(a * s * 0.6, -s * 0.3, a * s * 0.3, -s * 0.9); ctx.stroke();
      }
      break;
    }
    case 'key': {
      ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.4, s * 0.4, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.1); ctx.lineTo(s * 0.7, s * 0.6); ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.45, s * 0.35); ctx.lineTo(s * 0.6, s * 0.2); ctx.stroke();
      break;
    }
    case 'game': {
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s, -s * 0.7, -s * 0.3, -s * 0.6);
      ctx.quadraticCurveTo(0, -s * 0.4, s * 0.3, -s * 0.6);
      ctx.quadraticCurveTo(s, -s * 0.7, s, 0);
      ctx.quadraticCurveTo(s, s * 0.7, s * 0.5, s * 0.55);
      ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s * 0.2);
      ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s * 0.5, s * 0.55);
      ctx.quadraticCurveTo(-s, s * 0.7, -s, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 'house': {
      ctx.beginPath(); ctx.moveTo(-s * 0.75, s * 0.1); ctx.lineTo(0, -s * 0.85); ctx.lineTo(s * 0.75, s * 0.1);
      ctx.lineTo(s * 0.75, s * 0.9); ctx.lineTo(-s * 0.75, s * 0.9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(20,10,25,0.6)';
      ctx.fillRect(-s * 0.2, s * 0.3, s * 0.4, s * 0.6);
      break;
    }
    case 'watch': {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a0a20'; ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.2, s * 0.08); ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.22, -s * 1.05, s * 0.44, s * 0.4);
      ctx.fillRect(-s * 0.22, s * 0.65, s * 0.44, s * 0.4);
      break;
    }
    case 'glasses': {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-s * 0.5, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.5, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.08, 0); ctx.lineTo(s * 0.08, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.92, -s * 0.05); ctx.lineTo(-s * 1.15, -s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.92, -s * 0.05); ctx.lineTo(s * 1.15, -s * 0.2); ctx.stroke();
      break;
    }
    case 'shoe': {
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.4); ctx.lineTo(-s, -s * 0.2); ctx.quadraticCurveTo(-s * 0.5, -s * 0.5, -s * 0.1, -s * 0.15);
      ctx.quadraticCurveTo(s * 0.3, s * 0.15, s, s * 0.1); ctx.quadraticCurveTo(s * 1.1, s * 0.4, s * 0.8, s * 0.45);
      ctx.lineTo(-s, s * 0.4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'bag': {
      ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.35, Math.PI, 0); ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillRect(-s * 0.75, -s * 0.5, s * 1.5, s * 1.25);
      ctx.strokeRect(-s * 0.75, -s * 0.5, s * 1.5, s * 1.25);
      break;
    }
    case 'candle': {
      ctx.fillRect(-s * 0.32, -s * 0.2, s * 0.64, s * 1.1);
      ctx.strokeRect(-s * 0.32, -s * 0.2, s * 0.64, s * 1.1);
      const grad = ctx.createRadialGradient(0, -s * 0.55, 1, 0, -s * 0.55, s * 0.4);
      grad.addColorStop(0, '#fff6ec'); grad.addColorStop(1, 'rgba(255,207,77,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s * 0.22, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cup': {
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(-s * 0.4, s * 0.6); ctx.lineTo(s * 0.4, s * 0.6);
      ctx.lineTo(s * 0.5, -s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.1, s * 0.28, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      break;
    }
    case 'vehicle': {
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.2); ctx.lineTo(-s * 0.6, -s * 0.35); ctx.lineTo(s * 0.6, -s * 0.35); ctx.lineTo(s, s * 0.2);
      ctx.lineTo(s, s * 0.45); ctx.lineTo(-s, s * 0.45); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a0a20';
      ctx.beginPath(); ctx.arc(-s * 0.55, s * 0.5, s * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.55, s * 0.5, s * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'hat': {
      ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * 0.95, s * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.3); ctx.quadraticCurveTo(0, -s * 0.9, s * 0.5, s * 0.3); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'art': {
      ctx.fillStyle = '#fff6ec';
      ctx.fillRect(-s, -s * 1.05, s * 2, s * 2.1);
      ctx.strokeRect(-s, -s * 1.05, s * 2, s * 2.1);
      ctx.fillStyle = color;
      ctx.fillRect(-s * 0.8, -s * 0.85, s * 1.6, s * 1.7);
      ctx.strokeStyle = 'rgba(20,10,25,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.2); ctx.quadraticCurveTo(-s * 0.2, -s * 0.5, s * 0.3, 0); ctx.quadraticCurveTo(s * 0.6, s * 0.4, s * 0.8, s * 0.1); ctx.stroke();
      break;
    }
    case 'coin': {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(20,10,25,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'umbrella': {
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.85, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.1); ctx.lineTo(0, s * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.9); ctx.quadraticCurveTo(s * 0.25, s * 0.9, s * 0.2, s * 0.65); ctx.stroke();
      break;
    }
    case 'clothing': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s); ctx.lineTo(s * 0.3, -s); ctx.lineTo(s * 0.3, -s * 0.7);
      ctx.lineTo(s, -s * 0.4); ctx.lineTo(s * 0.6, s * 0.05); ctx.lineTo(s * 0.35, -s * 0.15); ctx.lineTo(s * 0.35, s * 0.9);
      ctx.lineTo(-s * 0.35, s * 0.9); ctx.lineTo(-s * 0.35, -s * 0.15); ctx.lineTo(-s * 0.6, s * 0.05);
      ctx.lineTo(-s, -s * 0.4); ctx.lineTo(-s * 0.3, -s * 0.7); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    default: { // tag — a generic labeled keepsake, used only when nothing more specific matched
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.2);
      ctx.lineTo(s * 0.2, -s * 0.9);
      ctx.lineTo(s * 0.95, -s * 0.15);
      ctx.lineTo(s * 0.15, s * 0.95);
      ctx.lineTo(-s * 0.9, s * 0.2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.15, -s * 0.55, s * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a20'; ctx.fill();
    }
  }
}

function draw(engine, s) {
  const ctx = engine.ctx;
  const w = engine.width, h = engine.height;
  const urgency = s.urgency;

  const flicker = 0.5 + Math.sin(performance.now() / 90) * 0.5;
  ctx.fillStyle = `rgba(226,84,42,${0.05 + urgency * 0.2 + s.penaltyFlash * 0.12 + flicker * urgency * 0.05})`;
  ctx.fillRect(0, 0, w, h);

  // fire silhouette along the bottom edge, thickening as the collapse nears
  const flameH = h * (0.05 + urgency * 0.16);
  const grad = ctx.createLinearGradient(0, h - flameH, 0, h);
  grad.addColorStop(0, 'rgba(226,84,42,0)');
  grad.addColorStop(0.6, `rgba(226,84,42,${0.25 + urgency * 0.3})`);
  grad.addColorStop(1, `rgba(255,207,77,${0.35 + urgency * 0.35})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  const teeth = 10;
  for (let i = 0; i <= teeth; i++) {
    const x = (w / teeth) * i;
    const wob = Math.sin(performance.now() / 140 + i * 1.7) * flameH * 0.25;
    ctx.lineTo(x, h - flameH + wob);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // rising embers
  for (const e of s.embers) {
    const t = 1 - e.age / e.life;
    ctx.globalAlpha = Math.max(0, t) * 0.8;
    ctx.fillStyle = '#ffcf4d';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size * t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // an explicit "the house is burning" banner for the first couple of seconds, then the fire
  // itself does the talking — after that, the rule you actually need takes its place
  ctx.textAlign = 'center';
  if (s.elapsed < 2.4) {
    const bannerAlpha = s.elapsed < 2 ? 1 : (2.4 - s.elapsed) / 0.4;
    ctx.font = '700 16px Mulish, sans-serif';
    ctx.fillStyle = `rgba(255,150,110,${bannerAlpha * 0.95})`;
    ctx.fillText('your house is burning', w / 2, h * 0.12);
  } else if (s.elapsed < RULE_REVEAL_TIME) {
    const hintAlpha = s.elapsed > RULE_REVEAL_TIME - 0.5 ? (RULE_REVEAL_TIME - s.elapsed) / 0.5 : 1;
    ctx.font = '600 15px Mulish, sans-serif';
    ctx.fillStyle = `rgba(255,246,236,${hintAlpha * 0.9})`;
    ctx.fillText('you can only carry 3 — choose, then get out', w / 2, h * 0.12);
  }

  // items on shelves — each rendered as an icon matching what it represents
  s.items.forEach((it, i) => {
    const isCarried = s.carried.includes(i);
    const bump = (isCarried && s.pickPulse > 0) ? 1 + s.pickPulse * 0.2 : 1;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.scale(bump, bump);
    const img = ICON_IMAGES[it.icon];
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, -20, -20, 40, 40);
    } else {
      drawIcon(ctx, it.icon, 18, it.color);
    }
    if (isCarried) {
      ctx.strokeStyle = '#ffcf4d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (i === s.selected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.font = '600 13px Mulish, sans-serif';
    ctx.fillStyle = 'rgba(255,246,236,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(it.label, it.x, it.y + 46);
  });

  // carried tray
  ctx.font = '700 15px Mulish, sans-serif';
  ctx.fillStyle = 'rgba(255,246,236,0.9)';
  ctx.fillText(`carrying ${s.carried.length}/${MAX_CARRY}`, w / 2, h - 90);
  if (s.carried[0] !== undefined) {
    const memory = s.items[s.carried[s.carried.length - 1]]?.memory;
    if (memory) {
      const memoryText = `"${memory}"`;
      fitText(ctx, memoryText, w - 40, 14);
      ctx.fillStyle = 'rgba(255,207,77,0.9)';
      ctx.fillText(memoryText, w / 2, h - 74);
    }
  }

  // exit zone
  const pulseR = s.exitZone.r + Math.sin(s.exitPulse * Math.PI * 2) * 3;
  ctx.beginPath();
  ctx.arc(s.exitZone.x, s.exitZone.y, pulseR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(79,191,120,0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,246,236,0.9)';
  ctx.font = '13px Mulish, sans-serif';
  ctx.fillText('EXIT', s.exitZone.x, s.exitZone.y + 5);

  // collapse timer
  const remain = clamp(s.timeLeft / ROOM_TIME, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(16, 16, w - 32, 6);
  ctx.fillStyle = remain < 0.25 ? '#e2542a' : '#3fb6a8';
  ctx.fillRect(16, 16, (w - 32) * remain, 6);
}
