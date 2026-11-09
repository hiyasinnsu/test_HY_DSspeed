// Headless balance check: an invincible, auto-aiming bot plays the stage.
// Usage: node tools/sim.mjs [easy|normal|hard] [seconds]
import { World } from '../src/game/world.js';
import { FIELD } from '../src/game/config.js';

const key = process.argv[2] || 'normal';
const seconds = Number(process.argv[3] || 240);
const w = new World({ difficulty: key, seed: 20260101 });

let bossSpawn = null;
let phaseLog = [];
let lastBossPhase = -1;
let peak = 0;

for (let i = 0; i < seconds * 60 && w.state === 'playing'; i++) {
  const p = w.player;
  p.invuln = 10;
  const b = w.boss;
  if (b && b.state === 'fight') {
    const target = b.x;
    w.input.keyX = Math.max(-1, Math.min(1, (target - p.x) / 40));
    w.input.keyY = 0;
    if (b.phase !== lastBossPhase) {
      lastBossPhase = b.phase;
      phaseLog.push({ phase: b.phase, at: +(i / 60).toFixed(1), hp: b.hp });
    }
  } else if (w.midboss) {
    w.input.keyX = Math.max(-1, Math.min(1, (w.midboss.x - p.x) / 40));
    w.input.keyY = 0;
  } else {
    w.input.keyX = Math.sin(i * 0.01) * 0.6;
    w.input.keyY = 0;
  }
  w.input.focus = false;
  w.tick();
  w.events.length = 0;
  if (!bossSpawn && w.boss) bossSpawn = i / 60;
  peak = Math.max(peak, w.bulletsE.count);
}

console.log({
  difficulty: key,
  state: w.state,
  time: +(w.time).toFixed(1),
  bossAt: bossSpawn,
  phaseLog,
  score: w.score,
  graze: w.graze,
  lives: w.lives,
  bombs: w.bombs,
  peakBullets: peak,
  field: FIELD,
});
