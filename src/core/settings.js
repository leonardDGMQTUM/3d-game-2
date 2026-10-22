// Player preferences and save data, kept in localStorage when available.
const SETTINGS_KEY = 'materia-medica:settings:v1';
const SAVE_KEY = 'materia-medica:save:v1';

const prefersReducedMotion = (() => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();

export const DEFAULTS = {
  sensitivity: 1,
  invertY: false,
  renderDistance: 3,
  shadows: true,
  reducedMotion: prefersReducedMotion,
  volume: 0.6,
  dayLength: 14, // minutes per full day
  minimap: true,
  glow: true,
  resolution: 1,
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the game still works, it just won't remember */
  }
}

export function loadSettings() {
  return { ...DEFAULTS, ...(read(SETTINGS_KEY) || {}) };
}

export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}

export function loadSave() {
  return read(SAVE_KEY);
}

export function writeSave(data) {
  write(SAVE_KEY, data);
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
