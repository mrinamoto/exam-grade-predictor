export const KEYS = {
  scenarios: 'examGradePredictor.scenarios',
  gradeScale: 'examGradePredictor.gradeScale',
  settings: 'examGradePredictor.settings',
  theme: 'examGradePredictor.theme',
  draft: 'examGradePredictor.draft',
  dataVersion: 'examGradePredictor.dataVersion'
};

export const DATA_VERSION = 1;

export function safeParse(value, fallback) {
  try {
    if (value === null || value === undefined || value === '') return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function readStorage(key, fallback) {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in restricted browser modes.
  }
}
