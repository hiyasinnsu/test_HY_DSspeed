// Logical playfield. Everything in the simulation uses these units; the
// renderer scales the whole field to the device screen.
export const FIELD = { w: 540, h: 960 };
export const TICK = 1 / 60;

export const PLAYER = {
  speed: 4.7,
  focusSpeed: 2.05,
  hitR: 3.4,
  grazeR: 20,
  shotInterval: 4,
  shotDmg: 0.5,
  invulnTicks: 150,
  bombInvuln: 210,
  startX: FIELD.w / 2,
  startY: FIELD.h - 150,
  marginX: 20,
  marginTop: 70,
  marginBottom: 26,
};

export const DIFFICULTY = {
  easy: {
    key: 'easy', label: 'かんたん',
    bulletSpeed: 0.78, fireRate: 0.72, lives: 4, bombs: 3, scoreMul: 0.8, bossHp: 0.8,
  },
  normal: {
    key: 'normal', label: 'ふつう',
    bulletSpeed: 1, fireRate: 1, lives: 3, bombs: 3, scoreMul: 1, bossHp: 1,
  },
  hard: {
    key: 'hard', label: 'むずかしい',
    bulletSpeed: 1.16, fireRate: 1.28, lives: 3, bombs: 2, scoreMul: 1.35, bossHp: 1.15,
  },
};

const orb = (size, rgb, hitScale = 0.5) => ({ shape: 'orb', size, hit: size * hitScale, rgb });
const rice = (size, rgb) => ({ shape: 'rice', size, hit: size * 0.34, rgb });
const ring = (size, rgb) => ({ shape: 'ring', size, hit: size * 0.78, rgb });
const needle = (size, rgb) => ({ shape: 'needle', size, hit: size * 0.3, rgb });

// Index order is part of the simulation data (bullets store an index).
export const BULLET_STYLES = [
  orb(6.2, [120, 236, 255]), // 0 cyan
  orb(7.4, [255, 110, 220]), // 1 magenta
  orb(9.5, [255, 86, 96]), // 2 red
  rice(7.2, [128, 238, 255]), // 3 cyan rice
  rice(6.6, [255, 224, 110]), // 4 yellow rice
  ring(11, [184, 146, 255]), // 5 violet ring
  needle(8.5, [130, 255, 168]), // 6 green needle
  orb(5.2, [255, 226, 110]), // 7 small yellow
  orb(5.2, [245, 245, 255], 0.55), // 8 small white
  orb(7.4, [176, 140, 255]), // 9 violet
  orb(8.2, [255, 166, 90]), // 10 orange
  rice(6.2, [255, 128, 214]), // 11 magenta rice
  orb(6.4, [116, 168, 255]), // 12 blue
];

export const B = {
  ORB_C: 0, ORB_M: 1, ORB_R: 2, RICE_C: 3, RICE_Y: 4, RING_V: 5,
  NEEDLE_G: 6, ORB_Y: 7, ORB_W: 8, ORB_V: 9, ORB_O: 10, RICE_M: 11, ORB_B: 12,
};

export const ENEMY_SPRITE = { DRONE: 0, TURRET: 1, DART: 2, MIDBOSS: 3, BOSS: 4, ORB: 5 };

export const MAX_ENEMY_BULLETS = 1500;
export const MAX_PARTICLES = 260;
