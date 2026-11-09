import { FIELD, TICK, B } from './config.js';
import { addDiver, addSweeper, addTurret, addOrbiter, addMidboss, addSpinner } from './enemies.js';
import { createBoss } from './boss.js';

const BOSS_GATE = 60;
const BOSS_FORCE = 70;

function buildTimeline() {
  const list = [];
  const add = (at, fn) => list.push({ at, fn });

  add(1.6, (w) => {
    for (let i = 0; i < 5; i++) addDiver(w, { x: 90 + i * 90, delay: i * 0.9, sway: 44, hp: 9 });
  });
  add(5.2, (w) => {
    for (let i = 0; i < 5; i++) {
      addDiver(w, {
        x: FIELD.w - 95 - i * 85, delay: i * 0.8, sway: 56, hp: 10,
        count: w.difficultyKey === 'easy' ? 1 : 2, style: B.ORB_Y,
      });
    }
  });
  add(9.2, (w) => {
    addSweeper(w, { fromLeft: true, y: 210 });
    addSweeper(w, { fromLeft: false, y: 268 });
  });
  add(11.6, (w) => {
    addSweeper(w, { fromLeft: true, y: 300 });
    addSweeper(w, { fromLeft: false, y: 236 });
  });
  add(14.6, (w) => {
    addTurret(w, { x: 140, targetY: 200 });
    addTurret(w, { x: FIELD.w - 140, targetY: 262 });
  });
  add(19.4, (w) => {
    addSpinner(w, { x: 176, y: 190 });
  });
  add(23.2, (w) => {
    for (let i = 0; i < 6; i++) {
      addDiver(w, { x: 70 + i * 80, delay: i, sway: 28, vy: 1.9, hp: 8, fireEvery: 62 });
    }
  });
  add(27.6, (w) => {
    addTurret(w, { x: FIELD.w / 2, targetY: 176, ringCount: 16 });
    addSweeper(w, { fromLeft: true, y: 322 });
  });
  add(32.0, (w) => {
    addOrbiter(w, { cx: 158, cy: 250, radius: 92 });
    addOrbiter(w, { cx: FIELD.w - 158, cy: 250, radius: 92 });
  });
  add(37.2, (w) => {
    addSpinner(w, { x: FIELD.w - 168, y: 200 });
    for (let i = 0; i < 4; i++) addDiver(w, { x: 110 + i * 100, delay: i * 1.2, sway: 40, hp: 10 });
  });
  add(43.0, (w) => {
    addMidboss(w);
  });
  add(58.0, (w) => {
    for (let i = 0; i < 3; i++) addSweeper(w, { fromLeft: i % 2 === 0, y: 150 + i * 80 });
  });

  list.sort((a, b) => a.at - b.at);
  return list;
}

export function createStage(world) {
  const timeline = buildTimeline(world.diff);
  let index = 0;
  let bossSpawned = false;
  let started = false;

  return {
    time: 0,
    bossSpawned: false,
    update(w) {
      this.time += TICK;
      if (!started) {
        started = true;
        w.banner('STAGE 1', 2, '#9fe9ff');
      }
      while (index < timeline.length && timeline[index].at <= this.time) {
        timeline[index].fn(w);
        index++;
      }
      if (!bossSpawned && this.time > BOSS_GATE) {
        const midAlive = w.midboss && !w.midboss.dead;
        if (!midAlive || this.time > BOSS_FORCE) {
          bossSpawned = true;
          this.bossSpawned = true;
          w.spawnBoss(createBoss(w));
        }
      }
    },
  };
}
