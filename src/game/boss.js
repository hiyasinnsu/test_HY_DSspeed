import { FIELD, B } from './config.js';
import { TAU } from '../core/math.js';
import * as P from './patterns.js';

const PHASES = [
  { name: '序曲「青の扇」', hp: 230, time: 34, pattern: phaseFan },
  { name: '螺旋「星屑の渦」', hp: 260, time: 36, pattern: phaseSpiral },
  { name: '終曲「終焉の雨」', hp: 300, time: 38, pattern: phaseRain },
];

export const BOSS_PHASE_COUNT = PHASES.length;

export function createBoss(w) {
  const b = {
    x: FIELD.w / 2,
    y: -140,
    r: 54,
    hp: 0,
    maxHp: 1,
    phase: 0,
    t: 0,
    phaseTime: 0,
    state: 'enter',
    timer: 0,
    phaseName: '',
    flash: 0,
    color: '#ff9fb4',
  };
  enterPhase(w, b, 0);
  return b;
}

function enterPhase(w, b, i) {
  const ph = PHASES[i];
  b.phase = i;
  b.maxHp = Math.round(ph.hp * w.diff.bossHp);
  b.hp = b.maxHp;
  b.phaseTime = Math.round(ph.time * 60);
  b.phaseName = ph.name;
  b.t = 0;
  b.state = 'enter';
}

export function updateBoss(w) {
  const b = w.boss;
  if (!b) return;
  if (b.flash > 0) b.flash--;

  if (b.state === 'enter') {
    b.y += (172 - b.y) * 0.07;
    b.x += (FIELD.w / 2 - b.x) * 0.06;
    if (b.y > 169) {
      b.y = 172;
      b.state = 'fight';
      b.t = 0;
      w.banner(b.phaseName, 2.2, '#ffd2a8');
      w.sfx('phase');
    }
    return;
  }

  if (b.state === 'fight') {
    b.t++;
    b.x = FIELD.w / 2 + Math.sin(b.t * 0.0085) * 118;
    b.y = 172 + Math.sin(b.t * 0.017) * 22;
    PHASES[b.phase].pattern(w, b);
    b.phaseTime--;
    if (b.phaseTime <= 0) endPhase(w, b, false);
    return;
  }

  if (b.state === 'transition') {
    b.timer--;
    b.y = Math.max(120, b.y - 0.8);
    if (b.timer <= 0) {
      if (b.phase >= PHASES.length - 1) beginDying(w, b);
      else {
        enterPhase(w, b, b.phase + 1);
        b.y = 130;
      }
    }
    return;
  }

  if (b.state === 'dying') {
    b.timer--;
    if (b.timer % 7 === 0) {
      const a = w.rand() * TAU;
      const r = w.rand() * 74;
      const x = b.x + Math.cos(a) * r;
      const y = b.y + Math.sin(a) * r;
      w.addParticles(x, y, '#ffd7a8', 6, 4.2, 4);
      w.addRing(x, y, 8, 96, 26, '#ffd7a8');
      w.addShake(6);
      w.sfx('explosion');
      w.addScore(600);
    }
    if (b.timer <= 0) {
      b.state = 'dead';
      b.hp = 0;
      w.onBossDefeated();
    }
  }
}

export function damageBoss(w, dmg) {
  const b = w.boss;
  if (!b || b.state !== 'fight') return false;
  b.hp -= dmg;
  b.flash = 2;
  if (b.hp <= 0) {
    b.hp = 0;
    endPhase(w, b, true);
  }
  return true;
}

function endPhase(w, b, destroyed) {
  const bonus = destroyed ? 20000 + Math.max(0, b.phaseTime) * 60 : 4000;
  w.addScore(bonus);
  w.banner(destroyed ? `PHASE CLEAR  +${bonus}` : 'TIME UP', 1.8, destroyed ? '#ffe9a8' : '#9fb4ff');
  w.clearBullets(b.x, b.y, 1400, false);
  w.addRing(b.x, b.y, 24, 720, 62, '#ffe0b0');
  w.addShake(16);
  w.sfx('phase');
  b.state = 'transition';
  b.timer = 82;
  b.hp = 0;
}

function beginDying(w, b) {
  b.state = 'dying';
  b.timer = 150;
  b.hp = 0;
  w.clearBullets(b.x, b.y, 1400, false);
  w.addShake(26);
  w.addScore(50000);
  w.banner('BOSS DOWN', 2.4, '#ffd0a0');
  w.sfx('phase');
}

function phaseFan(w, b) {
  const t = b.t;
  const fanIv = w.every(11);
  if (t % fanIv === 0) {
    const n = 3 + Math.round(w.diff.fireRate * 2);
    P.aimed(w, b.x, b.y + 26, { count: n, spread: 0.17, speed: 3.3, style: B.ORB_C });
  }
  const ringIv = w.every(76);
  if (t % ringIv === ringIv >> 1) {
    P.ring(w, b.x, b.y, { count: 20, speed: 2.5, style: B.ORB_M, offset: t * 0.014 });
  }
  const sideIv = w.every(32);
  if (t % sideIv === sideIv >> 1) {
    P.shot(w, b.x - 58, b.y, Math.PI / 2 - 0.22, 2.9, B.RICE_C);
    P.shot(w, b.x + 58, b.y, Math.PI / 2 + 0.22, 2.9, B.RICE_C);
  }
}

function phaseSpiral(w, b) {
  const t = b.t;
  const iv = w.every(4);
  if (t % iv === 0) {
    const arms = w.difficultyKey === 'easy' ? 2 : 3;
    const a = t * 0.19;
    for (let i = 0; i < arms; i++) {
      P.shot(w, b.x, b.y, a + (i * TAU) / arms, 2.55, B.RICE_C, { curve: 0.0055, life: 330 });
    }
  }
  const needleIv = w.every(112);
  if (t % needleIv === 0) {
    P.aimed(w, b.x, b.y, { count: 5, spread: 0.2, speed: 4.2, style: B.NEEDLE_G });
  }
  const ringIv = w.every(58);
  if (t % ringIv === 0) {
    P.ring(w, b.x, b.y, { count: 14, speed: 1.9, style: B.ORB_V, offset: -t * 0.02 });
  }
}

function phaseRain(w, b) {
  const t = b.t;
  const rainIv = w.every(9);
  if (t % rainIv === 0) {
    P.rain(w, { count: 2, speed: 2.9, style: B.RICE_Y });
  }
  const ringIv = w.every(48);
  if (t % ringIv === ringIv >> 1) {
    P.ring(w, b.x, b.y, { count: 24, speed: 2.1, style: B.ORB_B, offset: t * 0.03 });
  }
  const aimIv = w.every(26);
  if (t % aimIv === 0) {
    P.aimed(w, b.x, b.y + 20, { count: 2, spread: 0.12, speed: 4, style: B.NEEDLE_G });
  }
  const wallIv = w.every(124);
  if (t % wallIv === wallIv >> 1) {
    for (let i = 0; i < 5; i++) {
      P.shot(w, 80 + i * 95, -20, Math.PI / 2 + 0.05, 1.7, B.ORB_R);
    }
  }
}
