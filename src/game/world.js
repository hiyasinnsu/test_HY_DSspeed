import {
  FIELD, TICK, PLAYER, DIFFICULTY, BULLET_STYLES,
  MAX_ENEMY_BULLETS, MAX_PARTICLES,
} from './config.js';
import { EntityList } from '../core/pool.js';
import { makeRng, dist2, TAU } from '../core/math.js';
import { createPlayer, updatePlayer, updateBomb, playerHit } from './player.js';
import { updateBoss, damageBoss } from './boss.js';
import { createStage } from './stage.js';

const makeBullet = () => ({
  x: 0, y: 0, vx: 0, vy: 0, style: 0, life: 0, curve: 0, ax: 0, ay: 0,
  hit: 3, grazed: false, dead: false,
});

const makeShot = () => ({ x: 0, y: 0, vx: 0, vy: 0, dmg: 1, r: 3, life: 0, dead: false });

const makeParticle = () => ({
  x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 1, dead: false,
});

const makeRing = () => ({
  x: 0, y: 0, r: 0, rmax: 0, life: 0, maxLife: 1, color: '#fff', dead: false,
});

export class World {
  constructor(opts = {}) {
    this.difficultyKey = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    this.diff = DIFFICULTY[this.difficultyKey];
    this.seed = (opts.seed ?? Date.now()) >>> 0;
    this.field = FIELD;
    this.rand = makeRng(this.seed);
    this.bulletsE = new EntityList(makeBullet, 320);
    this.bulletsP = new EntityList(makeShot, 64);
    this.particles = new EntityList(makeParticle, 96);
    this.rings = new EntityList(makeRing, 16);
    this.reset();
  }

  reset() {
    this.state = 'playing';
    this.tickCount = 0;
    this.time = 0;
    this.score = 0;
    this.graze = 0;
    this.lives = this.diff.lives;
    this.bombs = this.diff.bombs;
    this.player = createPlayer();
    this.enemies = [];
    this.midboss = null;
    this.boss = null;
    this.bomb = null;
    this.bannerState = null;
    this.shake = 0;
    this.events = [];
    this.clearBonus = 0;
    this.rand = makeRng(this.seed);
    this.input = {
      keyX: 0, keyY: 0, keyFocus: false, focus: false,
      touchX: 0, touchY: 0, bomb: false,
    };
    this.bulletsE.clear();
    this.bulletsP.clear();
    this.particles.clear();
    this.rings.clear();
    this.stats = { enemyBulletsPeak: 0, kills: 0 };
    this.stage = createStage(this);
  }

  every(base) {
    return Math.max(2, Math.round(base / this.diff.fireRate));
  }

  canFire() {
    return this.state === 'playing' && this.bulletsE.count < MAX_ENEMY_BULLETS;
  }

  addScore(n) {
    this.score += Math.round(n * this.diff.scoreMul);
  }

  sfx(name) {
    this.events.push({ type: 'sfx', name });
  }

  banner(text, seconds, color) {
    this.bannerState = { text, t: 0, dur: Math.round(seconds * 60), color };
  }

  addShake(n) {
    this.shake = Math.min(30, this.shake + n);
  }

  addEnemyBullet(x, y, vx, vy, style, extra) {
    const b = this.bulletsE.spawn();
    const st = BULLET_STYLES[style] || BULLET_STYLES[0];
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.style = style;
    b.hit = st.hit;
    b.curve = (extra && extra.curve) || 0;
    b.ax = (extra && extra.ax) || 0;
    b.ay = (extra && extra.ay) || 0;
    b.life = extra && extra.life != null ? extra.life : 900;
    b.grazed = false;
    return b;
  }

  addShot(x, y, vx, vy, dmg, r) {
    const s = this.bulletsP.spawn();
    s.x = x;
    s.y = y;
    s.vx = vx;
    s.vy = vy;
    s.dmg = dmg;
    s.r = r;
    s.life = 120;
    return s;
  }

  spawnEnemy(opts) {
    const e = {
      x: opts.x,
      y: opts.y,
      r: opts.r ?? 16,
      hp: opts.hp ?? 10,
      maxHp: opts.hp ?? 10,
      score: opts.score ?? 100,
      sprite: opts.sprite ?? 0,
      color: opts.color ?? '#ffffff',
      name: opts.name ?? '',
      angle: 0,
      t: 0,
      flash: 0,
      dead: false,
      showHp: false,
      update: null,
      onDeath: null,
    };
    this.enemies.push(e);
    return e;
  }

  spawnBoss(boss) {
    this.boss = boss;
    this.banner('WARNING', 1.6, '#ff9aa8');
    this.sfx('warning');
    this.addShake(10);
  }

  addParticles(x, y, color, count = 8, speed = 3, size = 3) {
    for (let i = 0; i < count; i++) {
      if (this.particles.count >= MAX_PARTICLES) break;
      const p = this.particles.spawn();
      const a = this.rand() * TAU;
      const sp = speed * (0.35 + this.rand());
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 16 + Math.floor(this.rand() * 20);
      p.maxLife = p.life;
      p.size = size * (0.6 + this.rand() * 0.9);
      p.color = color;
      p.drag = 0.94;
    }
  }

  addRing(x, y, r, rmax, life, color) {
    const ring = this.rings.spawn();
    ring.x = x;
    ring.y = y;
    ring.r = r;
    ring.rmax = rmax;
    ring.life = life;
    ring.maxLife = life;
    ring.color = color;
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    this.stats.kills++;
    this.addScore(e.score);
    this.addParticles(e.x, e.y, e.color, 10, 3.2, 3);
    this.addRing(e.x, e.y, e.r * 0.4, e.r * 3.2, 22, '#ffffff');
    this.sfx('explosion');
    if (e.onDeath) e.onDeath(this, e);
    if (this.midboss === e) this.midboss = null;
  }

  clearBullets(x, y, radius, scoreEach) {
    const a = this.bulletsE.active;
    const r2 = radius * radius;
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i];
      if (dist2(b.x, b.y, x, y) <= r2) {
        if (scoreEach) this.addScore(20);
        this.bulletsE.releaseAt(i);
      }
    }
  }

  damageArea(x, y, radius, dmg) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      const rr = radius + e.r;
      if (dist2(e.x, e.y, x, y) <= rr * rr) {
        e.hp -= dmg;
        e.flash = 3;
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
    const b = this.boss;
    if (b) {
      const rr = radius + b.r;
      if (dist2(b.x, b.y, x, y) <= rr * rr) damageBoss(this, dmg);
    }
  }

  finish(cleared) {
    if (this.state !== 'playing') return;
    this.state = cleared ? 'clear' : 'over';
    if (cleared) {
      this.clearBonus = Math.round(this.lives * 100000 + this.bombs * 50000);
      this.addScore(this.clearBonus);
    }
    this.sfx(cleared ? 'clear' : 'gameover');
  }

  onBossDefeated() {
    this.finish(true);
  }

  tick() {
    this.tickCount++;
    this.time += TICK;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.9);
    if (this.bannerState) {
      this.bannerState.t++;
      if (this.bannerState.t >= this.bannerState.dur) this.bannerState = null;
    }
    this.updateEffects();
    if (this.state !== 'playing') return;

    updatePlayer(this);
    if (this.stage) this.stage.update(this);
    this.updateEnemies();
    if (this.boss) updateBoss(this);
    updateBomb(this);
    this.updateEnemyBullets();
    this.updatePlayerShots();
    if (this.bulletsE.count > this.stats.enemyBulletsPeak) {
      this.stats.enemyBulletsPeak = this.bulletsE.count;
    }
  }

  updateEffects() {
    const pa = this.particles.active;
    for (let i = pa.length - 1; i >= 0; i--) {
      const p = pa[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += 0.03;
      if (p.life <= 0) this.particles.releaseAt(i);
    }
    const ra = this.rings.active;
    for (let i = ra.length - 1; i >= 0; i--) {
      const r = ra[i];
      r.life--;
      r.r += (r.rmax - r.r) * 0.14;
      if (r.life <= 0) this.rings.releaseAt(i);
    }
  }

  updateEnemies() {
    const a = this.enemies;
    for (let i = a.length - 1; i >= 0; i--) {
      const e = a[i];
      if (e.dead) {
        a.splice(i, 1);
        continue;
      }
      e.t++;
      if (e.flash > 0) e.flash--;
      if (e.update) e.update(e, this);
      if (e.dead) {
        a.splice(i, 1);
        if (this.midboss === e) this.midboss = null;
      }
    }
  }

  updateEnemyBullets() {
    const a = this.bulletsE.active;
    const p = this.player;
    let playerWasHit = false;
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i];
      b.life--;
      if (b.curve !== 0) {
        const c = Math.cos(b.curve);
        const s = Math.sin(b.curve);
        const vx = b.vx * c - b.vy * s;
        b.vy = b.vx * s + b.vy * c;
        b.vx = vx;
      }
      if (b.ax !== 0) b.vx += b.ax;
      if (b.ay !== 0) b.vy += b.ay;
      b.x += b.vx;
      b.y += b.vy;

      if (this.state === 'playing') {
        if (p.invuln <= 0) {
          const hr = PLAYER.hitR + b.hit;
          if (dist2(b.x, b.y, p.x, p.y) < hr * hr) {
            this.bulletsE.releaseAt(i);
            playerWasHit = true;
            continue;
          }
        }
        if (!b.grazed) {
          const gr = PLAYER.grazeR + b.hit;
          if (dist2(b.x, b.y, p.x, p.y) < gr * gr) {
            b.grazed = true;
            this.graze++;
            this.addScore(40);
            this.sfx('graze');
          }
        }
      }

      if (b.life <= 0 || b.x < -90 || b.x > FIELD.w + 90 || b.y < -150 || b.y > FIELD.h + 110) {
        this.bulletsE.releaseAt(i);
      }
    }
    // playerHit clears bullets, so it must run after the loop above has
    // finished walking the bullet array.
    if (playerWasHit) playerHit(this);
  }

  updatePlayerShots() {
    const a = this.bulletsP.active;
    const enemies = this.enemies;
    for (let i = a.length - 1; i >= 0; i--) {
      const s = a[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      if (s.y < -40 || s.x < -40 || s.x > FIELD.w + 40 || s.life <= 0) {
        this.bulletsP.releaseAt(i);
        continue;
      }
      let hit = false;
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (e.dead) continue;
        const rr = e.r + s.r;
        if (dist2(s.x, s.y, e.x, e.y) < rr * rr) {
          e.hp -= s.dmg;
          e.flash = 3;
          this.sfx('hit');
          this.addParticles(s.x, s.y, '#ffffff', 1, 1.6, 2);
          if (e.hp <= 0) this.killEnemy(e);
          hit = true;
          break;
        }
      }
      if (!hit && this.boss) {
        const b = this.boss;
        const rr = b.r + s.r;
        if (b.state === 'fight' && dist2(s.x, s.y, b.x, b.y) < rr * rr) {
          damageBoss(this, s.dmg);
          this.sfx('hit');
          this.addParticles(s.x, s.y, '#ffe6b0', 1, 1.4, 2);
          hit = true;
        }
      }
      if (hit) this.bulletsP.releaseAt(i);
    }
  }
}

export { FIELD };
