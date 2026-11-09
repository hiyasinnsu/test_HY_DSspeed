import { FIELD, PLAYER } from '../game/config.js';
import { buildSprites, nebulaSprite } from './sprites.js';

const TAU = Math.PI * 2;

function pad(n, len) {
  return String(Math.max(0, Math.floor(n))).padStart(len, '0');
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.sprites = buildSprites();
    this.nebula = nebulaSprite(270, 480);
    this.scale = 1;
    this.offX = 0;
    this.offY = 0;
    this.clock = 0;
    this.stars = [];
    this.streaks = [];
    for (let i = 0; i < 84; i++) {
      const layer = i % 3;
      this.stars.push({
        x: Math.random() * FIELD.w,
        y: Math.random() * FIELD.h,
        speed: 22 + layer * 46 + Math.random() * 26,
        size: 0.6 + layer * 0.45 + Math.random() * 0.6,
        alpha: 0.25 + layer * 0.22,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.streaks.push({
        x: Math.random() * FIELD.w,
        y: Math.random() * FIELD.h,
        len: 70 + Math.random() * 130,
        speed: 260 + Math.random() * 280,
      });
    }
  }

  resize(cssW, cssH, dpr) {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.scale = Math.min(w / FIELD.w, h / FIELD.h);
    this.offX = (w - FIELD.w * this.scale) / 2;
    this.offY = (h - FIELD.h * this.scale) / 2;
  }

  drawBackground(dt) {
    const ctx = this.ctx;
    ctx.fillStyle = '#05071a';
    ctx.fillRect(0, 0, FIELD.w, FIELD.h);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.nebula, 0, 0, FIELD.w, FIELD.h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(120,180,255,0.045)';
    for (const s of this.streaks) {
      s.y += s.speed * dt;
      if (s.y > FIELD.h) {
        s.y = -s.len;
        s.x = Math.random() * FIELD.w;
      }
      ctx.fillRect(s.x, s.y, 1, s.len);
    }

    // Round dots on purpose: vertical dashes read as bullets on a danmaku field.
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > FIELD.h) {
        s.y = -2;
        s.x = Math.random() * FIELD.w;
      }
      ctx.fillStyle = `rgba(200,225,255,${s.alpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.85, 0, TAU);
      ctx.fill();
    }

    const glow = ctx.createLinearGradient(0, 0, 0, 180);
    glow.addColorStop(0, 'rgba(90,140,255,0.16)');
    glow.addColorStop(1, 'rgba(90,140,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.w, 180);
  }

  draw(world, dt) {
    this.clock += dt;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#03040a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offX, this.offY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.w, FIELD.h);
    ctx.clip();
    this.drawBackground(dt);
    if (world) {
      ctx.save();
      if (world.shake > 0.3) {
        ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
      }
      this.drawPlayerShots(world);
      this.drawEnemyBullets(world);
      this.drawEnemies(world);
      this.drawBoss(world);
      this.drawPlayer(world);
      this.drawParticles(world);
      this.drawBomb(world);
      ctx.restore();
      this.drawHud(world);
      this.drawBanner(world);
    }
    ctx.restore();
  }

  drawPlayerShots(world) {
    const ctx = this.ctx;
    const sprite = this.sprites.shot;
    const list = world.bulletsP.active;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.82;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      ctx.drawImage(sprite.canvas, s.x - sprite.w / 2, s.y - sprite.h / 2, sprite.w, sprite.h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawEnemyBullets(world) {
    const ctx = this.ctx;
    const styles = this.sprites.bullets;
    const list = world.bulletsE.active;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const s = styles[b.style] || styles[0];
      if (s.rot) {
        const a = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
      } else {
        ctx.drawImage(s.canvas, b.x - s.w / 2, b.y - s.h / 2, s.w, s.h);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawEnemies(world) {
    const ctx = this.ctx;
    for (let i = 0; i < world.enemies.length; i++) {
      const e = world.enemies[i];
      const s = this.sprites.enemies[e.sprite] || this.sprites.enemies[0];
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.sprite === 2) ctx.rotate(e.angle);
      else ctx.rotate(Math.sin(e.t * 0.03) * 0.08);
      ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
      if (e.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.95, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }
  }

  drawBoss(world) {
    const b = world.boss;
    if (!b) return;
    const ctx = this.ctx;
    const s = this.sprites.enemies[4];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255,140,190,${0.3 - i * 0.07})`;
      ctx.beginPath();
      ctx.arc(0, 0, b.r + 10 + i * 12 + Math.sin(world.tickCount * 0.03 + i) * 4, 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(Math.sin(b.t * 0.008) * 0.12);
    ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
    if (b.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    const blink = p.invuln > 0 && Math.floor(world.tickCount / 4) % 2 === 0;
    const ship = this.sprites.player;
    const pod = this.sprites.pod;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.bank * 0.2);
    if (blink) ctx.globalAlpha = 0.32;
    ctx.globalCompositeOperation = 'lighter';
    const flame = 1 + Math.sin(world.tickCount * 0.6) * 0.18 + (p.fireAnim > 0 ? 0.25 : 0);
    const grad = ctx.createLinearGradient(0, 18, 0, 18 + 20 * flame);
    grad.addColorStop(0, 'rgba(190,245,255,0.85)');
    grad.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-5, 18);
    ctx.lineTo(0, 18 + 20 * flame);
    ctx.lineTo(5, 18);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(ship.canvas, -ship.w / 2, -ship.h / 2, ship.w, ship.h);
    ctx.drawImage(pod.canvas, -32, -4, pod.w, pod.h);
    ctx.drawImage(pod.canvas, 32 - pod.w, -4, pod.w, pod.h);
    ctx.restore();

    if (p.focus) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(world.tickCount * 0.07);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,130,180,0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,130,180,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0.4, 2.2);
      ctx.stroke();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = 'rgba(255,70,110,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.hitR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.hitR * 0.42, 0, TAU);
    ctx.fill();
  }

  drawParticles(world) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < world.particles.active.length; i++) {
      const p = world.particles.active[i];
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * a), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < world.rings.active.length; i++) {
      const r = world.rings.active[i];
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.75;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.5 + a * 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawBomb(world) {
    const b = world.bomb;
    if (!b) return;
    const ctx = this.ctx;
    const a = Math.max(0, 1 - b.t / b.dur);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r);
    g.addColorStop(0, `rgba(210,250,255,${0.35 * a})`);
    g.addColorStop(0.55, `rgba(110,200,255,${0.22 * a})`);
    g.addColorStop(1, 'rgba(70,120,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(210,245,255,${0.75 * a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.97, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawHud(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(220,240,255,0.92)';
    ctx.font = '700 20px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${pad(world.score, 8)}`, 16, 30);
    ctx.fillStyle = 'rgba(160,200,235,0.75)';
    ctx.font = '700 14px ui-monospace, Menlo, Consolas, monospace';
    const best = world.bestScore || 0;
    ctx.fillText(`HI ${pad(best, 8)}   GRAZE ${pad(world.graze, 4)}`, 16, 52);

    this.drawBossBar(world);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const baseY = FIELD.h - 26;
    for (let i = 0; i < world.lives; i++) {
      this.drawLifeIcon(20 + i * 22, baseY);
    }
    for (let i = 0; i < world.bombs; i++) {
      this.drawBombIcon(26 + i * 20, baseY - 26);
    }
    ctx.restore();
  }

  drawLifeIcon(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,120,160,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x, y + 9);
    ctx.lineTo(x - 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,235,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawBombIcon(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(130,225,255,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,250,255,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, TAU);
    ctx.stroke();
  }

  drawBossBar(world) {
    const ctx = this.ctx;
    const b = world.boss;
    const mid = world.midboss;
    if (!b && !mid) return;
    const barW = FIELD.w - 64;
    const x = 32;
    const y = 82;

    if (b && (b.state === 'fight' || b.state === 'enter')) {
      // A dark strip keeps the spell card name readable over dense bullets.
      ctx.fillStyle = 'rgba(3, 7, 18, 0.6)';
      ctx.fillRect(0, 56, FIELD.w, 62);
      ctx.fillStyle = 'rgba(255, 150, 190, 0.4)';
      ctx.fillRect(0, 56, FIELD.w, 1);
      const ratio = Math.max(0, b.hp / b.maxHp);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,220,235,0.92)';
      ctx.font = '700 15px "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif';
      ctx.fillText(b.phaseName, FIELD.w / 2, y - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x, y, barW, 6);
      const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
      grad.addColorStop(0, 'rgba(255,120,170,0.95)');
      grad.addColorStop(1, 'rgba(255,210,140,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW * ratio, 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, barW - 1, 5);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(230,240,255,0.85)';
      ctx.font = '700 13px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(`${Math.ceil(b.phaseTime / 60)}`, x + barW, y + 24);
      ctx.textAlign = 'left';
      ctx.fillText(`PHASE ${b.phase + 1}/3`, x, y + 24);
      return;
    }

    if (mid && mid.showHp && !mid.dead) {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.55)';
      ctx.fillRect(0, 56, FIELD.w, 40);
      const ratio = Math.max(0, mid.hp / mid.maxHp);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, y + 8, barW, 5);
      ctx.fillStyle = 'rgba(200,150,255,0.9)';
      ctx.fillRect(x, y + 8, barW * ratio, 5);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,200,255,0.85)';
      ctx.font = '700 12px "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif';
      ctx.fillText('中ボス', FIELD.w / 2, y);
    }
  }

  drawBanner(world) {
    const b = world.bannerState;
    if (!b) return;
    const ctx = this.ctx;
    const t = b.t / b.dur;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.textAlign = 'center';
    ctx.font = '700 26px "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillStyle = b.color || '#ffffff';
    ctx.shadowColor = b.color || '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillText(b.text, FIELD.w / 2, 320);
    ctx.restore();
  }

  drawTitleBackdrop(dt) {
    this.draw(null, dt);
  }
}
