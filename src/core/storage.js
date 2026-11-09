const KEY = 'ds_speed_v1';

export const DEFAULT_SETTINGS = {
  difficulty: 'normal',
  muted: false,
  best: { easy: 0, normal: 0, hard: 0 },
};

function defaults() {
  return { difficulty: 'normal', muted: false, best: { easy: 0, normal: 0, hard: 0 } };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return {
      difficulty: ['easy', 'normal', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'normal',
      muted: !!parsed.muted,
      best: {
        easy: Number(parsed.best?.easy) || 0,
        normal: Number(parsed.best?.normal) || 0,
        hard: Number(parsed.best?.hard) || 0,
      },
    };
  } catch {
    return defaults();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode or full storage: scores simply do not persist */
  }
}
