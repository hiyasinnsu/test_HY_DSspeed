import { ENEMY_SPRITE, B, FIELD } from './config.js';
import * as P from './patterns.js';

export function addDiver(w, opts = {}) {
  const {
    x = FIELD.w / 2, delay = 0, hp = 9, sway = 62, vy = 1.5,
    fireEvery = 76, count = 1, style = B.ORB_C, score = 130, sprite = ENEMY_SPRITE.DRONE,
    color = '#ff8fe0',
  } = opts;
  const e = w.spawnEnemy({ x, y: -36, r: 15, hp, score, sprite, color });
  e.update = (en, world) => {
    en.y += vy;
    en.x = x + Math.sin(en.t * 0.035 + delay) * sway;
    if (en.y > 30 && en.t % world.every(fireEvery) === 0) {
      P.aimed(world, en.x, en.y + 8, { count, spread: 0.2, speed: 2.7, style });
    }
    if (en.y > FIELD.h + 50) en.dead = true;
  };
  return e;
}

export function addSweeper(w, opts = {}) {
  const {
    fromLeft = true, y = 230, hp = 26, speed = 2.2, score = 320,
    fireEvery = 62, count = 3, style = B.ORB_Y,
  } = opts;
  const dir = fromLeft ? 1 : -1;
  const e = w.spawnEnemy({
    x: fromLeft ? -40 : FIELD.w + 40, y, r: 17, hp, score,
    sprite: ENEMY_SPRITE.DART, color: '#8dffb0',
  });
  e.angle = fromLeft ? 0 : Math.PI;
  e.update = (en, world) => {
    en.x += dir * speed;
    en.y += Math.sin(en.t * 0.028) * 0.8;
    en.angle = dir > 0 ? 0 : Math.PI;
    if (en.t % world.every(fireEvery) === 0) {
      P.aimed(world, en.x, en.y, { count, spread: 0.22, speed: 3.0, style });
    }
    if (en.x < -70 || en.x > FIELD.w + 70) en.dead = true;
  };
  return e;
}

export function addTurret(w, opts = {}) {
  const {
    x = FIELD.w / 2, targetY = 210, hp = 68, stay = 480, score = 520,
    ringCount = 12, style = B.ORB_O,
  } = opts;
  const e = w.spawnEnemy({
    x, y: -46, r: 21, hp, score, sprite: ENEMY_SPRITE.TURRET, color: '#ffb066',
  });
  e.update = (en, world) => {
    if (en.y < targetY) {
      en.y += 1.9;
      return;
    }
    if (en.t < stay) {
      en.x = x + Math.sin(en.t * 0.02) * 26;
      if (en.t % world.every(66) === 0) {
        P.ring(world, en.x, en.y, { count: ringCount, speed: 2.25, style, offset: en.t * 0.05 });
      }
      if (en.t % world.every(104) === 52) {
        P.aimed(world, en.x, en.y, { count: 3, spread: 0.2, speed: 3.4, style: B.ORB_Y });
      }
    } else {
      en.y -= 2.5;
      if (en.y < -70) en.dead = true;
    }
  };
  return e;
}

export function addOrbiter(w, opts = {}) {
  const { cx = FIELD.w / 2, cy = 250, radius = 130, hp = 90, score = 900 } = opts;
  const e = w.spawnEnemy({
    x: cx, y: -40, r: 22, hp, score, sprite: ENEMY_SPRITE.ORB, color: '#8fd0ff',
  });
  e.update = (en, world) => {
    if (en.y < cy) {
      en.y += 1.6;
      return;
    }
    en.x = cx + Math.cos(en.t * 0.014) * radius;
    en.y = cy + Math.sin(en.t * 0.028) * 40;
    if (en.t % world.every(54) === 0) {
      P.ring(world, en.x, en.y, { count: 9, speed: 2.0, style: B.RING_V, offset: en.t * 0.07 });
    }
    if (en.t % world.every(140) === 70) {
      P.aimed(world, en.x, en.y, { count: 4, spread: 0.16, speed: 3.6, style: B.ORB_B });
    }
  };
  return e;
}

export function addMidboss(w, opts = {}) {
  const { x = FIELD.w / 2, y = 215 } = opts;
  const hp = Math.round(360 * w.diff.bossHp);
  const e = w.spawnEnemy({
    x, y: -90, r: 46, hp, score: 15000,
    sprite: ENEMY_SPRITE.MIDBOSS, color: '#c39bff', name: '中ボス',
  });
  e.showHp = true;
  w.midboss = e;
  e.update = (en, world) => {
    if (en.y < y - 4) {
      en.y += 1.5;
      return;
    }
    en.x = FIELD.w / 2 + Math.sin(en.t * 0.012) * 100;
    en.y = y + Math.sin(en.t * 0.02) * 18;
    if (en.t % world.every(13) === 0) {
      P.aimed(world, en.x, en.y + 22, { count: 3, spread: 0.15, speed: 3.1, style: B.ORB_M });
    }
    if (en.t % world.every(92) === 46) {
      P.ring(world, en.x, en.y, { count: 16, speed: 2.2, style: B.RICE_C, offset: en.t * 0.03 });
    }
    if (en.t % world.every(28) === 14) {
      P.shot(world, en.x - 42, en.y, Math.PI / 2 - 0.4, 2.9, B.ORB_Y);
      P.shot(world, en.x + 42, en.y, Math.PI / 2 + 0.4, 2.9, B.ORB_Y);
    }
  };
  e.onDeath = (world, en) => {
    world.clearBullets(en.x, en.y, 620, false);
    world.banner('中ボス撃破', 1.8, '#c39bff');
    world.addScore(9000);
    world.sfx('phase');
    world.addRing(en.x, en.y, 30, 520, 54, '#d7b6ff');
  };
  return e;
}

export function addSpinner(w, opts = {}) {
  const { x = FIELD.w / 2, y = 200, hp = 120, score = 1400 } = opts;
  const e = w.spawnEnemy({
    x, y: -50, r: 24, hp, score,
    sprite: ENEMY_SPRITE.ORB, color: '#ffd166',
  });
  e.update = (en, world) => {
    if (en.y < y) {
      en.y += 1.7;
      return;
    }
    en.x = x + Math.cos(en.t * 0.03) * 90;
    if (en.t % world.every(6) === 0) {
      const a = en.t * 0.31;
      P.shot(world, en.x, en.y, a, 2.4, B.RICE_M, { curve: 0.004 });
      P.shot(world, en.x, en.y, a + Math.PI, 2.4, B.RICE_M, { curve: 0.004 });
    }
    if (en.t > 900) en.dead = true;
  };
  return e;
}
