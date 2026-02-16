const PLAY_STATE_KEY = 'grid81.play.state';
const PLAY_STATE_SCHEMA_VERSION = 1;

export function savePlayState(state) {
  try {
    const payload = {
      ...state,
      schemaVersion: PLAY_STATE_SCHEMA_VERSION,
    };
    localStorage.setItem(PLAY_STATE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadPlayState() {
  try {
    const raw = localStorage.getItem(PLAY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== PLAY_STATE_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlayState() {
  try {
    localStorage.removeItem(PLAY_STATE_KEY);
    return true;
  } catch {
    return false;
  }
}

