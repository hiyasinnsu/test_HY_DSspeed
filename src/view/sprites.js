import { BULLET_STYLES } from '../game/config.js';

const SS = 2.5;
const TAU = Math.PI * 2;

function surface(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * SS));
  canvas.height = Math.max(1, Math.round(h * SS));
  const ctx = canvas.getContext('2d');
  ctx.scale(SS, SS);
  return { canvas, ctx, w, h };
}

function radial(ctx, cx, cy, r, stops) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [pos, color] of stops) grad.addColorStop(pos, color);
  return grad;
}

function shapePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function star(cx, cy, outer, inner, points) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TAU - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function orbSprite(style) {
  const [r, g, b] = style.rgb;
  const size = style.size;
  const pad = size * 1.85;
  const s = surface(pad * 2, pad * 2);
  const c = s.ctx;
  const cx = pad;
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, cx, cx, pad, [
    [0, `rgba(${r},${g},${b},0.75)`],
    [0.45, `rgba(${r},${g},${b},0.28)`],
    [1, `rgba(${r},${g},${b},0)`],
  ]);
  c.beginPath();
  c.arc(cx, cx, pad, 0, TAU);
  c.fill();

  c.fillStyle = radial(c, cx, cx - size * 0.2, size * 1.3, [
    [0, 'rgba(255,255,255,1)'],
    [0.38, 'rgba(255,255,255,0.96)'],
    [0.6, `rgba(${r},${g},${b},0.95)`],
    [1, `rgba(${r},${g},${b},0)`],
  ]);
  c.beginPath();
  c.arc(cx, cx, size * 1.3, 0, TAU);
  c.fill();
  return { canvas: s.canvas, w: pad * 2, h: pad * 2, rot: false };
}

function riceSprite(style, stretch) {
  const [r, g, b] = style.rgb;
  const size = style.size;
  const len = size * stretch;
  const pad = len * 1.2;
  const s = surface(pad * 2, pad * 2);
  const c = s.ctx;
  const cx = pad;
  const cy = pad;
  c.globalCompositeOperation = 'lighter';

  c.save();
  c.translate(cx, cy);
  c.scale(stretch, 1);
  c.fillStyle = radial(c, 0, 0, size * 1.9, [
    [0, `rgba(${r},${g},${b},0.5)`],
    [0.55, `rgba(${r},${g},${b},0.18)`],
    [1, `rgba(${r},${g},${b},0)`],
  ]);
  c.beginPath();
  c.arc(0, 0, size * 1.9, 0, TAU);
  c.fill();
  c.restore();

  c.save();
  c.translate(cx, cy);
  c.scale(stretch, 1);
  c.fillStyle = radial(c, 0, 0, size, [
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,0.95)'],
    [0.72, `rgba(${r},${g},${b},0.95)`],
    [1, `rgba(${r},${g},${b},0)`],
  ]);
  c.beginPath();
  c.arc(0, 0, size, 0, TAU);
  c.fill();
  c.restore();

  return { canvas: s.canvas, w: pad * 2, h: pad * 2, rot: true };
}

function ringSprite(style) {
  const [r, g, b] = style.rgb;
  const size = style.size;
  const pad = size * 1.7;
  const s = surface(pad * 2, pad * 2);
  const c = s.ctx;
  const cx = pad;
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = `rgba(${r},${g},${b},0.95)`;
  c.lineWidth = size * 0.42;
  c.shadowColor = `rgba(${r},${g},${b},1)`;
  c.shadowBlur = size * 0.9;
  c.beginPath();
  c.arc(cx, cx, size * 0.9, 0, TAU);
  c.stroke();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = size * 0.14;
  c.beginPath();
  c.arc(cx, cx, size * 0.9, 0, TAU);
  c.stroke();
  return { canvas: s.canvas, w: pad * 2, h: pad * 2, rot: false };
}

export function buildBulletSprites() {
  return BULLET_STYLES.map((style) => {
    if (style.shape === 'rice') return riceSprite(style, 1.9);
    if (style.shape === 'needle') return riceSprite(style, 2.8);
    if (style.shape === 'ring') return ringSprite(style);
    return orbSprite(style);
  });
}

function droneSprite() {
  const s = surface(38, 38);
  const c = s.ctx;
  const cx = 19;
  c.fillStyle = radial(c, cx, cx, 17, [
    [0, 'rgba(255,190,240,1)'],
    [0.45, 'rgba(226,96,196,0.95)'],
    [1, 'rgba(120,20,110,0.2)'],
  ]);
  shapePath(c, [[cx, 1], [cx + 15, cx], [cx, 37], [cx - 15, cx]]);
  c.fill();
  c.strokeStyle = 'rgba(255,220,250,0.9)';
  c.lineWidth = 1.2;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath();
  c.arc(cx, cx, 3.2, 0, TAU);
  c.fill();
  return { canvas: s.canvas, w: 38, h: 38 };
}

function turretSprite() {
  const s = surface(52, 52);
  const c = s.ctx;
  const cx = 26;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    pts.push([cx + Math.cos(a) * 22, cx + Math.sin(a) * 22]);
  }
  c.fillStyle = radial(c, cx, cx, 22, [
    [0, 'rgba(255,236,190,1)'],
    [0.5, 'rgba(255,150,60,0.95)'],
    [1, 'rgba(120,50,0,0.35)'],
  ]);
  shapePath(c, pts);
  c.fill();
  c.strokeStyle = 'rgba(255,220,160,0.85)';
  c.lineWidth = 1.5;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath();
  c.arc(cx, cx, 6, 0, TAU);
  c.fill();
  return { canvas: s.canvas, w: 52, h: 52 };
}

function dartSprite() {
  const s = surface(44, 26);
  const c = s.ctx;
  c.fillStyle = radial(c, 20, 13, 20, [
    [0, 'rgba(220,255,230,1)'],
    [0.45, 'rgba(90,230,140,0.95)'],
    [1, 'rgba(10,90,50,0.25)'],
  ]);
  shapePath(c, [[1, 13], [30, 2], [40, 13], [30, 24]]);
  c.fill();
  c.strokeStyle = 'rgba(190,255,210,0.9)';
  c.lineWidth = 1.2;
  c.stroke();
  return { canvas: s.canvas, w: 44, h: 26 };
}

function orbEnemySprite() {
  const s = surface(46, 46);
  const c = s.ctx;
  const cx = 23;
  c.fillStyle = radial(c, cx, cx, 21, [
    [0, 'rgba(235,250,255,1)'],
    [0.42, 'rgba(110,190,255,0.95)'],
    [1, 'rgba(20,60,140,0.25)'],
  ]);
  c.beginPath();
  c.arc(cx, cx, 20, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(200,235,255,0.85)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cx, 14, 0, TAU);
  c.stroke();
  return { canvas: s.canvas, w: 46, h: 46 };
}

function bigBossSprite(size, petalColor, coreColor, petals) {
  const s = surface(size, size);
  const c = s.ctx;
  const cx = size / 2;
  const outer = size * 0.46;
  const inner = size * 0.2;
  c.fillStyle = radial(c, cx, cx, outer, [
    [0, coreColor],
    [0.45, petalColor],
    [1, 'rgba(20,0,20,0.15)'],
  ]);
  shapePath(c, star(cx, cx, outer, inner, petals));
  c.fill();
  c.strokeStyle = 'rgba(255,235,250,0.9)';
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = radial(c, cx, cx, size * 0.16, [
    [0, 'rgba(255,255,255,1)'],
    [1, 'rgba(255,255,255,0.05)'],
  ]);
  c.beginPath();
  c.arc(cx, cx, size * 0.16, 0, TAU);
  c.fill();
  return { canvas: s.canvas, w: size, h: size };
}

function playerSprite() {
  const s = surface(34, 48);
  const c = s.ctx;
  const cx = 17;
  c.shadowColor = 'rgba(120,225,255,0.95)';
  c.shadowBlur = 10;
  c.fillStyle = radial(c, cx, 22, 26, [
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(200,244,255,1)'],
    [0.85, 'rgba(90,190,255,1)'],
    [1, 'rgba(40,120,230,0.9)'],
  ]);
  shapePath(c, [[cx, 2], [cx + 7, 20], [cx + 16, 30], [cx + 6, 33], [cx, 44], [cx - 6, 33], [cx - 16, 30], [cx - 7, 20]]);
  c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(220,250,255,0.95)';
  c.lineWidth = 1.4;
  c.stroke();
  c.fillStyle = radial(c, cx, 22, 8, [
    [0, 'rgba(255,255,255,1)'],
    [1, 'rgba(120,220,255,0.1)'],
  ]);
  c.beginPath();
  c.arc(cx, 22, 5.5, 0, TAU);
  c.fill();
  return { canvas: s.canvas, w: 34, h: 48 };
}

function podSprite() {
  const s = surface(16, 22);
  const c = s.ctx;
  c.fillStyle = radial(c, 8, 11, 10, [
    [0, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(140,230,255,0.95)'],
    [1, 'rgba(20,80,160,0.1)'],
  ]);
  shapePath(c, [[8, 1], [15, 11], [8, 21], [1, 11]]);
  c.fill();
  return { canvas: s.canvas, w: 16, h: 22 };
}

function shotSprite() {
  // A long glowing capsule reads as a beam even at 15 volleys per second.
  const w = 11;
  const h = 56;
  const s = surface(w, h);
  const c = s.ctx;
  c.globalCompositeOperation = 'lighter';
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(70,170,255,0)');
  grad.addColorStop(0.28, 'rgba(130,225,255,0.7)');
  grad.addColorStop(0.72, 'rgba(235,252,255,1)');
  grad.addColorStop(1, 'rgba(110,195,255,0)');
  c.fillStyle = grad;
  c.beginPath();
  c.ellipse(w / 2, h / 2, w * 0.34, h * 0.46, 0, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath();
  c.ellipse(w / 2, h * 0.54, w * 0.13, h * 0.3, 0, 0, TAU);
  c.fill();
  return { canvas: s.canvas, w, h };
}

export function buildSprites() {
  return {
    bullets: buildBulletSprites(),
    enemies: [
      droneSprite(),
      turretSprite(),
      dartSprite(),
      bigBossSprite(116, 'rgba(190,130,255,0.95)', 'rgba(255,230,255,1)', 6),
      bigBossSprite(158, 'rgba(255,110,140,0.95)', 'rgba(255,235,220,1)', 8),
      orbEnemySprite(),
    ],
    player: playerSprite(),
    pod: podSprite(),
    shot: shotSprite(),
  };
}

function nebulaSprite(w, h) {
  // Rendered at display resolution: the nebula is a soft gradient, so extra
  // supersampling would only cost memory.
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  c.fillStyle = '#05060f';
  c.fillRect(0, 0, w, h);
  const blobs = [
    [0.22, 0.18, 0.55, 'rgba(60,90,200,0.30)'],
    [0.78, 0.32, 0.5, 'rgba(150,40,160,0.24)'],
    [0.5, 0.72, 0.65, 'rgba(20,90,150,0.24)'],
    [0.1, 0.85, 0.4, 'rgba(120,30,120,0.18)'],
  ];
  for (const [px, py, pr, color] of blobs) {
    const grad = c.createRadialGradient(px * w, py * h, 0, px * w, py * h, pr * w);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  }
  return canvas;
}

export { nebulaSprite };
