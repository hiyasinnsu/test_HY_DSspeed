import { FIELD } from '../game/config.js';

export class Input {
  constructor() {
    this.el = null;
    this.rect = null;
    this.pointers = new Map();
    this.primaryId = null;
    this.lastX = 0;
    this.lastY = 0;
    this.touchX = 0;
    this.touchY = 0;
    this.keys = new Set();
    this.bombQueued = false;
    this.onPause = null;
    this.onAnyKey = null;
    this.enabled = false;

    this.handleDown = this.handleDown.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleUp = this.handleUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  attach(el) {
    this.el = el;
    el.addEventListener('pointerdown', this.handleDown, { passive: false });
    el.addEventListener('pointermove', this.handleMove, { passive: false });
    el.addEventListener('pointerup', this.handleUp, { passive: false });
    el.addEventListener('pointercancel', this.handleUp, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
  }

  setRect(rect) {
    this.rect = rect;
  }

  toField(dx, dy) {
    const rect = this.rect || (this.el ? this.el.getBoundingClientRect() : null);
    if (!rect || rect.width === 0) return { x: 0, y: 0 };
    return { x: (dx * FIELD.w) / rect.width, y: (dy * FIELD.h) / rect.height };
  }

  handleDown(e) {
    if (!this.enabled) return;
    e.preventDefault();
    if (this.el && this.el.setPointerCapture) {
      try {
        this.el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best effort */
      }
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.primaryId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }

  handleMove(e) {
    if (!this.enabled || !this.pointers.has(e.pointerId)) return;
    e.preventDefault();
    const p = this.pointers.get(e.pointerId);
    p.x = e.clientX;
    p.y = e.clientY;
    if (e.pointerId !== this.primaryId) return;
    const d = this.toField(e.clientX - this.lastX, e.clientY - this.lastY);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const cap = 80;
    this.touchX += Math.max(-cap, Math.min(cap, d.x));
    this.touchY += Math.max(-cap, Math.min(cap, d.y));
  }

  handleUp(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.primaryId === e.pointerId) {
      this.primaryId = null;
      const rest = this.pointers.entries().next();
      if (!rest.done) {
        this.primaryId = rest.value[0];
        this.lastX = rest.value[1].x;
        this.lastY = rest.value[1].y;
      }
    }
  }

  handleKeyDown(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') {
      e.preventDefault();
    }
    if (!e.repeat) {
      if (k === 'z' || k === 'x' || k === ' ') this.bombQueued = true;
      if (k === 'p' || k === 'Escape') {
        if (this.onPause) this.onPause();
      }
      if (this.onAnyKey) this.onAnyKey(k);
    }
    this.keys.add(k);
  }

  handleKeyUp(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keys.delete(k);
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('w')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('s')) y += 1;
    return { x, y };
  }

  get focus() {
    return this.keys.has('Shift') || this.pointers.size >= 2;
  }

  release() {
    this.pointers.clear();
    this.primaryId = null;
    this.touchX = 0;
    this.touchY = 0;
    this.keys.clear();
  }
}
