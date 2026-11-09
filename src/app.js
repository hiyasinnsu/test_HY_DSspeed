import { World } from './game/world.js';
import { Renderer } from './view/renderer.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { loadSettings, saveSettings } from './core/storage.js';
import { DIFFICULTY } from './game/config.js';

const $ = (id) => document.getElementById(id);
const frame = $('frame');
const canvas = $('game');
const touchUi = $('touch-ui');
const bombBtn = $('btn-bomb');
const bombCount = $('bomb-count');
const screens = {
  title: $('screen-title'),
  pause: $('screen-pause'),
  result: $('screen-result'),
};

const settings = loadSettings();
const audio = new AudioEngine();
audio.setMuted(settings.muted);
const input = new Input();
const renderer = new Renderer(canvas);

let world = null;
let mode = 'title';
let endDelay = 0;
let accumulator = 0;
let lastFrame = performance.now();
let resultShown = false;

const STEP = 1 / 60;

function devicePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 2.5);
}

function fit() {
  const rect = frame.getBoundingClientRect();
  renderer.resize(rect.width, rect.height, devicePixelRatio());
  input.setRect(rect);
}

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('hidden', key !== name);
  }
}

function updateTitle() {
  for (const btn of document.querySelectorAll('[data-diff]')) {
    const active = btn.dataset.diff === settings.difficulty;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  $('best-score').textContent = String(settings.best[settings.difficulty] || 0);
  $('title-diff').textContent = DIFFICULTY[settings.difficulty].label;
  document.querySelectorAll('[data-sound]').forEach((el) => {
    el.textContent = settings.muted ? 'SOUND OFF' : 'SOUND ON';
    el.classList.toggle('off', settings.muted);
  });
}

function setDifficulty(key) {
  if (!DIFFICULTY[key]) return;
  settings.difficulty = key;
  saveSettings(settings);
  updateTitle();
}

function toggleSound() {
  settings.muted = !settings.muted;
  audio.setMuted(settings.muted);
  saveSettings(settings);
  updateTitle();
  if (!settings.muted) {
    audio.init();
    audio.resume();
    if (mode === 'playing') audio.startBgm();
  }
}

function startGame() {
  audio.init();
  audio.resume();
  if (!settings.muted) audio.startBgm();
  world = new World({ difficulty: settings.difficulty, seed: (Math.random() * 0x7fffffff) | 0 });
  world.bestScore = settings.best[settings.difficulty] || 0;
  mode = 'playing';
  resultShown = false;
  endDelay = 0;
  accumulator = 0;
  lastFrame = performance.now();
  input.release();
  input.enabled = true;
  showScreen(null);
  touchUi.classList.remove('hidden');
  updateBombUi();
}

function pauseGame() {
  if (mode !== 'playing') return;
  mode = 'paused';
  input.enabled = false;
  input.release();
  showScreen('pause');
}

function resumeGame() {
  if (mode !== 'paused') return;
  mode = 'playing';
  input.enabled = true;
  input.release();
  accumulator = 0;
  lastFrame = performance.now();
  audio.resume();
  showScreen(null);
}

function quitToTitle() {
  mode = 'title';
  input.enabled = false;
  input.release();
  world = null;
  audio.stopBgm();
  touchUi.classList.add('hidden');
  updateTitle();
  showScreen('title');
}

function showResult() {
  if (resultShown || !world) return;
  resultShown = true;
  mode = 'result';
  input.enabled = false;
  input.release();
  touchUi.classList.add('hidden');
  audio.stopBgm();

  const cleared = world.state === 'clear';
  const bestKey = settings.difficulty;
  const prevBest = settings.best[bestKey] || 0;
  const isRecord = world.score > prevBest;
  if (isRecord) {
    settings.best[bestKey] = world.score;
    saveSettings(settings);
  }
  $('result-kicker').textContent = cleared ? 'STAGE CLEAR' : 'GAME OVER';
  $('result-kicker').classList.toggle('bad', !cleared);
  $('result-title').textContent = DIFFICULTY[bestKey].label;
  $('result-score').textContent = String(world.score);
  const bonus = cleared ? `CLEAR BONUS ${world.clearBonus}` : `到達 ${world.stage ? world.stage.time.toFixed(0) : 0}s`;
  $('result-detail').textContent = `GRAZE ${world.graze}  /  ${bonus}`;
  $('result-best').textContent = `BEST ${settings.best[bestKey]}`;
  $('result-record').classList.toggle('hidden', !isRecord);
  showScreen('result');
}

function updateBombUi() {
  const bombs = world ? world.bombs : 0;
  bombCount.textContent = String(bombs);
  bombBtn.classList.toggle('empty', bombs <= 0);
}

function syncInput() {
  const axis = input.axis();
  world.input.keyX = axis.x;
  world.input.keyY = axis.y;
  world.input.keyFocus = input.keys.has('Shift') || input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  world.input.focus = input.focus;
  world.input.touchX += input.touchX;
  world.input.touchY += input.touchY;
  input.touchX = 0;
  input.touchY = 0;
  if (input.bombQueued) {
    world.input.bomb = true;
    input.bombQueued = false;
  }
}

function drainEvents() {
  const events = world.events;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.type === 'sfx') audio.play(ev.name);
  }
  events.length = 0;
}

function tickGame(dt) {
  syncInput();
  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < 4) {
    world.tick();
    drainEvents();
    accumulator -= STEP;
    steps++;
  }
  if (steps === 4) accumulator = 0;
  updateBombUi();
  world.bestScore = Math.max(settings.best[settings.difficulty] || 0, world.score);
  if (world.state !== 'playing' && !resultShown) {
    endDelay += dt;
    if (endDelay > 1.5) showResult();
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (!Number.isFinite(dt) || dt < 0) dt = 0;
  dt = Math.min(dt, 0.1);

  audio.update();
  if (mode === 'playing' && world) tickGame(dt);

  if (mode === 'title') renderer.draw(null, dt);
  else renderer.draw(world, dt);
}

function bindUi() {
  $('btn-start').addEventListener('click', startGame);
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
  });
  document.querySelectorAll('[data-sound]').forEach((btn) => {
    btn.addEventListener('click', toggleSound);
  });
  $('btn-bomb').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (mode === 'playing') input.bombQueued = true;
  });
  $('btn-pause').addEventListener('click', (e) => {
    e.preventDefault();
    pauseGame();
  });
  $('btn-resume').addEventListener('click', resumeGame);
  $('btn-retry-pause').addEventListener('click', startGame);
  $('btn-title-pause').addEventListener('click', quitToTitle);
  $('btn-retry').addEventListener('click', startGame);
  $('btn-title').addEventListener('click', quitToTitle);

  input.onPause = () => {
    if (mode === 'playing') pauseGame();
    else if (mode === 'paused') resumeGame();
  };
  input.onAnyKey = (key) => {
    if (key !== 'Enter') return;
    if (mode === 'title' || mode === 'result') startGame();
    else if (mode === 'paused') resumeGame();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'playing') pauseGame();
  });
  window.addEventListener('blur', () => {
    if (mode === 'playing') pauseGame();
  });
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 120));
  if (window.ResizeObserver) new ResizeObserver(fit).observe(frame);
  // Stops iOS double-tap zoom and rubber-band scrolling on the playfield.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
}

function boot() {
  input.attach(canvas);
  bindUi();
  fit();
  updateTitle();
  showScreen('title');
  touchUi.classList.add('hidden');
  // Read-only hook used by the headless smoke test.
  window.__dsDebug = {
    get world() { return world; },
    get mode() { return mode; },
    get settings() { return settings; },
  };
  requestAnimationFrame(loop);
}

boot();
