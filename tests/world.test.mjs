import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/game/world.js';
import { createBoss, damageBoss } from '../src/game/boss.js';
import { FIELD, PLAYER, DIFFICULTY } from '../src/game/config.js';

function wander(w, tick) {
  w.input.keyX = Math.sin(tick * 0.013);
  w.input.keyY = Math.cos(tick * 0.009) * 0.7;
  w.input.keyFocus = tick % 240 < 90;
}

function run(w, ticks, each) {
  for (let i = 0; i < ticks; i++) {
    if (each) each(w, i);
    w.tick();
    w.events.length = 0;
  }
}

function assertFiniteWorld(w) {
  assert.ok(Number.isFinite(w.score), 'score finite');
  assert.ok(Number.isFinite(w.graze), 'graze finite');
  assert.ok(Number.isFinite(w.player.x) && Number.isFinite(w.player.y), 'player finite');
  for (const b of w.bulletsE.active) {
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), 'bullet position finite');
    assert.ok(Number.isFinite(b.vx) && Number.isFinite(b.vy), 'bullet velocity finite');
  }
  for (const e of w.enemies) {
    assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'enemy position finite');
  }
}

// Keeps the test ship alive: survival is covered by its own test below.
function invincibleWander(w, tick) {
  w.player.invuln = 5;
  wander(w, tick);
}

for (const key of Object.keys(DIFFICULTY)) {
  test(`stage runs for 45s on ${key} without breaking invariants`, () => {
    const w = new World({ difficulty: key, seed: 12345 });
    run(w, 60 * 45, invincibleWander);
    assertFiniteWorld(w);
    assert.equal(w.state, 'playing');
    assert.ok(w.stats.enemyBulletsPeak > 40, 'bullets were fired');
    assert.ok(w.stats.enemyBulletsPeak < 2000, `bullet count bounded (${w.stats.enemyBulletsPeak})`);
    assert.ok(w.bulletsE.count < 2000);
    assert.ok(w.enemies.length < 80);
    assert.ok(w.score > 0, 'score accumulated');
    assert.ok(w.stage.time > 40);
  });
}

test('player stays inside the field', () => {
  const w = new World({ difficulty: 'normal', seed: 7 });
  run(w, 600, (world) => {
    world.input.keyX = -1;
    world.input.keyY = -1;
  });
  assert.ok(w.player.x >= PLAYER.marginX - 1e-6);
  assert.ok(w.player.y >= PLAYER.marginTop - 1e-6);
  run(w, 600, (world) => {
    world.input.keyX = 1;
    world.input.keyY = 1;
  });
  assert.ok(w.player.x <= FIELD.w - PLAYER.marginX + 1e-6);
  assert.ok(w.player.y <= FIELD.h - PLAYER.marginBottom + 1e-6);
});

test('touch drag moves the ship and is consumed', () => {
  const w = new World({ difficulty: 'normal', seed: 3 });
  const x0 = w.player.x;
  w.input.touchX = 30;
  w.input.touchY = 0;
  w.tick();
  assert.ok(w.player.x > x0);
  assert.ok(w.player.x - x0 <= PLAYER.speed + 1e-6, 'clamped by speed');
  assert.equal(w.input.touchX, 0);
});

test('enemy bullets kill the player and then grant invulnerability', () => {
  const w = new World({ difficulty: 'normal', seed: 9 });
  w.player.invuln = 0;
  w.addEnemyBullet(w.player.x, w.player.y - 1, 0, 0, 0, {});
  w.bulletsE.active[w.bulletsE.count - 1].hit = 4;
  const lives = w.lives;
  w.tick();
  assert.equal(w.lives, lives - 1);
  assert.ok(w.player.invuln > 100, 'invulnerable after a hit');
  w.addEnemyBullet(w.player.x, w.player.y, 0, 0, 0, {});
  w.tick();
  assert.equal(w.lives, lives - 1, 'invulnerability blocks the second hit');
});

test('bomb clears nearby bullets and spends a bomb', () => {
  const w = new World({ difficulty: 'normal', seed: 11 });
  for (let i = 0; i < 40; i++) {
    w.addEnemyBullet(w.player.x + (i % 8) * 6, w.player.y - 40 - i * 4, 0, 0, 1, {});
  }
  const bombs = w.bombs;
  w.input.bomb = true;
  w.tick();
  assert.equal(w.bombs, bombs - 1);
  run(w, 40);
  assert.equal(w.bulletsE.count, 0, 'bullets inside the blast are removed');
});

test('bullets leaving the field are recycled', () => {
  const w = new World({ difficulty: 'normal', seed: 13 });
  w.addEnemyBullet(FIELD.w / 2, FIELD.h + 200, 0, 5, 0, {});
  w.tick();
  assert.equal(w.bulletsE.count, 0);
});

test('boss phases advance and the stage clears', () => {
  const w = new World({ difficulty: 'normal', seed: 17 });
  const boss = createBoss(w);
  w.spawnBoss(boss);
  let guard = 0;
  while (boss.state !== 'fight' && guard++ < 400) {
    w.tick();
    w.events.length = 0;
  }
  assert.equal(boss.state, 'fight', 'boss reaches its first phase');
  const firstPhaseHp = boss.hp;
  assert.ok(firstPhaseHp > 0);

  const seenPhases = new Set();
  guard = 0;
  while (w.state === 'playing' && guard++ < 3000) {
    seenPhases.add(boss.phase);
    if (boss.state === 'fight') damageBoss(w, 50);
    w.tick();
    w.events.length = 0;
  }
  assert.equal(w.state, 'clear');
  assert.equal(boss.phase, 2, 'all three phases were fought');
  assert.equal(seenPhases.size, 3);
  assert.ok(w.score > 0);
  assert.ok(w.clearBonus >= 0);
});

test('phase timeout still ends the fight', () => {
  const w = new World({ difficulty: 'easy', seed: 21 });
  const boss = createBoss(w);
  w.spawnBoss(boss);
  boss.state = 'fight';
  boss.phaseTime = 2;
  let guard = 0;
  while (w.state === 'playing' && guard++ < 5000) {
    if (boss.state === 'fight') boss.phaseTime = 1;
    w.tick();
    w.events.length = 0;
  }
  assert.equal(w.state, 'clear');
});

test('same seed replays the same score', () => {
  const a = new World({ difficulty: 'hard', seed: 4242 });
  const b = new World({ difficulty: 'hard', seed: 4242 });
  run(a, 1800, invincibleWander);
  run(b, 1800, invincibleWander);
  assert.equal(a.score, b.score);
  assert.equal(a.graze, b.graze);
});
