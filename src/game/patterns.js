import { TAU } from '../core/math.js';
import { B } from './config.js';

export function aimedAngle(w, x, y) {
  const p = w.player;
  return Math.atan2(p.y - y, p.x - x);
}

export function shot(w, x, y, angle, speed, style, extra) {
  if (!w.canFire()) return null;
  const sp = speed * w.diff.bulletSpeed;
  return w.addEnemyBullet(x, y, Math.cos(angle) * sp, Math.sin(angle) * sp, style, extra);
}

export function fan(w, x, y, center, opts = {}) {
  const { count = 1, spread = 0.16, speed = 3, style = B.ORB_C, ...extra } = opts;
  if (!w.canFire()) return;
  const start = count > 1 ? center - ((count - 1) / 2) * spread : center;
  for (let i = 0; i < count; i++) {
    shot(w, x, y, start + i * spread, speed, style, extra);
  }
}

export function ring(w, x, y, opts = {}) {
  const { count = 12, speed = 2.4, style = B.ORB_M, offset = 0, ...extra } = opts;
  if (!w.canFire()) return;
  const step = TAU / count;
  for (let i = 0; i < count; i++) {
    shot(w, x, y, offset + i * step, speed, style, extra);
  }
}

export function rain(w, opts = {}) {
  const { count = 1, speed = 2.6, style = B.RICE_Y, top = -20 } = opts;
  if (!w.canFire()) return;
  for (let i = 0; i < count; i++) {
    const x = 18 + w.rand() * (w.field.w - 36);
    shot(w, x, top, Math.PI / 2 + (w.rand() - 0.5) * 0.25, speed, style, {});
  }
}

export function aimed(w, x, y, opts = {}) {
  fan(w, x, y, aimedAngle(w, x, y), opts);
}
