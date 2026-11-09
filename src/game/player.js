import { FIELD, PLAYER } from './config.js';
import { clamp } from '../core/math.js';

export function createPlayer() {
  return {
    x: PLAYER.startX,
    y: PLAYER.startY,
    bank: 0,
    focus: false,
    invuln: 90,
    shotCd: 0,
    bombCd: 0,
    fireAnim: 0,
  };
}

// Touch input arrives as a pixel delta gathered since the previous tick; the
// ship may never move faster than its speed, so a fast flick still respects
// the tuning while small finger adjustments stay precise.
export function updatePlayer(w) {
  const p = w.player;
  const inp = w.input;
  const focus = !!(inp.focus || inp.keyFocus);
  p.focus = focus;
  const speed = focus ? PLAYER.focusSpeed : PLAYER.speed;
  let mx = 0;
  let my = 0;
  if (inp.keyX || inp.keyY) {
    mx = inp.keyX;
    my = inp.keyY;
    const l = Math.hypot(mx, my);
    if (l > 1) {
      mx /= l;
      my /= l;
    }
    mx *= speed;
    my *= speed;
  } else {
    const tx = inp.touchX;
    const ty = inp.touchY;
    const l = Math.hypot(tx, ty);
    if (l > 0.01) {
      const s = Math.min(l, speed);
      mx = (tx / l) * s;
      my = (ty / l) * s;
    }
  }
  inp.touchX = 0;
  inp.touchY = 0;

  p.x = clamp(p.x + mx, PLAYER.marginX, FIELD.w - PLAYER.marginX);
  p.y = clamp(p.y + my, PLAYER.marginTop, FIELD.h - PLAYER.marginBottom);
  p.bank += (mx / speed - p.bank) * 0.25;

  if (p.invuln > 0) p.invuln--;
  if (p.bombCd > 0) p.bombCd--;
  if (p.fireAnim > 0) p.fireAnim--;

  p.shotCd--;
  if (p.shotCd <= 0) {
    p.shotCd = PLAYER.shotInterval;
    fire(w, p);
  }

  if (inp.bomb) {
    inp.bomb = false;
    tryBomb(w);
  }
}

function fire(w, p) {
  const dmg = PLAYER.shotDmg;
  w.addShot(p.x - 3.6, p.y - 14, 0, -19, dmg, 3.4);
  w.addShot(p.x + 3.6, p.y - 14, 0, -19, dmg, 3.4);
  w.addShot(p.x - 19, p.y - 5, 0.8, -18.4, dmg, 3.0);
  w.addShot(p.x + 19, p.y - 5, -0.8, -18.4, dmg, 3.0);
  p.fireAnim = 3;
  w.sfx('shot');
}

export function tryBomb(w) {
  const p = w.player;
  if (w.state !== 'playing' || w.bombs <= 0 || p.bombCd > 0) return false;
  w.bombs--;
  p.bombCd = 24;
  p.invuln = Math.max(p.invuln, PLAYER.bombInvuln);
  w.bomb = { x: p.x, y: p.y, t: 0, dur: 110, r: 24 };
  w.addRing(p.x, p.y, 20, 360, 46, '#9fe9ff');
  w.addShake(14);
  w.sfx('bomb');
  w.banner('SPELL BOMB', 1.1, '#9fe9ff');
  return true;
}

export function updateBomb(w) {
  const b = w.bomb;
  if (!b) return;
  b.t++;
  const t = Math.min(1, b.t / (b.dur * 0.55));
  b.r = 30 + 430 * t;
  w.clearBullets(b.x, b.y, b.r, true);
  w.damageArea(b.x, b.y, b.r, 1.1);
  if (b.t >= b.dur) w.bomb = null;
}

export function playerHit(w) {
  const p = w.player;
  if (w.state !== 'playing' || p.invuln > 0) return;
  w.lives--;
  w.clearBullets(p.x, p.y, 210, false);
  w.addRing(p.x, p.y, 12, 220, 30, '#ff8fa0');
  w.addShake(20);
  w.sfx('death');
  if (w.lives <= 0) {
    w.finish(false);
    return;
  }
  p.invuln = PLAYER.invulnTicks;
  p.x = PLAYER.startX;
  p.y = PLAYER.startY;
  p.bank = 0;
  p.shotCd = 0;
  w.banner('MISS', 1.2, '#ff9aa8');
}
