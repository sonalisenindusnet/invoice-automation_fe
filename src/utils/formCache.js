// Small localStorage-backed cache for in-progress form data, so manual
// testing doesn't require re-typing every field after each page refresh.
// Fails silently if localStorage isn't available (private browsing, etc.)
// so caching is purely a convenience and never breaks the form itself.

export function loadCachedFormData(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedFormData(key, data) {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore — caching is a convenience, not a requirement
  }
}

export function clearCachedFormData(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
