// Shared 2D engine: one canvas, reused by all six trials (TRD "one shared 2D canvas engine, six configs").
// Provides: sizing, a normalized pointer+keyboard input stream, particle bursts, screen shake, a run loop.

export const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Settings-panel quality toggle (low particle density for weaker devices) — same reduction path as reducedMotion.
let lowQuality = false;
export function setLowQuality(v) { lowQuality = v; }

export class Engine2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.particles = [];
    this.shakeMag = 0;
    this.shakeOffset = { x: 0, y: 0 };

    this.pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, dx: 0, dy: 0 };
    this.keys = new Set();
    this.keysJustDown = new Set();

    this._running = false;
    this._lastT = 0;
    this._onFrame = null;

    this._resize = this._resize.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._tick = this._tick.bind(this);

    window.addEventListener('resize', this._resize);
    this._resize();
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _pointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  _onPointerDown(e) {
    e.preventDefault();
    const p = this._pointerPos(e);
    this.pointer.x = p.x; this.pointer.y = p.y;
    this.pointer.down = true; this.pointer.justDown = true;
  }
  _onPointerMove(e) {
    const p = this._pointerPos(e);
    this.pointer.dx = p.x - this.pointer.x;
    this.pointer.dy = p.y - this.pointer.y;
    this.pointer.x = p.x; this.pointer.y = p.y;
  }
  _onPointerUp(e) {
    this.pointer.down = false; this.pointer.justUp = true;
  }
  _onKeyDown(e) {
    if (!this.keys.has(e.code)) this.keysJustDown.add(e.code);
    this.keys.add(e.code);
  }
  _onKeyUp(e) { this.keys.delete(e.code); }

  attachInput() {
    const c = this.canvas;
    c.addEventListener('mousedown', this._onPointerDown);
    c.addEventListener('mousemove', this._onPointerMove);
    window.addEventListener('mouseup', this._onPointerUp);
    c.addEventListener('touchstart', this._onPointerDown, { passive: false });
    c.addEventListener('touchmove', this._onPointerMove, { passive: false });
    c.addEventListener('touchend', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detachInput() {
    const c = this.canvas;
    c.removeEventListener('mousedown', this._onPointerDown);
    c.removeEventListener('mousemove', this._onPointerMove);
    window.removeEventListener('mouseup', this._onPointerUp);
    c.removeEventListener('touchstart', this._onPointerDown);
    c.removeEventListener('touchmove', this._onPointerMove);
    c.removeEventListener('touchend', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  resize() { this._resize(); }

  start(onFrame) {
    this._onFrame = onFrame;
    this._running = true;
    this._lastT = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    this.particles.length = 0;
    this.keys.clear();
    this.keysJustDown.clear();
    this.pointer.down = false;
    this.pointer.justDown = false;
    this.pointer.justUp = false;
  }

  _tick(t) {
    if (!this._running) return;
    let dt = (t - this._lastT) / 1000;
    dt = Math.min(dt, 1 / 20);
    this._lastT = t;

    this._updateShake(dt);
    this._updateParticles(dt);

    this.ctx.save();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    if (this._onFrame) this._onFrame(dt);

    this._drawParticles();
    this.ctx.restore();

    this.pointer.justDown = false;
    this.pointer.justUp = false;
    this.pointer.dx = 0; this.pointer.dy = 0;
    this.keysJustDown.clear();

    requestAnimationFrame(this._tick);
  }

  keyJustPressed(code) { return this.keysJustDown.has(code); }
  keyDown(code) { return this.keys.has(code); }

  shake(mag) {
    this.shakeMag = Math.max(this.shakeMag, (reducedMotion || lowQuality) ? mag * 0.25 : mag);
  }
  _updateShake(dt) {
    this.shakeMag *= Math.max(0, 1 - dt * 6);
    if (this.shakeMag < 0.05) { this.shakeMag = 0; this.shakeOffset.x = 0; this.shakeOffset.y = 0; return; }
    this.shakeOffset.x = (Math.random() - 0.5) * this.shakeMag;
    this.shakeOffset.y = (Math.random() - 0.5) * this.shakeMag;
  }

  burst(x, y, color, count = 16) {
    const n = (reducedMotion || lowQuality) ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.4 + Math.random() * 0.4, age: 0,
        color, size: 2 + Math.random() * 3,
      });
    }
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
    }
    this.particles = this.particles.filter(p => p.age < p.life);
  }

  _drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Canvas text never wraps on its own — a long line just runs off the edge of a narrow canvas.
// This shrinks the font (down to a floor) until the string fits maxWidth, so labels stay fully
// visible and legible instead of clipping off-screen on smaller trial canvases.
export function fitText(ctx, text, maxWidth, basePx, family = 'Mulish, sans-serif', weight = '') {
  let px = basePx;
  const minPx = Math.max(9, basePx * 0.55);
  ctx.font = `${weight} ${px}px ${family}`.trim();
  while (px > minPx && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`.trim();
  }
  return px;
}
